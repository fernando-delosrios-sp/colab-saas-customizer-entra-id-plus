import { AttributeChangeOp, Context, readConfig } from '@sailpoint/connector-sdk'
import { BeforeOperation } from '../model/operation'
import { Config } from '../model/config'
import { getLogger } from '../utils'

export type PendingSponsorChange = {
    op: AttributeChangeOp
    value: string | string[] | undefined
    userId: string | undefined
}

/** Module-level cache for sponsor changes (Context is not extensible). Keyed by invocationId. */
const pendingSponsorChangeCache = new Map<string, PendingSponsorChange>()

function getContextKey(context: Context): string | undefined {
    return (context as any).invocationId ?? (context as any).requestId ?? (context as any).id
}

export function getPendingSponsorChange(context: Context): PendingSponsorChange | undefined {
    const key = getContextKey(context)
    if (!key) return undefined
    const pending = pendingSponsorChangeCache.get(key)
    pendingSponsorChangeCache.delete(key)
    return pending
}

export function setPendingSponsorChange(context: Context, change: PendingSponsorChange): void {
    const key = getContextKey(context)
    if (key) pendingSponsorChangeCache.set(key, change)
}

/** Extracts sponsor request from input, stores in cache, removes from input so connector doesn't process it */
export const stripSponsors: BeforeOperation = async (context: Context, input: any): Promise<any> => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)

    const changeSponsors = input.changes?.find((c: any) => c.attribute === 'sponsors' || c.attribute === 'attributes.sponsors')
    const valueSponsors = input.attributes?.sponsors ?? input.attributes?.['attributes.sponsors'] ?? changeSponsors?.value
    const hasSponsorRequest = valueSponsors !== undefined || changeSponsors !== undefined

    if (!hasSponsorRequest) {
        return input
    }

    const op = changeSponsors?.op ?? AttributeChangeOp.Add
    const sponsorUpn: string | undefined = (Array.isArray(valueSponsors) ? valueSponsors[0] : valueSponsors) as string | undefined
    const userId: string | undefined = input.attributes?.objectId ?? input.identity ?? input.key?.simple?.id

    setPendingSponsorChange(context, { op, value: sponsorUpn ?? valueSponsors, userId })
    logger.debug(`Cached sponsor change for after operation: op=${op}, userId=${userId}`)

    try {
        if (input.attributes?.sponsors !== undefined) {
            delete input.attributes.sponsors
        }
        if (input.attributes?.['attributes.sponsors'] !== undefined) {
            delete input.attributes['attributes.sponsors']
        }
        if (input.changes) {
            input.changes = input.changes.filter((c: any) => c.attribute !== 'sponsors' && c.attribute !== 'attributes.sponsors')
        }
    } catch {
        // Input may be frozen; pending change is still cached for after operation
    }

    return input
}
