/**
 * Entitlement Operations
 *
 * Register your custom before/after operations for entitlement attributes here.
 * Each entry maps an attribute name (e.g. 'application') to a handler function.
 * Use a `null` key for operations that should run unconditionally.
 *
 * - Before operations run before the connector processes the command.
 * - After operations run after the connector returns its output and enrich each entitlement.
 *
 * To add a custom attribute:
 *   1. Write your operation function in src/operations/
 *   2. Add the attribute name → function entry to the map below
 *   3. The framework handles the rest (iteration, attribute assignment, logging)
 */
import { Context } from '@sailpoint/connector-sdk'
import { EntitlementObject, AfterOperationMap, BeforeOperationMap, BeforeOperationInput } from './model/operation'
import { runAfterOperations, runBeforeOperations } from './operationRunner'
import { getApplication } from './operations/getApplication'

// ---------------------------------------------------------------------------
// Operation maps — add your custom entitlement operations here
// ---------------------------------------------------------------------------

/** Before operations: keyed by attribute name (or `null` for always-run). Currently empty. */
export const entitlementBeforeOperations: BeforeOperationMap<BeforeOperationInput> = {}

/** After operations: keyed by attribute name (or `null` for always-run). */
export const entitlementAfterOperations: AfterOperationMap<EntitlementObject> = {
    application: getApplication,
}

// ---------------------------------------------------------------------------
// Handlers passed to the customizer in index.ts
// ---------------------------------------------------------------------------

/** Runs all registered before-operations for entitlements. */
export const runEntitlementBeforeOperations = runBeforeOperations(entitlementBeforeOperations) as (
    context: Context,
    input: any
) => Promise<any>

/** Runs all registered after-operations for entitlements. */
export const runEntitlementAfterOperations = runAfterOperations(entitlementAfterOperations) as (
    context: Context,
    output: any
) => Promise<any>
