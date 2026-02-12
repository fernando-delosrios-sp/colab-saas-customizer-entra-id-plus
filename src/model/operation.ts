import { AttributeChange, Attributes, Context, ObjectOutput, Permission } from '@sailpoint/connector-sdk'

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

// Shape expected by before operations - includes attributes and changes (for update flows)
export type BeforeOperationInput = {
    attributes?: Attributes
    changes?: Array<AttributeChange>
}

// Before operation: transforms the input/output object in a pipeline fashion
export type BeforeOperation<T = any> = (context: Context, input: T) => Promise<T>

// Map of after operations keyed by attribute path
export type BeforeOperationMap<T extends BeforeOperationInput = BeforeOperationInput> = {
    [key: string]: BeforeOperation<T>
}

// After operation: executed against an object; returns a value to set on an attribute
export type AfterOperation<T = any> = (context: Context, object: T) => Promise<any>

// Map of after operations keyed by attribute path
export type AfterOperationMap<T = any> = {
    [key: string]: AfterOperation<T>
}
