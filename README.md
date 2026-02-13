## SaaS Connector Customizer Template

A **template** for building SailPoint SaaS Connector Customizers that extend any [supported SaaS connector](https://developer.sailpoint.com/docs/connectivity/saas-connectivity/customizers) with custom account and entitlement attributes. The included implementation targets **Microsoft Entra ID** (sponsors & application parsing), but the framework is connector-agnostic — swap the API client and operations for any connector.

---

### Architecture

```
index.ts                      ← entry point: wires handlers to SDK commands
├── accountOperations.ts      ← operation maps for accounts (before + after)
├── entitlementOperations.ts  ← operation maps for entitlements (before + after)
├── utils.ts                  ← generic engine: runBeforeOperations / runAfterOperations
├── model/
│   ├── operation.ts          ← Operation / OperationMap type definitions
│   └── config.ts             ← connector configuration interface
├── operations/               ← your custom operation functions live here
│   ├── setSponsors.ts        ← (Entra ID) after: fetch sponsors from Graph
│   ├── handleSponsorUpdate.ts ← (Entra ID) before: apply sponsor changes via Graph
│   └── getApplication.ts     ← (Entra ID) after: parse application from entitlement name
└── entraid-client.ts         ← (Entra ID) Microsoft Graph API wrapper
```

### How it works

1. **`index.ts`** registers a single before-handler and a single after-handler for every standard SDK command (account list/read/create/update/disable/enable/unlock, change-password, entitlement list/read).

2. Each handler delegates to the **operation runner** in `utils.ts`, which iterates an **operation map** — a plain object that maps an attribute path to a function:

   ```typescript
   // accountOperations.ts
   export const accountAfterOperations: AfterOperationMap<AccountObject> = {
       'attributes.sponsors': setSponsors, // attribute path → function
   }
   ```

3. **Before operations** transform the SDK input in a pipeline (each function receives the input and returns the modified input). They only run when the input contains the relevant attribute.

4. **After operations** run against every output object. Each function receives the object and returns a value that the engine writes to the mapped attribute path (e.g. `attributes.sponsors`).

5. Attribute paths follow a simple convention:
   - `'attributes.foo'` → writes to `object.attributes.foo`
   - `'disabled'` → writes to `object.disabled`

---

### Quick start — adding a custom attribute

**1. Write your operation** in `src/operations/`:

```typescript
// src/operations/myCustomAttr.ts
import { Context, readConfig } from '@sailpoint/connector-sdk'
import { AccountObject, AfterOperation } from '../model/operation'
import { Config } from '../model/config'
import { getLogger } from '../utils'

export const myCustomAttr: AfterOperation<AccountObject> = async (context: Context, account: AccountObject) => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)

    // Your logic here — call an API, derive a value, etc.
    logger.debug(`Computing custom attr for ${account.uuid}`)
    return 'computed-value'
}
```

**2. Register it** in the operation map:

```typescript
// src/accountOperations.ts
import { myCustomAttr } from './operations/myCustomAttr'

export const accountAfterOperations: AfterOperationMap<AccountObject> = {
    'attributes.sponsors': setSponsors,
    'attributes.myCustomAttr': myCustomAttr, // ← new
}
```

That's it. The framework handles iteration, attribute assignment, frozen-object fallback, and logging.

---

### Adapting for a different connector

The only Entra ID-specific files are:

| File | Purpose |
|------|---------|
| `src/entraid-client.ts` | Microsoft Graph API wrapper |
| `src/operations/setSponsors.ts` | After-op: fetch sponsors |
| `src/operations/handleSponsorUpdate.ts` | Before-op: apply sponsor changes |
| `src/operations/getApplication.ts` | After-op: parse app from entitlement |
| `src/model/config.ts` | Entra ID connector config interface |

Everything else (`index.ts`, `utils.ts`, `model/operation.ts`, `accountOperations.ts`, `entitlementOperations.ts`) is generic framework code. To target a different connector:

1. Replace `entraid-client.ts` with a client for your target API
2. Update `config.ts` to match your connector's configuration schema
3. Write new operations in `src/operations/`
4. Wire them into the operation maps in `accountOperations.ts` / `entitlementOperations.ts`

---

### Included Entra ID operations

#### Sponsors (account attribute)

| Phase | Operation | What it does |
|-------|-----------|-------------|
| Before | `handleSponsorUpdate` | Intercepts sponsor changes in the input. For **update** commands, applies them immediately via Graph API. For **create** commands, defers the write (user doesn't exist yet) and caches the pending change for the after phase. |
| After | `setSponsors` | If a deferred sponsor change was cached (create flow), applies it now that the user exists. Then fetches sponsors from `GET /users/{id}/sponsors` and returns UPN(s). |

Sponsors are a **navigation property** in Microsoft Graph (not a direct attribute), so the base connector cannot read/write them natively. This before/after pair handles them transparently.

#### Application (entitlement attribute)

| Phase | Operation | What it does |
|-------|-----------|-------------|
| After | `getApplication` | For `applicationRole` entitlements, splits `displayName` on ` [on] ` and returns the application name portion. |

---

### Configuration

The customizer reuses the same configuration as the base connector. The key fields used by the included Entra ID operations are:

| Field | Used for |
|-------|----------|
| `domainName` | Entra ID tenant ID (passed to `ClientSecretCredential`) |
| `clientID` | Application (client) ID |
| `clientSecret` | Application secret |
| `spConnDebugLoggingEnabled` | Toggles debug-level logging |

No additional configuration is required beyond what the base connector provides.

---

### Build & development

```bash
npm install           # install dependencies
npm run build         # clean + compile (via @vercel/ncc)
npm run dev           # run locally with source maps (spcx)
npm run debug         # run locally without rebuild
npm run pack-zip      # package for deployment (spcx package)
```

### Deployment

1. `npm run build` (or `npm run prepack-zip`)
2. `npm run pack-zip` → creates a deployable ZIP
3. Upload to ISC as a SaaS connector customizer
4. Link to your source and enable the relevant before/after operations

---

### Logging

Controlled by `spConnDebugLoggingEnabled`:

- `true` → `logger.level = 'debug'` (verbose operation tracing)
- `false` → `logger.level = 'info'` (production)

---

### Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| Auth errors from Graph | Check `clientID`, `clientSecret`, `domainName` and required Graph permissions (`User.Read.All`, `Directory.Read.All`) |
| Missing attributes on output | Verify the incoming object contains the fields your operations use (`objectId`, `userPrincipalName`, `uuid`, `type`). Add null checks as needed. |
| 404 on aggregation with `sponsors` in `$select` | `sponsors` is a Graph navigation property (requires `$expand`, not `$select`). Configure the attribute in ISC so the base connector does not fetch it — the customizer handles it via a separate API call. |
| Graph throttling / failures | Check logs for `Error fetching ...` messages. Consider adding retry/backoff in the client methods. |

---

### Dependencies

| Package | Purpose |
|---------|---------|
| `@sailpoint/connector-sdk` | Customizer runtime, logger, config |
| `@azure/identity` | Entra ID authentication (`ClientSecretCredential`) |
| `@microsoft/microsoft-graph-client` | Microsoft Graph API client |
| `isomorphic-fetch` | Fetch polyfill for Node.js |
| `@vercel/ncc` | Single-file bundling |
| `cross-env`, `shx`, `typescript`, `prettier` | Build tooling |

---

### License

MIT — see `LICENSE.txt`.
