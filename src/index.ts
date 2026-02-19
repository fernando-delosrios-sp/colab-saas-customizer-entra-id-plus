/**
 * Connector Customizer entry point
 *
 * This file wires the operation runners to every standard SDK command.
 * The pattern is intentionally exhaustive: every account and entitlement
 * command gets both a before and after handler. If no operations are
 * registered for a given map the handler is a no-op (returns input/output unchanged).
 *
 * To support a new connector:
 *   - Replace / extend accountOperations and entitlementOperations
 *   - Swap the API client (EntraIdClient) for your target system
 *   - No changes needed in this file or in the framework utilities
 */
import { createConnectorCustomizer, logger } from '@sailpoint/connector-sdk'
import { runAccountBeforeOperations, runAccountAfterOperations } from './accountOperations'
import { runEntitlementBeforeOperations, runEntitlementAfterOperations } from './entitlementOperations'

export const connectorCustomizer = async () => {
    logger.info('Initializing connector customizer')

    return createConnectorCustomizer()
        // Account before-handlers
        .beforeStdAccountList(runAccountBeforeOperations)
        .beforeStdAccountRead(runAccountBeforeOperations)
        .beforeStdAccountCreate(runAccountBeforeOperations)
        .beforeStdAccountUpdate(runAccountBeforeOperations)
        .beforeStdAccountDisable(runAccountBeforeOperations)
        .beforeStdAccountEnable(runAccountBeforeOperations)
        .beforeStdAccountUnlock(runAccountBeforeOperations)
        .beforeStdChangePassword(runAccountBeforeOperations)
        // Entitlement before-handlers
        .beforeStdEntitlementList(runEntitlementBeforeOperations)
        .beforeStdEntitlementRead(runEntitlementBeforeOperations)
        // Account after-handlers
        .afterStdAccountList(runAccountAfterOperations)
        .afterStdAccountRead(runAccountAfterOperations)
        .afterStdAccountCreate(runAccountAfterOperations)
        .afterStdAccountUpdate(runAccountAfterOperations)
        // Entitlement after-handlers
        .afterStdEntitlementList(runEntitlementAfterOperations)
        .afterStdEntitlementRead(runEntitlementAfterOperations)
}
