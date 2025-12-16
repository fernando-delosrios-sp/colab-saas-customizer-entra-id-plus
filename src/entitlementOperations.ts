import { Context, readConfig, StdEntitlementListOutput, StdEntitlementReadOutput } from '@sailpoint/connector-sdk'
import { EntitlementObject, Operation, OperationMap } from './model/operation'
import { getLogger, runOperations } from './utils'
import { Config } from './model/config'

const APPLICATION_ENTITLEMENT_TYPES = ['applicationRole']

export const getApplication: Operation<EntitlementObject> = async (entitlement: EntitlementObject) => {
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

// Placeholder for future entitlement-specific operations
export const entitlementOperations: OperationMap<EntitlementObject> = {
    'attributes.application': getApplication,
}

const runEntitlementOperationsImpl = runOperations(entitlementOperations)

// Overloads to match SDK after-handler signatures
export function runEntitlementOperations(
    context: Context,
    output: StdEntitlementListOutput
): Promise<StdEntitlementListOutput>
export function runEntitlementOperations(
    context: Context,
    output: StdEntitlementReadOutput
): Promise<StdEntitlementReadOutput>

// Implementation
export function runEntitlementOperations(context: Context, output: EntitlementObject): Promise<EntitlementObject> {
    return runEntitlementOperationsImpl(context, output)
}
