import { createConnectorCustomizer, logger } from '@sailpoint/connector-sdk'
import { runAccountOperations } from './accountOperations'
import { runEntitlementOperations } from './entitlementOperations'

// Connector customizer must be exported as module property named connectorCustomizer
export const connectorCustomizer = async () => {
    logger.info('Initializing Entra ID Plus connector customizer')

    return createConnectorCustomizer()
        .afterStdAccountList(runAccountOperations)
        .afterStdAccountRead(runAccountOperations)
        .afterStdAccountCreate(runAccountOperations)
        .afterStdAccountUpdate(runAccountOperations)
        .afterStdAccountDisable(runAccountOperations)
        .afterStdAccountEnable(runAccountOperations)
        .afterStdAccountUnlock(runAccountOperations)
        .afterStdChangePassword(runAccountOperations)
        .afterStdEntitlementList(runEntitlementOperations)
        .afterStdEntitlementRead(runEntitlementOperations)
}
