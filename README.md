# Entra ID Plus - SaaS Connector Customizer

A powerful SaaS Connector Customizer for Microsoft Entra ID (formerly Azure AD) that extends the native Entra ID connector with custom account attributes. This customizer allows you to easily add custom account attributes by defining dedicated functions that fetch additional data from Microsoft Graph API.

## Overview

This customizer enhances the standard Microsoft Entra ID connector by intercepting account data after it's retrieved from the source system and before it's sent to Identity Security Cloud. It allows you to add custom attributes to user accounts by implementing custom operations that fetch additional data from Microsoft Graph API.

## How It Works

The customizer works by sitting between Identity Security Cloud and the Entra ID connector, intercepting calls and allowing you to modify the data flow. Specifically, it:

1. **Intercepts Account Operations**: Captures both `stdAccountList` and `stdAccountRead` operations
2. **Executes Custom Operations**: Runs your defined custom operations for each account
3. **Enriches Account Data**: Adds the results as new attributes to the account objects
4. **Returns Enhanced Data**: Sends the enriched account data back to Identity Security Cloud

## Features

-   **Easy Custom Attribute Addition**: Define custom functions to fetch additional account attributes
-   **Microsoft Graph API Integration**: Built-in client for seamless Graph API interactions
-   **Flexible Attribute Mapping**: Support for both direct account properties and nested attributes
-   **Comprehensive Logging**: Debug and info logging for troubleshooting
-   **TypeScript Support**: Full type safety and IntelliSense support

## Current Implementation

The customizer currently includes one example operation:

### Sponsors Attribute (`attributes.sponsors`)

Fetches the sponsors for guest users in your Entra ID tenant. This is particularly useful for organizations that need to track who sponsored guest access.

**Function**: `getSponsors`

-   **Input**: Account object with `objectId` and `userPrincipalName`
-   **Output**:
    -   `undefined` if no sponsors found
    -   Single sponsor's UPN if one sponsor exists
    -   Array of sponsor UPNs if multiple sponsors exist

## Configuration

The customizer uses the same configuration as the base Entra ID connector, including:

-   `domainName`: Your Entra ID tenant domain
-   `clientID`: Azure AD application client ID
-   `clientSecret`: Azure AD application client secret
-   `spConnDebugLoggingEnabled`: Enable/disable debug logging

## Adding Custom Attributes

To add new custom attributes, follow these steps:

### 1. Define Your Operation Function

Create a new function in `src/operations.ts`:

```typescript
export const getCustomAttribute: AccountOperation = async (account) => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)

    // Your custom logic here
    const client = new EntraIdClient(config.domainName, config.clientID, config.clientSecret)

    // Example: Fetch custom data
    const customData = await client.getCustomData(account.attributes.objectId as string)

    return customData
}
```

### 2. Add to Operations Map

Register your operation in the `operations` object:

```typescript
export const operations: OperationMap = {
    'attributes.sponsors': getSponsors,
    'attributes.customAttribute': getCustomAttribute, // Add your new operation
}
```

### 3. Implement Graph API Methods (if needed)

Add new methods to the `EntraIdClient` class in `src/entraid-client.ts`:

```typescript
async getCustomData(userId: string): Promise<any> {
    try {
        const response = await this.graphClient
            .api(`/users/${userId}/customEndpoint`)
            .get()
        return response.value
    } catch (error) {
        logger.error('Error fetching custom data:', error)
        return null
    }
}
```

## Attribute Naming Convention

-   **Direct Account Properties**: Use the property name directly (e.g., `'customField'`)
-   **Nested Attributes**: Use the `attributes.` prefix (e.g., `'attributes.sponsors'`)

## Building and Deployment

### Prerequisites

-   Node.js 18+
-   npm or yarn
-   SailPoint Connector SDK

### Build Commands

```bash
# Install dependencies
npm install

# Build the customizer
npm run build

# Development mode
npm run dev

# Debug mode
npm run debug

# Package for deployment
npm run pack-zip
```

### Deployment

1. Build the customizer using `npm run build`
2. Package it using `npm run pack-zip`
3. Upload the generated package to your Identity Security Cloud instance
4. Link the customizer to your Entra ID source

## Supported Connectors

This customizer is designed to work with the Microsoft Entra ID connector, which is one of the [supported SaaS connectors](https://developer.sailpoint.com/docs/connectivity/saas-connectivity/customizers) that use native SaaS Connectivity framework.

## Troubleshooting

### Debug Logging

Enable debug logging by setting `spConnDebugLoggingEnabled: true` in your connector configuration. This will provide detailed logs of:

-   Custom operation execution
-   Microsoft Graph API calls
-   Attribute assignment
-   Error details

### Common Issues

1. **Authentication Errors**: Verify your Azure AD application has the necessary Graph API permissions
2. **Missing Attributes**: Ensure the account object contains required attributes (e.g., `objectId`)
3. **Graph API Limits**: Be aware of Microsoft Graph API rate limits and implement appropriate throttling

## Dependencies

-   `@sailpoint/connector-sdk`: SailPoint Connector SDK
-   `@azure/identity`: Azure authentication library
-   `@microsoft/microsoft-graph-client`: Microsoft Graph API client
-   `isomorphic-fetch`: Fetch polyfill for Node.js

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:

-   Check the [SailPoint Developer Documentation](https://developer.sailpoint.com/docs/connectivity/saas-connectivity/customizers)
-   Review the Microsoft Graph API documentation for available endpoints
-   Enable debug logging for detailed troubleshooting information
