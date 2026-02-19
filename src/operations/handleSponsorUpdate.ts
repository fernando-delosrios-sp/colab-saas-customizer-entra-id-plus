/**
 * Before operation — handleSponsorUpdate
 *
 * Intercepts account commands that contain a `sponsors` attribute change and
 * applies it directly via the Microsoft Graph API (since the base Entra ID
 * connector doesn't handle the `sponsors` navigation property natively).
 *
 * For **create** commands the user doesn't exist yet in Entra ID, so Graph
 * writes are deferred: the sponsor change is cached and the companion after
 * operation (setSponsors) applies it once the account has been created.
 *
 * For all other commands (update, enable, disable, etc.) the sponsor change
 * is applied immediately via Graph.
 *
 * Identity data is always cached so the after operation can resolve the userId
 * even when the output object doesn't carry enough information.
 *
 * The `sponsors` attribute is then **stripped from the input** so the base
 * connector never tries to PATCH it (Graph rejects it as a non-schema property).
 */
import { AttributeChangeOp, Context, readConfig } from '@sailpoint/connector-sdk'
import { EntraIdClient } from '../entraid-client'
import { BeforeOperation } from '../model/operation'
import { Config } from '../model/config'
import { getLogger } from '../utils'

// ---------------------------------------------------------------------------
// Per-invocation cache (before → after data passing)
// ---------------------------------------------------------------------------

/** Data cached by the before operation for consumption by the after operation. */
export type CachedInput = {
    userId?: string
    identity?: string
    key?: any
    /** Present only when the before operation could not apply the sponsor change (e.g. create). */
    pendingSponsor?: { op: AttributeChangeOp; upn?: string }
    /** The sponsor UPN that was set in this invocation (so the after op can enforce single-sponsor). */
    setUpn?: string
}

const inputCache = new Map<string, CachedInput>()

/** Derives a cache key from the invocation context (invocationId > requestId > id). */
function cacheKey(context: Context): string | undefined {
    return (context as any).invocationId ?? (context as any).requestId ?? (context as any).id
}

/** Retrieves and consumes the cached input for this invocation (one-time read). */
export function getCachedInput(context: Context): CachedInput | undefined {
    const key = cacheKey(context)
    if (!key) return undefined
    const val = inputCache.get(key)
    inputCache.delete(key) // consume: each entry is read exactly once
    return val
}

// ---------------------------------------------------------------------------
// Before operation implementation
// ---------------------------------------------------------------------------

/** Returns true when the command is a create operation (user doesn't exist yet). */
function isCreateCommand(context: Context): boolean {
    return context.commandType?.includes('create') ?? false
}

/**
 * Before operation that intercepts sponsor attribute changes and applies them
 * via the Microsoft Graph API.
 *
 * The base Entra ID connector does not support the `sponsors` navigation
 * property, so this operation side-steps it by talking to Graph directly
 * and then stripping the attribute from the input before the base connector
 * sees it (Graph would reject it with a 400 otherwise).
 *
 * The flow varies depending on the command type:
 *
 * **Create commands** — The target user does not yet exist in Entra ID, so
 * the Graph write cannot happen now. Instead, the sponsor change is cached
 * (via `inputCache`) and the companion after operation (`setSponsors`) picks
 * it up once the account has been provisioned.
 *
 * **All other commands** (update, enable, disable, unlock, etc.) — The user
 * already exists, so the sponsor is written (or cleared) immediately via
 * Graph. Identity data is still cached so the after operation can resolve the
 * userId even when the output object doesn't carry enough information.
 *
 * In both cases the `sponsors` attribute is removed from the input payload
 * before it reaches the base connector.
 *
 * @param context - SDK invocation context (carries commandType, invocationId, etc.)
 * @param input   - Raw SDK input; may contain `attributes.sponsors` or a
 *                  matching entry in `changes` (for update payloads).
 * @returns The sanitised input with the `sponsors` attribute stripped out.
 */
export const handleSponsorUpdate: BeforeOperation = async (context: Context, input: any): Promise<any> => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)

    logger.debug(`handleSponsorUpdate: commandType=${context.commandType}`)

    // Look for the sponsor value in both attributes and changes (update payloads)
    const change = input.changes?.find((c: any) => c.attribute === 'sponsors' || c.attribute === 'attributes.sponsors')
    const value = input.attributes?.sponsors ?? input.attributes?.['attributes.sponsors'] ?? change?.value

    if (value === undefined && !change) {
        return input
    }

    const op = change?.op ?? AttributeChangeOp.Set
    const sponsorUpn = (Array.isArray(value) ? value[0] : value) as string | undefined
    const userId: string | undefined = input.identity ?? input.key?.simple?.id ?? input.attributes?.objectId

    logger.debug(`handleSponsorUpdate: op=${op}, sponsorUpn=${sponsorUpn}, userId=${userId}`)

    const key = cacheKey(context)

    if (isCreateCommand(context)) {
        // Create: user doesn't exist yet — defer the Graph write to the after operation
        logger.debug('handleSponsorUpdate: create command detected, deferring sponsor write to after operation')
        if (key) {
            inputCache.set(key, {
                userId,
                identity: input.identity,
                key: input.key,
                pendingSponsor: { op, upn: sponsorUpn },
            })
        }
    } else {
        // Update / other: apply the sponsor change via Graph immediately
        if (key && userId) {
            inputCache.set(key, {
                userId,
                identity: input.identity,
                key: input.key,
                setUpn: op !== AttributeChangeOp.Remove ? sponsorUpn : undefined,
            })
        }

        if (userId) {
            const client = new EntraIdClient(config.domainName, config.clientID, config.clientSecret)
            if (op === AttributeChangeOp.Remove) {
                await client.clearSponsorsForUser(userId)
                logger.debug(`handleSponsorUpdate: cleared sponsors for ${userId}`)
            } else if (sponsorUpn) {
                await client.setSponsorForUser(userId, sponsorUpn)
                logger.debug(`handleSponsorUpdate: set sponsor ${sponsorUpn} for ${userId}`)
            }
        }
    }

    // Strip sponsors from the input so the base connector doesn't try to PATCH
    // it — Graph rejects 'sponsors' as a non-schema property on the user resource.
    return stripSponsorsFromInput(input, logger)
}

// ---------------------------------------------------------------------------
// Input sanitisation
// ---------------------------------------------------------------------------

/**
 * Removes `sponsors` / `attributes.sponsors` from the input payload so the
 * base connector never sends it to Graph (which would cause a 400 error).
 */
function stripSponsorsFromInput(input: any, logger: any): any {
    let result = input

    // Strip from attributes (create payloads)
    if (result.attributes?.sponsors != null || result.attributes?.['attributes.sponsors'] != null) {
        const { sponsors, 'attributes.sponsors': _attrSponsors, ...rest } = result.attributes
        result = { ...result, attributes: rest }
        logger.debug('handleSponsorUpdate: stripped sponsors from input.attributes')
    }

    // Strip from changes array (update payloads)
    if (result.changes?.length) {
        const filtered = result.changes.filter(
            (c: any) => c.attribute !== 'sponsors' && c.attribute !== 'attributes.sponsors'
        )
        if (filtered.length !== result.changes.length) {
            result = { ...result, changes: filtered }
            logger.debug('handleSponsorUpdate: stripped sponsors from input.changes')
        }
    }

    return result
}
