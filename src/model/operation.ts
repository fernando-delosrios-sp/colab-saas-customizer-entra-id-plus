/**
 * Operation type definitions
 *
 * These types form the core abstraction of the customizer framework.
 * They are connector-agnostic — you can reuse them for any SaaS connector,
 * not just Entra ID.
 *
 * Key concepts:
 * - An **Operation** is a function that handles a single custom attribute.
 * - An **OperationMap** maps attribute names to their operation functions.
 * - The framework iterates the map, runs each operation, and writes the
 *   returned value to the corresponding attribute on the object.
 *
 * Map key conventions:
 * - Use the attribute name directly (e.g. 'sponsors'), **not** the full
 *   path ('attributes.sponsors'). The framework auto-prefixes 'attributes.'
 *   when reading/writing the object.
 * - Use a `null` key to register an operation that runs unconditionally,
 *   regardless of which attributes are present in the input/output.
 *   For before operations the pipeline semantics are preserved (input in → input out).
 *   For after operations the return value replaces the entire object.
 */
import { AttributeChange, Attributes, Context, ObjectOutput, Permission } from '@sailpoint/connector-sdk'

// ---------------------------------------------------------------------------
// Object shapes
// ---------------------------------------------------------------------------

/** Generic account object shape compatible with all SDK account outputs. */
export type AccountObject = ObjectOutput & {
    disabled?: boolean
    locked?: boolean
    attributes?: Attributes
    permissions?: Permission[]
}

/** Generic entitlement object shape compatible with all SDK entitlement outputs. */
export type EntitlementObject = ObjectOutput & {
    disabled?: boolean
    locked?: boolean
    type: string
    attributes: Attributes
    permissions?: Permission[]
}

// ---------------------------------------------------------------------------
// Before-operation types
// ---------------------------------------------------------------------------

/**
 * Shape expected by before operations.
 * Includes `attributes` (for create/list) and `changes` (for update flows).
 */
export type BeforeOperationInput = {
    attributes?: Attributes
    changes?: Array<AttributeChange>
}

/**
 * A before operation transforms the SDK input in a pipeline fashion.
 * It receives the full input object and must return the (possibly modified) input.
 */
export type BeforeOperation<T = any> = (context: Context, input: T) => Promise<any>

/**
 * Map of before operations keyed by attribute name.
 * Use the plain attribute name (e.g. 'sponsors') — the framework resolves
 * the full path automatically. A `null` key means "always run".
 */
export type BeforeOperationMap<T extends BeforeOperationInput = BeforeOperationInput> = {
    [attributeName: string]: BeforeOperation<T>
}

// ---------------------------------------------------------------------------
// After-operation types
// ---------------------------------------------------------------------------

/**
 * An after operation computes a value for a single attribute.
 * It receives the output object and returns the value to assign.
 */
export type AfterOperation<T = any> = (context: Context, object: T) => Promise<any>

/**
 * Map of after operations keyed by attribute name.
 * Use the plain attribute name (e.g. 'sponsors') — the framework resolves
 * the full path automatically. A `null` key means "always run" and the
 * return value replaces the entire object.
 */
export type AfterOperationMap<T = any> = {
    [attributeName: string]: AfterOperation<T>
}

// ---------------------------------------------------------------------------
// Unified operation types
// ---------------------------------------------------------------------------

/**
 * A combined operation map where keys follow the pattern `<hookPattern>.<attributePattern>`.
 * For example:
 * - `*.*` - Runs on all hooks for all attributes.
 * - `*.sponsors` - Runs on all hooks for the 'sponsors' attribute.
 * - `beforeStdAccountList.*` - Runs on the beforeStdAccountList hook for all attributes.
 * - `afterStdAccountRead.sponsors` - Runs on the afterStdAccountRead hook for the 'sponsors' attribute.
 */
export type CustomOperationMap = {
    [pattern: string]: BeforeOperation | AfterOperation | Array<BeforeOperation | AfterOperation>
}
