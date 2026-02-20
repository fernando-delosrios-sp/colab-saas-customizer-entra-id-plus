/**
 * Connector Customizer entry point
 *
 * This file wires the operation runners to every standard SDK command.
 * The pattern is intentionally exhaustive: every account and entitlement
 * command gets both a before and after handler. If no operations are
 * registered for a given map the handler is a no-op (returns input/output unchanged).
 *
 * To support a new connector:
 *   - Only update `customOperations.ts`
 *   - Swap the API client (EntraIdClient) for your target system
 *   - No changes needed in this file or in the framework utilities
 */
import { createConnectorCustomizer, logger } from '@sailpoint/connector-sdk'
import { runBeforeOperations, runAfterOperations } from './operationRunner'
import { customOperations } from './customOperations'

export const connectorCustomizer = async () => {
    logger.info('Initializing connector customizer')

    return createConnectorCustomizer()
        // Test Connection
        .beforeStdTestConnection(runBeforeOperations('beforeStdTestConnection', customOperations) as any)
        .afterStdTestConnection(runAfterOperations('afterStdTestConnection', customOperations) as any)
        // Account
        .beforeStdAccountCreate(runBeforeOperations('beforeStdAccountCreate', customOperations) as any)
        .afterStdAccountCreate(runAfterOperations('afterStdAccountCreate', customOperations) as any)
        .beforeStdAccountRead(runBeforeOperations('beforeStdAccountRead', customOperations) as any)
        .afterStdAccountRead(runAfterOperations('afterStdAccountRead', customOperations) as any)
        .beforeStdAccountUpdate(runBeforeOperations('beforeStdAccountUpdate', customOperations) as any)
        .afterStdAccountUpdate(runAfterOperations('afterStdAccountUpdate', customOperations) as any)
        .beforeStdAccountDelete(runBeforeOperations('beforeStdAccountDelete', customOperations) as any)
        .afterStdAccountDelete(runAfterOperations('afterStdAccountDelete', customOperations) as any)
        .beforeStdAccountEnable(runBeforeOperations('beforeStdAccountEnable', customOperations) as any)
        .afterStdAccountEnable(runAfterOperations('afterStdAccountEnable', customOperations) as any)
        .beforeStdAccountDisable(runBeforeOperations('beforeStdAccountDisable', customOperations) as any)
        .afterStdAccountDisable(runAfterOperations('afterStdAccountDisable', customOperations) as any)
        .beforeStdAccountUnlock(runBeforeOperations('beforeStdAccountUnlock', customOperations) as any)
        .afterStdAccountUnlock(runAfterOperations('afterStdAccountUnlock', customOperations) as any)
        .beforeStdAccountList(runBeforeOperations('beforeStdAccountList', customOperations) as any)
        .afterStdAccountList(runAfterOperations('afterStdAccountList', customOperations) as any)
        // Authenticate
        .beforeStdAuthenticate(runBeforeOperations('beforeStdAuthenticate', customOperations) as any)
        .afterStdAuthenticate(runAfterOperations('afterStdAuthenticate', customOperations) as any)
        // Config Options
        .beforeStdConfigOptions(runBeforeOperations('beforeStdConfigOptions', customOperations) as any)
        .afterStdConfigOptions(runAfterOperations('afterStdConfigOptions', customOperations) as any)
        // Application Discovery List
        .beforeStdApplicationDiscoveryList(runBeforeOperations('beforeStdApplicationDiscoveryList', customOperations) as any)
        .afterStdApplicationDiscoveryList(runAfterOperations('afterStdApplicationDiscoveryList', customOperations) as any)
        // Entitlement
        .beforeStdEntitlementRead(runBeforeOperations('beforeStdEntitlementRead', customOperations) as any)
        .afterStdEntitlementRead(runAfterOperations('afterStdEntitlementRead', customOperations) as any)
        .beforeStdEntitlementList(runBeforeOperations('beforeStdEntitlementList', customOperations) as any)
        .afterStdEntitlementList(runAfterOperations('afterStdEntitlementList', customOperations) as any)
        // Change Password
        .beforeStdChangePassword(runBeforeOperations('beforeStdChangePassword', customOperations) as any)
        .afterStdChangePassword(runAfterOperations('afterStdChangePassword', customOperations) as any)
        // Source Data
        .beforeStdSourceDataDiscover(runBeforeOperations('beforeStdSourceDataDiscover', customOperations) as any)
        .afterStdSourceDataDiscover(runAfterOperations('afterStdSourceDataDiscover', customOperations) as any)
        .beforeStdSourceDataRead(runBeforeOperations('beforeStdSourceDataRead', customOperations) as any)
        .afterStdSourceDataRead(runAfterOperations('afterStdSourceDataRead', customOperations) as any)
}
