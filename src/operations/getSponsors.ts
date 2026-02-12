import { Context, readConfig } from '@sailpoint/connector-sdk'
import { EntraIdClient } from '../entraid-client'
import { AccountObject, AfterOperation } from '../model/operation'
import { Config } from '../model/config'
import { getLogger } from '../utils'

export const getSponsors: AfterOperation<AccountObject> = async (context: Context, account: AccountObject) => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)

    // Type guard: check if account has attributes property
    if ('attributes' in account && account.attributes) {
        const objectId = account.attributes.objectId ?? account.identity ?? (account.key && 'simple' in account.key ? account.key.simple.id : undefined)
        const userId = typeof objectId === 'string' ? objectId : undefined
        if (!userId) {
            logger.debug('No user identity found for account, skipping sponsor lookup')
            return undefined
        }
        logger.debug(`Getting sponsors for ${account.attributes.userPrincipalName ?? userId}`)
        logger.debug('Loading client')
        const client = new EntraIdClient(config.domainName, config.clientID, config.clientSecret)
        logger.debug('Getting sponsors')
        const sponsors = await client.getSponsorsForGuest(userId)
        logger.debug('Got sponsors')
        if (sponsors.length === 0) {
            logger.debug('No sponsors found')
            return undefined
        } else if (sponsors.length === 1) {
            logger.debug('Found one sponsor: ' + sponsors[0].userPrincipalName)
            return sponsors[0].userPrincipalName
        } else {
            logger.debug('Found more than one sponsor: ' + sponsors.map((x: any) => x.userPrincipalName).join(', '))
            return sponsors.map((x: any) => x.userPrincipalName)
        }
    } else {
        const uuid = 'uuid' in account ? account.uuid : 'unknown'
        logger.debug('No attributes found for ' + uuid)
        return undefined
    }
}
