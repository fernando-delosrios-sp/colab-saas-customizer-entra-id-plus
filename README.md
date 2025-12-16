## Entra ID Plus - SaaS Connector Customizer

A powerful SailPoint SaaS Connector Customizer for Microsoft Entra ID (formerly Azure AD) that extends the native Entra ID connector with **custom account and entitlement attributes**. This customizer lets you define focused functions that run after standard connector operations and enrich the data returned to Identity Security Cloud (ISC).

### Overview

This customizer enhances the standard Microsoft Entra ID connector by intercepting both **account** and **entitlement** operations after they are retrieved from the source system and before they are sent to ISC. You can implement custom operations that:

- **Call Microsoft Graph API** (via a built‑in `EntraIdClient`)
- **Derive additional attributes** from existing output (for example, parsing entitlement names)
- **Apply logic on every relevant standard operation** (list, read, create, update, enable/disable, etc.)

### How It Works

The entry point is `src/index.ts`, which exports the `connectorCustomizer` used by `@sailpoint/connector-sdk`. It wires custom logic into standard Entra ID operations:

- **Account after‑handlers**: `stdAccountList`, `stdAccountRead`, `stdAccountCreate`, `stdAccountUpdate`, `stdAccountDisable`, `stdAccountEnable`, `stdAccountUnlock`, `stdChangePassword` → all call `runAccountOperations` from `src/accountOperations.ts`.
- **Entitlement after‑handlers**: `stdEntitlementList`, `stdEntitlementRead` → call `runEntitlementOperations` from `src/entitlementOperations.ts`.

Both `runAccountOperations` and `runEntitlementOperations` delegate to a generic `runOperations` helper in `src/utils.ts`, which:

- Loads the connector `Config` via `readConfig()`
- Sets the global `logger` level based on `config.spConnDebugLoggingEnabled`
- Iterates a map of `Operation`s and, for each one:
    - Executes the operation with the current account/entitlement
    - Uses `setAttribute` to write the returned value back to the correct attribute path on the object

### Features

- **Easy custom attribute enrichment** for both accounts and entitlements
- **Centralized Microsoft Graph API client** (`EntraIdClient`) using `@azure/identity` + `@microsoft/microsoft-graph-client`
- **Flexible attribute mapping** with support for both direct properties (e.g., `disabled`) and nested `attributes.*` paths
- **Config‑driven logging** via `spConnDebugLoggingEnabled`
- **TypeScript‑first implementation** with typed `Config`, `AccountObject`, and `EntitlementObject`

---

## Built‑in Operations

### 1. Account Operations (`src/accountOperations.ts`)

The default `accountOperations` map defines one enrichment:

- **`attributes.sponsors`** → `getSponsors(account: AccountObject)`  
  Enriches accounts representing guest users with their sponsor(s) from Microsoft Graph.

**Implementation summary (`getSponsors`):**

- Reads the connector `Config` via `readConfig()`
- Builds a logger with `getLogger(config.spConnDebugLoggingEnabled)`
- If `account.attributes` is present:
    - Logs the `userPrincipalName`
    - Creates an `EntraIdClient` with `domainName`, `clientID`, and `clientSecret`
    - Calls `client.getSponsorsForGuest(account.attributes.objectId as string)`
    - Maps the resulting sponsors to `userPrincipalName` values
    - Returns:
        - `undefined` if no sponsors
        - A single UPN string if exactly one sponsor
        - An array of UPN strings if multiple sponsors
- If `attributes` is missing, logs a debug message and returns `undefined`

The `accountOperations` map currently contains:

```typescript
export const accountOperations: OperationMap<AccountObject> = {
    'attributes.sponsors': getSponsors,
}
```

> **Where it runs:** All standard account after‑handlers: `afterStdAccountList`, `afterStdAccountRead`, `afterStdAccountCreate`, `afterStdAccountUpdate`, `afterStdAccountDisable`, `afterStdAccountEnable`, `afterStdAccountUnlock`, and `afterStdChangePassword`.

### 2. Entitlement Operations (`src/entitlementOperations.ts`)

The default `entitlementOperations` map defines one enrichment:

- **`attributes.application`** → `getApplication(entitlement: EntitlementObject)`  
  Extracts an application name from entitlement UUIDs for specific entitlement types.

**Implementation summary (`getApplication`):**

- Applies only when `entitlement.type` is in `['applicationRole']`
- Splits `entitlement.uuid` on `' [on] '` into `[name, application]`
- Writes the `application` part into `entitlement.attributes.application`
- Returns the updated `entitlement`

The `entitlementOperations` map currently contains:

