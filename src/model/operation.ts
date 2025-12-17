import { Attributes, ObjectOutput, Permission } from '@sailpoint/connector-sdk'

// Generic account object shape compatible with SDK account outputs
export type AccountObject = ObjectOutput & {
    disabled?: boolean
    locked?: boolean
    attributes?: Attributes
    permissions?: Permission[]
}

// Generic entitlement object shape compatible with SDK entitlement outputs
export type EntitlementObject = ObjectOutput & {
    disabled?: boolean
    locked?: boolean
    type: string
    attributes: Attributes
    permissions?: Permission[]
}

// Operation executed against an account/entitlement; returns a value to set on an attribute
export type Operation<T extends AccountObject | EntitlementObject> = (object: T) => Promise<any>

// Map of operations keyed by attribute path
export type OperationMap<T extends AccountObject | EntitlementObject> = {
    [key: string]: Operation<T>
}
