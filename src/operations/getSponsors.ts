import { Context, readConfig } from '@sailpoint/connector-sdk'
import { EntraIdClient } from '../entraid-client'
import { AccountObject, AfterOperation } from '../model/operation'
import { Config } from '../model/config'
import { getLogger } from '../utils'
import { resolveUserIdFromOutput } from './setSponsors'
import { getCachedInput } from './handleSponsorUpdate'

export const getSponsors: AfterOperation<AccountObject> = async (
    context: Context,
    output: AccountObject
): Promise<any> => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)

    const userId = resolveUserIdFromOutput(output)
    if (!userId) {
        logger.debug('getSponsors: no userId found, returning undefined')
        return undefined
    }

    const client = new EntraIdClient(config.domainName, config.clientID, config.clientSecret)

    // Read current sponsors from Graph
    const sponsors = await client.getSponsorsForGuest(userId)
    logger.debug(`getSponsors: fetched ${sponsors.length} sponsor(s) for ${userId}`)

    if (sponsors.length === 0) return undefined

    const cached = getCachedInput(context)
    const setUpn = cached?.setUpn ?? cached?.pendingSponsor?.upn
    let resolvedUpn = sponsors[0].userPrincipalName
    if (setUpn && sponsors.length > 1) {
        const match = sponsors.find(
            (s: any) => s.userPrincipalName?.toLowerCase() === setUpn.toLowerCase()
        )
        if (match) {
            resolvedUpn = match.userPrincipalName
        }
    }

    return {
        attributes: {
            ...output.attributes,
            sponsors: resolvedUpn
        }
    }
}
