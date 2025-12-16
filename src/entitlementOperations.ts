import { Context, StdEntitlementListOutput, StdEntitlementReadOutput } from '@sailpoint/connector-sdk'
import { EntitlementObject, Operation, OperationMap } from './model/operation'
import { runOperations } from './utils'

const APPLICATION_ENTITLEMENT_TYPES = ['applicationRole']

export const getApplication: Operation<EntitlementObject> = async (entitlement: EntitlementObject) => {
    if (APPLICATION_ENTITLEMENT_TYPES.includes(entitlement.type)) {
        const [name, application] = entitlement.uuid!.split(' [on] ')
        entitlement.attributes.application = application
    }

    return entitlement
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
