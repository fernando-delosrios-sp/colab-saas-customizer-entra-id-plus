import { createConnectorCustomizer, logger } from '@sailpoint/connector-sdk'
import { runAccountBeforeOperations, runAccountAfterOperations } from './accountOperations'
import { runEntitlementBeforeOperations, runEntitlementAfterOperations } from './entitlementOperations'

// Connector customizer must be exported as module property named connectorCustomizer
export const connectorCustomizer = async () => {
    logger.info('Initializing Entra ID Plus connector customizer')

    return createConnectorCustomizer()
        .beforeStdAccountList(runAccountBeforeOperations)
        .beforeStdAccountRead(runAccountBeforeOperations)
        .beforeStdAccountCreate(runAccountBeforeOperations)
        .beforeStdAccountUpdate(runAccountBeforeOperations)
        .beforeStdAccountDisable(runAccountBeforeOperations)
        .beforeStdAccountEnable(runAccountBeforeOperations)
        .beforeStdAccountUnlock(runAccountBeforeOperations)
        .beforeStdChangePassword(runAccountBeforeOperations)
        .beforeStdEntitlementList(runEntitlementBeforeOperations)
        .beforeStdEntitlementRead(runEntitlementBeforeOperations)
        .afterStdAccountList(runAccountAfterOperations)
        .afterStdAccountRead(runAccountAfterOperations)
        .afterStdAccountCreate(runAccountAfterOperations)
        .afterStdAccountUpdate(runAccountAfterOperations)
        .afterStdAccountDisable(runAccountAfterOperations)
        .afterStdAccountEnable(runAccountAfterOperations)
        .afterStdAccountUnlock(runAccountAfterOperations)
        .afterStdChangePassword(runAccountAfterOperations)
        .afterStdEntitlementList(runEntitlementAfterOperations)
        .afterStdEntitlementRead(runEntitlementAfterOperations)
}
