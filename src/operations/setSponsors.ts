import { AttributeChangeOp, Context, readConfig } from '@sailpoint/connector-sdk'
import { EntraIdClient } from '../entraid-client'
import { AccountObject, AfterOperation } from '../model/operation'
import { Config } from '../model/config'
import { getLogger } from '../utils'
import { getPendingSponsorChange } from './stripSponsors'

/** Unified sponsors AfterOperation: gets sponsors for list/read, sets sponsors for create/update */
export const setSponsors: AfterOperation<AccountObject> = async (
    context: Context,
    output: AccountObject
): Promise<string | string[] | undefined> => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)

    const cmd = context.commandType ?? ''

    if (cmd === 'std:account:list' || cmd === 'std:account:read') {
        return getSponsorsForAccount(config, logger, output)
    }

    if (cmd === 'std:account:create' || cmd === 'std:account:update') {
        const pending = getPendingSponsorChange(context)
        if (!pending) {
            return getSponsorsForAccount(config, logger, output)
        }

        const userId = pending.userId ?? getUserIdFromOutput(output)
        if (!userId) {
            logger.debug('No user identity found in output, skipping sponsor assignment')
            return undefined
        }

        const client = new EntraIdClient(config.domainName, config.clientID, config.clientSecret)

        if (pending.op === AttributeChangeOp.Remove) {
            logger.debug(`Clearing sponsors for user ${userId}`)
            await client.clearSponsorsForUser(userId)
            logger.debug(`Successfully cleared sponsors for user ${userId}`)
            return [] // Explicit empty to signal ISC that sponsors were cleared
        }

        const sponsorUpn: string | undefined = (Array.isArray(pending.value) ? pending.value[0] : pending.value) as
            | string
            | undefined
        if (!sponsorUpn) {
            logger.debug('No sponsor value in pending change, skipping')
            return undefined
        }

        logger.debug(`Setting sponsor ${sponsorUpn} for user ${userId}`)
        await client.setSponsorForUser(userId, sponsorUpn)
        logger.debug(`Successfully set sponsor ${sponsorUpn} for user ${userId}`)
        return sponsorUpn
    }

    return getSponsorsForAccount(config, logger, output)
}

function getUserIdFromOutput(output: AccountObject): string | undefined {
    const attrs = output && 'attributes' in output ? (output as any).attributes : undefined
    return attrs?.objectId ?? (output as any).identity ?? (output as any).key?.simple?.id
}

async function getSponsorsForAccount(
    config: Config,
    logger: ReturnType<typeof getLogger>,
    account: AccountObject
): Promise<string | string[] | undefined> {
    const userId = getUserIdFromOutput(account)
    if (!userId) {
        logger.debug('No user identity found for account, skipping sponsor lookup')
        return undefined
    }

    logger.debug(`Getting sponsors for ${(account as any).attributes?.userPrincipalName ?? userId}`)
    const client = new EntraIdClient(config.domainName, config.clientID, config.clientSecret)
    const sponsors = await client.getSponsorsForGuest(userId)

    if (sponsors.length === 0) {
        return undefined
    }
    if (sponsors.length === 1) {
        return sponsors[0].userPrincipalName
    }
    return sponsors.map((x: any) => x.userPrincipalName)
}
