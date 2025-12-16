import { Context, logger, readConfig } from '@sailpoint/connector-sdk'
import { AccountObject, EntitlementObject, OperationMap } from './model/operation'
import { Config } from './model/config'

export const getLogger = (isDebug: boolean) => {
    logger.level = isDebug ? 'debug' : 'info'
    return logger
}

export const setAttribute = (object: AccountObject | EntitlementObject, attribute: string, value: any) => {
    if (attribute.startsWith('attributes.') && object?.attributes) {
        object.attributes[attribute.substring(11)] = value
    } else {
        ;(object as any)[attribute] = value
    }
}

export const runOperations = <T extends AccountObject | EntitlementObject>(operations: OperationMap<T>) => {
    return async (context: Context, output: T): Promise<T> => {
        const config: Config = await readConfig()
        const logger = getLogger(config.spConnDebugLoggingEnabled)
        logger.debug('Running operations on output:')
        logger.debug(output)
        for (const [attribute, operation] of Object.entries(operations)) {
            logger.debug(`${context.commandType} - Running operation for attribute ${attribute}`)
            const value = await operation(output)
            setAttribute(output, attribute, value)
        }
        return output
    }
}
