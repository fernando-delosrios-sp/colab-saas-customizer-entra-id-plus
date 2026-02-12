import {
    Context,
    StdAccountListInput,
    StdAccountListOutput,
    StdAccountReadInput,
    StdAccountReadOutput,
    StdAccountCreateInput,
    StdAccountCreateOutput,
    StdAccountUpdateInput,
    StdAccountUpdateOutput,
    StdAccountDisableInput,
    StdAccountDisableOutput,
    StdAccountEnableInput,
    StdAccountEnableOutput,
    StdAccountUnlockInput,
    StdAccountUnlockOutput,
    StdChangePasswordInput,
    StdChangePasswordOutput,
} from '@sailpoint/connector-sdk'
import { AccountObject, AfterOperationMap, BeforeOperationMap } from './model/operation'
import { runAfterOperations, runBeforeOperations } from './utils'
import { setSponsors } from './operations/setSponsors'
import { stripSponsors } from './operations/stripSponsors'

// Before operations (executed before the connector processes the command)
export const accountBeforeOperations: BeforeOperationMap<AccountObject> = {
    'attributes.sponsors': stripSponsors,
}

// After operations (executed after the connector processes the command)
export const accountAfterOperations: AfterOperationMap<AccountObject> = {
    'attributes.sponsors': setSponsors,
}

const runAccountBeforeOperationsImpl = runBeforeOperations(accountBeforeOperations)
const runAccountAfterOperationsImpl = runAfterOperations(accountAfterOperations)

// Before operation overloads
export function runAccountBeforeOperations(context: Context, input: StdAccountListInput): Promise<StdAccountListInput>
export function runAccountBeforeOperations(context: Context, input: StdAccountReadInput): Promise<StdAccountReadInput>
export function runAccountBeforeOperations(
    context: Context,
    input: StdAccountCreateInput
): Promise<StdAccountCreateInput>
export function runAccountBeforeOperations(
    context: Context,
    input: StdAccountUpdateInput
): Promise<StdAccountUpdateInput>
export function runAccountBeforeOperations(
    context: Context,
    input: StdAccountDisableInput
): Promise<StdAccountDisableInput>
export function runAccountBeforeOperations(
    context: Context,
    input: StdAccountEnableInput
): Promise<StdAccountEnableInput>
export function runAccountBeforeOperations(
    context: Context,
    input: StdAccountUnlockInput
): Promise<StdAccountUnlockInput>
export function runAccountBeforeOperations(
    context: Context,
    input: StdChangePasswordInput
): Promise<StdChangePasswordInput>

// Before implementation
export function runAccountBeforeOperations(context: Context, input: any): Promise<any> {
    return runAccountBeforeOperationsImpl(context, input)
}

// After operation overloads
export function runAccountAfterOperations(context: Context, output: StdAccountListOutput): Promise<StdAccountListOutput>
export function runAccountAfterOperations(context: Context, output: StdAccountReadOutput): Promise<StdAccountReadOutput>
export function runAccountAfterOperations(
    context: Context,
    output: StdAccountCreateOutput
): Promise<StdAccountCreateOutput>
export function runAccountAfterOperations(
    context: Context,
    output: StdAccountUpdateOutput
): Promise<StdAccountUpdateOutput>
export function runAccountAfterOperations(
    context: Context,
    output: StdAccountDisableOutput
): Promise<StdAccountDisableOutput>
export function runAccountAfterOperations(
    context: Context,
    output: StdAccountEnableOutput
): Promise<StdAccountEnableOutput>
export function runAccountAfterOperations(
    context: Context,
    output: StdAccountUnlockOutput
): Promise<StdAccountUnlockOutput>
export function runAccountAfterOperations(
    context: Context,
    output: StdChangePasswordOutput
): Promise<StdChangePasswordOutput>

// After implementation
export function runAccountAfterOperations(context: Context, output: AccountObject): Promise<AccountObject> {
    return runAccountAfterOperationsImpl(context, output)
}
