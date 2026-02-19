/**
 * Operation runners (the core engine)
 *
 * This module contains the engine that powers the customizer framework:
 *
 * 1. `runBeforeOperations` — creates a handler that iterates before-operation maps,
 *    running each registered operation only when the input contains the relevant attribute.
 *
 * 2. `runAfterOperations` — creates a handler that iterates after-operation maps,
 *    running each registered operation against every output object and writing
 *    the returned value back to the mapped attribute.
 *
 * Map key conventions:
 *   - Keys are plain attribute names (e.g. 'sponsors'). The runners auto-prefix
 *     'attributes.' when reading/writing the object. The legacy 'attributes.'
 *     prefix is still accepted.
 *   - A `null` key means "always run" — the operation is invoked unconditionally.
 *
 * These utilities are connector-agnostic. Plug in any OperationMap and they work.
 */
import { Context, readConfig } from '@sailpoint/connector-sdk'
import { AfterOperationMap, BeforeOperationMap, BeforeOperationInput } from './model/operation'
import { Config } from './model/config'
import { getLogger, setAttribute, setAttributeImmutable } from './utils'

/**
 * Creates a before-operation handler from an operation map.
 *
 * For each entry in the map the handler checks whether the input contains the
 * relevant attribute (in `attributes`, `primaryData`, or `changes`). If it does,
 * the operation function is called and its return value replaces the input for
 * subsequent operations (pipeline pattern).
 *
 * A `null` key bypasses the attribute-presence check — the operation always runs.
 *
 * Keys are plain attribute names (e.g. 'sponsors'). The legacy 'attributes.'
 * prefix is still accepted but no longer required.
 */
export const runBeforeOperations = <T extends BeforeOperationInput>(operations: BeforeOperationMap<T>) => {
    return async (context: Context, input: T): Promise<T> => {
        const config: Config = await readConfig()
        const logger = getLogger(config.spConnDebugLoggingEnabled)

        for (const [key, operation] of Object.entries(operations)) {
            // null key → always run (unconditional operation)
            if (key === 'null') {
                logger.debug(`${context.commandType} - Running before operation (always)`)
                input = await operation(context, input)
                continue
            }

            // Derive the short attribute name (strip 'attributes.' prefix if present)
            const attrName = key.startsWith('attributes.') ? key.slice('attributes.'.length) : key

            // Check if the attribute is present in any of the possible input locations
            const hasAttribute =
                input.attributes?.[attrName] != null ||
                input.attributes?.[key] != null ||
                (input as any).primaryData?.[attrName] != null ||
                input.changes?.some((c) => c.attribute === attrName || c.attribute === key)

            if (hasAttribute) {
                logger.debug(`${context.commandType} - Running before operation for attribute ${attrName}`)
                input = await operation(context, input)
            }
        }
        return input
    }
}

/**
 * Creates an after-operation handler from an operation map.
 *
 * For each entry in the map the handler iterates over every output object
 * (supports both single objects and arrays), calls the operation, and writes
 * the returned value to the mapped attribute using `setAttribute`.
 * Falls back to `setAttributeImmutable` when the object is frozen.
 *
 * A `null` key means the operation always runs and its return value replaces
 * the entire object (useful for whole-object transformations).
 *
 * Keys are plain attribute names (e.g. 'sponsors') — the framework prepends
 * 'attributes.' automatically. The legacy 'attributes.' prefix is still
 * accepted but no longer required.
 */
export const runAfterOperations = <T>(operations: AfterOperationMap<T>) => {
    return async (context: Context, output: T): Promise<T> => {
        const config: Config = await readConfig()
        const logger = getLogger(config.spConnDebugLoggingEnabled)

        // Normalise to array so the same logic works for list and single-object commands
        const isArray = Array.isArray(output)
        const items: any[] = isArray ? output : [output]
        let result: any[] = items

        for (const [key, operation] of Object.entries(operations)) {
            // null key → always run; return value replaces the object
            if (key === 'null') {
                for (let i = 0; i < items.length; i++) {
                    logger.debug(`${context.commandType} - Running after operation (always)`)
                    result[i] = await operation(context, result[i])
                }
                continue
            }

            // Derive the full attribute path (prepend 'attributes.' if not already present)
            const attributePath = key.startsWith('attributes.') ? key : `attributes.${key}`

            for (let i = 0; i < items.length; i++) {
                const item = result[i]

                // Skip attribute writes on outputs that don't carry an attributes bag
                // (e.g. update, disable, enable, unlock, changePassword responses).
                if (attributePath.startsWith('attributes.') && !item?.attributes) {
                    logger.debug(
                        `${context.commandType} - Skipping after operation for ${key}: output has no attributes`
                    )
                    continue
                }

                logger.debug(`${context.commandType} - Running after operation for attribute ${key}`)
                const value = await operation(context, item)
                // Try mutable set first; fall back to immutable copy if frozen
                if (!setAttribute(item, attributePath, value)) {
                    result = [...result]
                    result[i] = setAttributeImmutable(item, attributePath, value)
                }
            }
        }

        return (isArray ? result : result[0]) as T
    }
}
