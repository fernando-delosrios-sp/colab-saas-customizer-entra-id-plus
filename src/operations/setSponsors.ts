/**
 * After operation — setSponsors
 *
 * Enriches each account output with its sponsor(s) from Microsoft Graph.
 * Runs after every standard account command (list, read, create, update, etc.).
 *
 * For **create** commands, the companion before operation (handleSponsorUpdate)
 * defers the Graph write because the user didn't exist yet. This after operation
 * detects the pending sponsor change in the cache and applies it first, then
 * reads the sponsors back.
 *
 * Returns:
 *  - undefined          when no sponsors exist
 *  - a single UPN string when exactly one sponsor
 *  - an array of UPNs   when multiple sponsors
 *
 * The framework writes this value to `attributes.sponsors` on the account.
 */
import { AttributeChangeOp, Context, readConfig } from '@sailpoint/connector-sdk'
import { EntraIdClient } from '../entraid-client'
import { AccountObject, AfterOperation } from '../model/operation'
import { Config } from '../model/config'
import { getLogger } from '../utils'
import { getCachedInput } from './handleSponsorUpdate'

export const setSponsors: AfterOperation<AccountObject> = async (
    context: Context,
    output: AccountObject
): Promise<string | string[] | undefined> => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)

    logger.debug(`setSponsors: original output = ${JSON.stringify(output)}`)

    // Resolve userId from the output object or fall back to the cached before-operation input
    let userId = resolveUserIdFromOutput(output)
    const cached = getCachedInput(context)

    if (!userId && cached?.userId) {
        userId = cached.userId
    }

    logger.debug(`setSponsors: userId=${userId}`)

    if (!userId) {
        logger.debug('setSponsors: no userId found, returning undefined')
        return undefined
    }

    const client = new EntraIdClient(config.domainName, config.clientID, config.clientSecret)

    // If the before operation deferred a sponsor write (create flow), apply it now
    if (cached?.pendingSponsor) {
        const { op, upn } = cached.pendingSponsor
        logger.debug(`setSponsors: applying deferred sponsor change (op=${op}, upn=${upn}) for ${userId}`)
        if (op === AttributeChangeOp.Remove) {
            await client.clearSponsorsForUser(userId)
        } else if (upn) {
            await client.setSponsorForUser(userId, upn)
        }
    }

    // Read current sponsors from Graph
    const sponsors = await client.getSponsorsForGuest(userId)
    logger.debug(`setSponsors: fetched ${sponsors.length} sponsor(s) for ${userId}`)

    if (sponsors.length === 0) return undefined

    // If a sponsor was just set and there are extras, keep only the intended one
    const setUpn = cached?.setUpn ?? cached?.pendingSponsor?.upn
    if (setUpn && sponsors.length > 1) {
        const match = sponsors.find(
            (s: any) => s.userPrincipalName?.toLowerCase() === setUpn.toLowerCase()
        )
        // Best-effort cleanup of extra sponsors (fire-and-forget)
        for (const s of sponsors) {
            if (match && s.id !== match.id) {
                client.removeSponsorForUser(userId, s.id).catch((e: any) => {
                    logger.warn(`setSponsors: failed to remove extra sponsor ${s.id}: ${e}`)
                })
            }
        }
        if (match) {
            logger.debug(`setSponsors: enforced single sponsor ${match.userPrincipalName}`)
            return match.userPrincipalName
        }
    }

    if (sponsors.length === 1) return sponsors[0].userPrincipalName
    return sponsors.map((x: any) => x.userPrincipalName)
}

/**
 * Tries several common locations on the output object to find a usable user ID.
 * Different SDK commands place the identity in different spots.
 */
function resolveUserIdFromOutput(output: AccountObject): string | undefined {
    if (!output || typeof output !== 'object') return undefined
    const o = output as any
    return (
        o.attributes?.objectId ??
        o.attributes?.id ??
        o.identity ??
        o.key?.simple?.id ??
        o.id ??
        o.uuid ??
        undefined
    )
}
