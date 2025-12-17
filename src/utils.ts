import { logger } from '@sailpoint/connector-sdk'

export const getLogger = (isDebug: boolean) => {
    logger.level = isDebug ? 'debug' : 'info'
    return logger
}
