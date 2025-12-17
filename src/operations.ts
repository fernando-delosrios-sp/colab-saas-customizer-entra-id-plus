import { readConfig } from '@sailpoint/connector-sdk'
import { EntraIdClient } from './entraid-client'
import { AccountObject, AccountOperation, OperationMap } from './model/operation'
import { Config } from './model/config'
import { getLogger } from './utils'

export const setAccountAttribute = (account: AccountObject, attribute: string, value: any) => {
    if (attribute.startsWith('attributes.') && account.attributes) {
        account.attributes[attribute.substring(11)] = value
    } else {
        ;(account as any)[attribute] = value
    }
}

export const getSponsors: AccountOperation = async (account) => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)
    if (account.attributes) {
        logger.debug(`Getting sponsors for ${account.attributes.userPrincipalName}`)
        logger.debug('Loading client')
        const client = new EntraIdClient(config.domainName, config.clientID, config.clientSecret)
        logger.debug('Getting sponsors')
        const sponsors = await client.getSponsorsForGuest(account.attributes.objectId as string)
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
        logger.debug('No attributes found for ' + account.uuid)
        return undefined
    }
}

export const operations: OperationMap = {
    'attributes.sponsors': getSponsors,
}
