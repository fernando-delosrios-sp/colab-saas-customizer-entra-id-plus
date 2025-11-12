import {
    Context,
    createConnectorCustomizer,
    readConfig
} from '@sailpoint/connector-sdk'
import { operations, setAccountAttribute } from './operations'
import { getLogger } from './utils'
import { Config } from './model/config'
import { AccountObject } from './model/operation'

// Connector customizer must be exported as module property named connectorCustomizer
export const connectorCustomizer = async () => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)

    const runOperations = async <T extends AccountObject>(context: Context, output: T): Promise<T> => {
        for (const [attribute, operation] of Object.entries(operations)) {
            logger.debug(`${context.commandType} - Running operation for attribute ${attribute}`)
            const value = await operation(output)
            setAccountAttribute(output, attribute, value)
        }
        return output
    }

    return createConnectorCustomizer()
        .afterStdAccountList(runOperations)
        .afterStdAccountRead(runOperations)
        .afterStdAccountCreate(runOperations)
        .afterStdAccountUpdate(runOperations)
        .afterStdAccountDisable(runOperations)
        .afterStdAccountEnable(runOperations)
        .afterStdAccountUnlock(runOperations)
        .afterStdChangePassword(runOperations)
}