```typescript
export const entitlementOperations: OperationMap<EntitlementObject> = {
    'attributes.application': getApplication,
}
```

> **Where it runs:** `afterStdEntitlementList` and `afterStdEntitlementRead`.

---

## Microsoft Graph Integration (`src/entraid-client.ts`)

The `EntraIdClient` encapsulates authentication and calls to Microsoft Graph using `ClientSecretCredential`:

- **Authentication**:
    - Uses `domainName` (tenant), `clientID`, and `clientSecret` from the connector `Config`
    - Requests tokens for the scope `https://graph.microsoft.com/.default`
- **Built‑in method**:
    - `getSponsorsForGuest(upn: string): Promise<any[]>`
        - Fetches the user by UPN: `GET /users/{upn}?$select=id,displayName,userPrincipalName`
        - Uses the returned `id` to call `GET /users/{id}/sponsors`
        - Returns `response.value` (array) or `[]` on error, logging failures via `logger.error`

You can add additional Graph methods to `EntraIdClient` to support new custom operations (see below).

---

## Configuration (`src/model/config.ts`)

This project reuses the **same configuration schema** as the base Microsoft Entra ID SaaS connector. The `Config` interface mirrors the connector’s JSON configuration, including (non‑exhaustive):

- **Core fields**: `domainName`, `clientID`, `clientSecret`, `cloudDisplayName`, `cloudExternalId`, `connectionType`, `templateApplication`, `sourceConnected`, `status`
- **Logging / diagnostics**: `spConnDebugLoggingEnabled`, `'slpt-source-diagnostics'`, `spConnEnableStatefulCommands`
- **Aggregation / delta**: `deltaAggregation`, `deltaAggregationEnabled`, `supportsDeltaAgg`, `partitionAggregationEnabled`, `accountDeltaToken`, `groupDeltaToken`, `groupMembershipDeltaToken`
- **Azure / Exchange / PIM controls**: `enableAzureManagement`, `manageAzureServicePrincipalAsAccount`, `manageO365Groups`, `enablePIM`, `enableAccessPackageManagement`, `manageExchangeOnline`, `spnManageAzurePIM`, `spnManageAzureADPIM`, `spnManageAppRoles`, `spnManageGroups`, `spnManageDirectoryRole`, `spnManageRBACRoles`
- **Miscellaneous**: `pageSize`, `maxRetryCount`, `isB2CTenant`, `isCaeEnabled`, `subscribedSkus`, etc.

The key fields used by the built‑in operations are:

- **`domainName`** – Entra ID tenant (used as the `tenantId` for `ClientSecretCredential`)
- **`clientID`** – Azure AD / Entra ID application client ID
- **`clientSecret`** – Secret for the application
- **`spConnDebugLoggingEnabled`** – Enables verbose debug logging via `getLogger`

No extra configuration beyond the standard Entra ID connector is required to use the built‑in operations.

---

## Adding Custom Operations

You can easily extend the customizer by defining new operations for **accounts** or **entitlements**.

### 1. Define your operation

For an **account attribute**, add a function to `src/accountOperations.ts`:

```typescript
import { readConfig } from '@sailpoint/connector-sdk'
import { AccountObject, Operation, OperationMap } from './model/operation'
import { Config } from './model/config'
import { EntraIdClient } from './entraid-client'
import { getLogger } from './utils'

export const getCustomAttribute: Operation<AccountObject> = async (account: AccountObject) => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)

    // Your custom logic here
    const client = new EntraIdClient(config.domainName, config.clientID, config.clientSecret)

    // Example: Fetch custom data from Graph
    const customData = await client.getCustomData(account.attributes?.objectId as string)

    logger.debug(`Computed custom attribute for ${account.uuid}`)
    return customData
}
```

For an **entitlement attribute**, add a similar function to `src/entitlementOperations.ts` using `EntitlementObject` instead.

### 2. Register it in the operation map

In `src/accountOperations.ts` (or `src/entitlementOperations.ts`), extend the appropriate map:

```typescript
export const accountOperations: OperationMap<AccountObject> = {
    'attributes.sponsors': getSponsors,
    'attributes.customAttribute': getCustomAttribute, // new custom attribute
}
```

### 3. (Optional) Add new Graph helper methods

If your operation needs additional data from Microsoft Graph, extend `src/entraid-client.ts`:

```typescript
export class EntraIdClient {
    // existing constructor and methods...

    async getCustomData(userId: string): Promise<any> {
        try {
            const response = await this.graphClient
                .api(`/users/${userId}/extensions`) // example endpoint
                .get()

            return response.value
        } catch (error) {
            logger.error('Error fetching custom data:', error)
            return null
        }
    }
}
```

