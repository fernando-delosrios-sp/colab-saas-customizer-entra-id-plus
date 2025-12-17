import { Attributes, ObjectOutput, Permission } from '@sailpoint/connector-sdk'

export type AccountObject = ObjectOutput & {
    disabled?: boolean
    locked?: boolean
    attributes?: Attributes
    permissions?: Permission[]
}

export type AccountOperation = (account: AccountObject) => Promise<any>

export type OperationMap = {
    [key: string]: AccountOperation
}
