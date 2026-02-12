import { Context, readConfig } from '@sailpoint/connector-sdk'
import { EntitlementObject, AfterOperation } from '../model/operation'
import { Config } from '../model/config'
import { getLogger } from '../utils'

const APPLICATION_ENTITLEMENT_TYPES = ['applicationRole']

export const getApplication: AfterOperation<EntitlementObject> = async (
    context: Context,
    entitlement: EntitlementObject
) => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)

    if (APPLICATION_ENTITLEMENT_TYPES.includes(entitlement.type) && entitlement.attributes.displayName) {
        logger.debug(`Processing application entitlement type: ${entitlement.type}`)
        const [name, application] = entitlement.attributes.displayName.toString().split(' [on] ')
        logger.debug(
            `Parsed displayName: "${entitlement.attributes.displayName}". Extracted application: "${application}"`
        )

        return application
    }
}
