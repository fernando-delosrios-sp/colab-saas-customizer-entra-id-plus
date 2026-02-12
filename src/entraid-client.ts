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

    async setSponsorForUser(userId: string, sponsorUpn: string): Promise<void> {
        try {
            // Step 1: Resolve sponsor UPN to their object ID
            logger.info(`Resolving sponsor UPN: ${sponsorUpn}`)
            const sponsorResponse = await this.graphClient
                .api(`/users/${sponsorUpn}`)
                .select('id')
                .get()

            const sponsorId = sponsorResponse.id
            logger.info(`Resolved sponsor ID: ${sponsorId}`)

            // Step 2: Set the sponsor on the target user
            await this.graphClient.api(`/users/${userId}/sponsors/$ref`).post({
                '@odata.id': `https://graph.microsoft.com/v1.0/users/${sponsorId}`,
            })
            logger.info(`Successfully set sponsor ${sponsorUpn} for user ${userId}`)
        } catch (error) {
            logger.error(`Error setting sponsor ${sponsorUpn} for user ${userId}:`)
            logger.error(error)
            throw error
        }
    }

    async removeSponsorForUser(userId: string, sponsorId: string): Promise<void> {
        try {
            await this.graphClient.api(`/users/${userId}/sponsors/${sponsorId}/$ref`).delete()
            logger.info(`Successfully removed sponsor ${sponsorId} from user ${userId}`)
        } catch (error) {
            logger.error(`Error removing sponsor ${sponsorId} from user ${userId}:`)
            logger.error(error)
            throw error
        }
    }

    async clearSponsorsForUser(userId: string): Promise<void> {
        try {
            const sponsorsResponse = await this.graphClient.api(`/users/${userId}/sponsors`).get()
            const sponsors = (sponsorsResponse.value as any[]) ?? []
            for (const sponsor of sponsors) {
                await this.removeSponsorForUser(userId, sponsor.id)
            }
            if (sponsors.length > 0) {
                logger.info(`Cleared ${sponsors.length} sponsor(s) from user ${userId}`)
            }
        } catch (error) {
            logger.error(`Error clearing sponsors for user ${userId}:`)
            logger.error(error)
            throw error
        }
    }
}
