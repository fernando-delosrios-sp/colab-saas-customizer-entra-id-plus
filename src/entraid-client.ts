import { Client } from '@microsoft/microsoft-graph-client'
import { ClientSecretCredential } from '@azure/identity'
import 'isomorphic-fetch' // Required for node-fetch in some environments
import { logger } from '@sailpoint/connector-sdk'
export class EntraIdClient {
    private graphClient: Client
    private credential: ClientSecretCredential

    constructor(domainName: string, clientId: string, clientSecret: string) {
        // Use the domain name directly as the tenant ID
        this.credential = new ClientSecretCredential(domainName, clientId, clientSecret)

        this.graphClient = Client.initWithMiddleware({
            authProvider: {
                getAccessToken: async () => {
                    const token = await this.credential.getToken('https://graph.microsoft.com/.default')
                    return token?.token || ''
                },
            },
        })
    }

    async getSponsorsForGuest(upn: string): Promise<any[]> {
        try {
            // Step 1: Get the guest user by UPN
            logger.info(`Fetching user details for UPN: ${upn}`)
            const userResponse = await this.graphClient
                .api(`/users/${upn}`)
                .select('id,displayName,userPrincipalName')
                .get()

            const userId = userResponse.id

            // Step 2: Get sponsors
            const sponsorsResponse = await this.graphClient.api(`/users/${userId}/sponsors`).get()
            return (sponsorsResponse.value as any[]) ?? []
        } catch (error) {
            logger.error('Error fetching sponsors:')
            logger.error(error)
            return []
        }
    }
}
