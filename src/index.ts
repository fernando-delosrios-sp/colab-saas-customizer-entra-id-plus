import {
    Context,
    createConnectorCustomizer,
    readConfig,
    StdAccountListAfterHandler,
    StdAccountListOutput,
    StdAccountReadAfterHandler,
    StdAccountReadOutput,
} from '@sailpoint/connector-sdk'
import { operations, setAccountAttribute } from './operations'
import { getLogger } from './utils'
import { Config } from './model/config'

// Connector customizer must be exported as module property named connectorCustomizer
export const connectorCustomizer = async () => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)
    const stdAccountListAfterHandler: StdAccountListAfterHandler = async (
        context: Context,
        output: StdAccountListOutput
    ) => {
        logger.debug('stdAccountListAfterHandler: ' + JSON.stringify(output ?? {}))
        for (const [attribute, operation] of Object.entries(operations)) {
            logger.debug(`Running operation for attribute ${attribute}`)
            try {
                const value = await operation(output)
                setAccountAttribute(output, attribute, value)
            } catch (error) {
                logger.error(`Error running operation on ${output.uuid} for attribute ${attribute}: ${error}`)
            }
        }

        return output
    }

    const stdAccountReadAfterHandler: StdAccountReadAfterHandler = async (
        context: Context,
        output: StdAccountReadOutput
    ) => {
        logger.debug('stdAccountReadAfterHandler: ' + JSON.stringify(output ?? {}))
        logger.debug(JSON.stringify(context))
        for (const [attribute, operation] of Object.entries(operations)) {
            logger.debug(`Running operation for attribute ${attribute}`)
            try {
                const value = await operation(output)
                setAccountAttribute(output, attribute, value)
            } catch (error) {
                logger.error(`Error running operation on ${output.uuid} for attribute ${attribute}: ${error}`)
            }
        }

        return output
    }

    return createConnectorCustomizer()
        .afterStdAccountList(stdAccountListAfterHandler)
        .afterStdAccountRead(stdAccountReadAfterHandler)
}
