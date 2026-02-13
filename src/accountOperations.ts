/**
 * Account Operations
 *
 * Register your custom before/after operations for account attributes here.
 * Each entry maps an attribute name (e.g. 'sponsors') to a handler function.
 * Use a `null` key for operations that should run unconditionally.
 *
 * - Before operations run before the connector processes the command.
 *   They receive the raw SDK input and can transform it or perform side-effects (e.g. writing
 *   to a target API) before the base connector acts.
 *
 * - After operations run after the connector returns its output.
 *   They receive each output object and return a value that gets written to the mapped attribute.
 *
 * To add a custom attribute:
 *   1. Write your operation function in src/operations/
 *   2. Add the attribute name → function entry to the map below
 *   3. The framework handles the rest (iteration, attribute assignment, logging)
 */
import { Context } from '@sailpoint/connector-sdk'
import { AccountObject, AfterOperationMap, BeforeOperationMap } from './model/operation'
import { runAfterOperations, runBeforeOperations } from './operationRunner'
import { setSponsors } from './operations/setSponsors'
import { handleSponsorUpdate } from './operations/handleSponsorUpdate'

// ---------------------------------------------------------------------------
// Operation maps — add your custom account operations here
// ---------------------------------------------------------------------------

/** Before operations: keyed by attribute name (or `null` for always-run). */
export const accountBeforeOperations: BeforeOperationMap<AccountObject> = {
    sponsors: handleSponsorUpdate,
}

/** After operations: keyed by attribute name (or `null` for always-run). */
export const accountAfterOperations: AfterOperationMap<AccountObject> = {
    sponsors: setSponsors,
}

// ---------------------------------------------------------------------------
// Handlers passed to the customizer in index.ts
// Cast to a broad signature so a single handler is accepted by all SDK
// before/after method overloads (StdAccountList, StdAccountRead, etc.).
// ---------------------------------------------------------------------------

/** Runs all registered before-operations for accounts. */
export const runAccountBeforeOperations = runBeforeOperations(accountBeforeOperations) as (
    context: Context,
    input: any
) => Promise<any>

/** Runs all registered after-operations for accounts. */
export const runAccountAfterOperations = runAfterOperations(accountAfterOperations) as (
    context: Context,
    output: any
) => Promise<any>
