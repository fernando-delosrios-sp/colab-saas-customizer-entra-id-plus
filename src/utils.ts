import { AttributeChange, Context, logger, readConfig } from '@sailpoint/connector-sdk'
import { AfterOperationMap, BeforeOperationMap, BeforeOperationInput } from './model/operation'
import { Config } from './model/config'

export const getLogger = (isDebug: boolean) => {
    logger.level = isDebug ? 'debug' : 'info'
    return logger
}

/** Gets the attribute change and value from input (attributes or changes). */
export const getAttributeChangeAndValue = (
    input: BeforeOperationInput,
    attributeName: string
): { change: AttributeChange | undefined; value: unknown } => {
    const change = input.changes?.find((c) => c.attribute === attributeName)
    const value = input.attributes?.[attributeName] ?? change?.value
    return { change, value }
}

export const setAttribute = (object: any, attribute: string, value: any): boolean => {
    if (!object) return false
    if (attribute.startsWith('attributes.')) {
        const key = attribute.substring(11)
        try {
            if (!object.attributes) object.attributes = {}
            object.attributes[key] = value
            return true
        } catch {
            return false
        }
    }
    try {
        object[attribute] = value
        return true
    } catch {
        return false
    }
}

/** Returns object with attribute set. Use when object is frozen and cannot be mutated. */
export const setAttributeImmutable = (object: any, attribute: string, value: any): any => {
    if (!object) return object
    if (attribute.startsWith('attributes.')) {
        const key = attribute.substring(11)
        const attrs = object.attributes ?? {}
        return { ...object, attributes: { ...attrs, [key]: value } }
    }
    return { ...object, [attribute]: value }
}

export const runBeforeOperations = <T extends BeforeOperationInput>(operations: BeforeOperationMap<T>) => {
    return async (context: Context, input: T): Promise<T> => {
        const config: Config = await readConfig()
        const logger = getLogger(config.spConnDebugLoggingEnabled)
        for (const [attribute, operation] of Object.entries(operations)) {
            const shortName = attribute.startsWith('attributes.') ? attribute.slice('attributes.'.length) : attribute
            const hasAttribute =
                input.attributes?.[attribute] != null ||
                input.attributes?.[shortName] != null ||
                input.changes?.some((c) => c.attribute === attribute || c.attribute === shortName)
            if (hasAttribute) {
                logger.debug(`${context.commandType} - Running before operation for attribute ${attribute}`)
                input = await operation(context, input)
            }
        }
        return input
    }
}

export const runAfterOperations = <T>(operations: AfterOperationMap<T>) => {
    return async (context: Context, output: T): Promise<T> => {
        const config: Config = await readConfig()
        const logger = getLogger(config.spConnDebugLoggingEnabled)
        const isArray = Array.isArray(output)
        const items: any[] = isArray ? output : [output]
        let result: any[] = items
        for (const [attribute, operation] of Object.entries(operations)) {
            for (let i = 0; i < items.length; i++) {
                const item = result[i]
                logger.debug(`${context.commandType} - Running after operation for attribute ${attribute}`)
                const value = await operation(context, item)
                if (!setAttribute(item, attribute, value)) {
                    result = [...result]
                    result[i] = setAttributeImmutable(item, attribute, value)
                }
            }
        }
        return (isArray ? result : result[0]) as T
    }
}
