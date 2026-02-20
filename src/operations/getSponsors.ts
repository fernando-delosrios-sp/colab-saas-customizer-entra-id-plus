import { readConfig } from '@sailpoint/connector-sdk'
import { EntraIdClient } from '../entraid-client'
import { AfterOperation, AccountAfterOperationInput } from '../model/operation'
import { Config } from '../model/config'
import { getLogger } from '../utils'

export const getSponsors: AfterOperation<AccountAfterOperationInput> = async (context, output) => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)

    const userId = (output as any).identity
    if (!userId) {
        logger.debug('getSponsors: no identity found, returning undefined')
        return undefined
    }

    const client = new EntraIdClient(config.domainName, config.clientID, config.clientSecret)

    // Read current sponsors from Graph
    const sponsors = await client.getSponsorsForGuest(userId)
    logger.debug(`getSponsors: fetched ${sponsors.length} sponsor(s) for ${userId}`)

    if (sponsors.length === 0) return undefined

    return {
        attributes: {
            ...(output as any).attributes,
            sponsors: sponsors[0].userPrincipalName
        }
    }
}
