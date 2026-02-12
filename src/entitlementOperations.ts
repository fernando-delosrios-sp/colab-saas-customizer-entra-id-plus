import {
    Context,
    StdEntitlementListInput,
    StdEntitlementListOutput,
    StdEntitlementReadInput,
    StdEntitlementReadOutput,
} from '@sailpoint/connector-sdk'
import { EntitlementObject, AfterOperationMap, BeforeOperationMap, BeforeOperationInput } from './model/operation'
import { runAfterOperations, runBeforeOperations } from './utils'
import { getApplication } from './operations/getApplication'

// Before operations (executed before the connector processes the command)
export const entitlementBeforeOperations: BeforeOperationMap<BeforeOperationInput> = {}

// After operations (executed after the connector processes the command)
export const entitlementAfterOperations: AfterOperationMap<EntitlementObject> = {
    'attributes.application': getApplication,
}

const runEntitlementBeforeOperationsImpl = runBeforeOperations(entitlementBeforeOperations)
const runEntitlementAfterOperationsImpl = runAfterOperations(entitlementAfterOperations)

// Before operation overloads
export function runEntitlementBeforeOperations(
    context: Context,
    input: StdEntitlementListInput
): Promise<StdEntitlementListInput>
export function runEntitlementBeforeOperations(
    context: Context,
    input: StdEntitlementReadInput
): Promise<StdEntitlementReadInput>

// Before implementation
export function runEntitlementBeforeOperations(context: Context, input: any): Promise<any> {
    return runEntitlementBeforeOperationsImpl(context, input)
}

// After operation overloads
export function runEntitlementAfterOperations(
    context: Context,
    output: StdEntitlementListOutput
): Promise<StdEntitlementListOutput>
export function runEntitlementAfterOperations(
    context: Context,
    output: StdEntitlementReadOutput
): Promise<StdEntitlementReadOutput>

// After implementation
export function runEntitlementAfterOperations(context: Context, output: EntitlementObject): Promise<EntitlementObject> {
    return runEntitlementAfterOperationsImpl(context, output)
}