---

## Attribute Naming Convention

- **Direct account/entitlement properties**: Use the property name directly.  
  - Example: `'disabled'`, `'locked'`
- **Nested attributes**: Prefix with `attributes.` to write into the `attributes` map.  
  - Example: `'attributes.sponsors'`, `'attributes.customAttribute'`, `'attributes.application'`

The `setAttribute` helper in `src/utils.ts` automatically strips the `attributes.` prefix and writes into `object.attributes[...]` when the prefix is present; otherwise, it sets a top‑level property on the object.

---

## Logging

Logging is based on the `@sailpoint/connector-sdk` `logger` and controlled by the `spConnDebugLoggingEnabled` configuration flag:

- When `spConnDebugLoggingEnabled` is `true`, `getLogger` sets `logger.level = 'debug'` to maximize observability.
- When `false`, the level is set to `'info'` to reduce noise.

Each operation logs when it starts and can log additional context (e.g., which attribute is being computed, which account/entitlement is being processed, and errors from Graph).

---

## Build & Development

### Prerequisites

- **Node.js 18+**
- **npm**
- Access to a **SailPoint Identity Security Cloud** environment with the Microsoft Entra ID SaaS connector

### Scripts (`package.json`)

```bash
# Install dependencies
npm install

# Clean previous build artifacts
npm run clean

# Build the customizer (using @vercel/ncc)
npm run build

# Run in development mode with source maps (via spcx)
npm run dev

# Run in debug mode (no rebuild)
npm run debug

# Prepare and package for deployment
npm run prepack-zip   # npm ci + build
npm run pack-zip      # spcx package -> ZIP for upload
```

The compiled entry point is `dist/index.js`, as configured by `"main": "dist/index.js"` in `package.json`.

### Deployment

1. **Build** the customizer: `npm run build` (or `npm run prepack-zip`)
2. **Package** it: `npm run pack-zip` (creates the deployable ZIP via `spcx package`)
3. **Upload** the package in your ISC tenant as a SaaS connector customizer
4. **Link** the customizer to your Microsoft Entra ID source
5. **Enable** the relevant after‑operations (account and entitlement) as needed

---

## Supported Connectors

This customizer is designed for the **Microsoft Entra ID** SaaS connector, one of the [supported SaaS connectors](https://developer.sailpoint.com/docs/connectivity/saas-connectivity/customizers) in the SailPoint SaaS Connectivity framework.

---

## Troubleshooting

### Debug Logging

Set `spConnDebugLoggingEnabled: true` in your connector configuration to enable detailed logs for:

- Custom operation execution (account and entitlement)
- Microsoft Graph API calls and errors
- Attribute assignment via `setAttribute`
- After‑handler invocation (`stdAccount*` / `stdEntitlement*`)

### Common Issues

- **Authentication errors**  
  Ensure your Azure AD / Entra ID application is configured with the correct **client ID**, **client secret**, and **tenant (domainName)**, and has the required **Microsoft Graph permissions** (e.g., `User.Read.All`, `Directory.Read.All`, and any sponsor‑related permissions).

- **Missing attributes**  
  Verify that the incoming account/entitlement objects contain the fields your operations use (for example, `attributes.objectId`, `attributes.userPrincipalName`, `uuid`, `type`). Add appropriate null/undefined checks in custom operations when necessary.

- **Graph API throttling or failures**  
  Monitor logs for `Error fetching ...` messages from `EntraIdClient`. Consider adding retry/backoff or caching in custom methods if you are making many Graph calls per aggregation.

---

## Dependencies

- `@sailpoint/connector-sdk` – SailPoint Connector SDK (customizer runtime & logger)
- `@azure/identity` – Azure AD / Entra ID authentication (`ClientSecretCredential`)
- `@microsoft/microsoft-graph-client` – Microsoft Graph API client
- `isomorphic-fetch` – Fetch polyfill for Node.js
- `@vercel/ncc` – Single‑file bundling for deployment
- `cross-env`, `shx`, `typescript`, `prettier` – build and developer tooling

---

## Contributing

- **Fork** the repository
- **Create** a feature branch
- **Implement** your changes (operations, Graph helpers, docs, etc.)
- **Add tests** if applicable
- **Open** a pull request

---

## License

This project is licensed under the **MIT License** – see `LICENSE.txt` for details.

---

## Support

- Check the [SailPoint Developer Documentation](https://developer.sailpoint.com/docs/connectivity/saas-connectivity/customizers)
- Review the **Microsoft Graph API** documentation for the endpoints you are using
- Enable **debug logging** (`spConnDebugLoggingEnabled: true`) for detailed troubleshooting information


