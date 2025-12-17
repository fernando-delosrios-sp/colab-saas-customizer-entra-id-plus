import {
    Context,
    readConfig,
    StdAccountListOutput,
    StdAccountReadOutput,
    StdAccountCreateOutput,
    StdAccountUpdateOutput,
    StdAccountDisableOutput,
    StdAccountEnableOutput,
    StdAccountUnlockOutput,
    StdChangePasswordOutput,
} from '@sailpoint/connector-sdk'
import { EntraIdClient } from './entraid-client'
import { AccountObject, Operation, OperationMap } from './model/operation'
import { Config } from './model/config'
import { getLogger, runOperations } from './utils'

export const getSponsors: Operation<AccountObject> = async (account: AccountObject) => {
    const config: Config = await readConfig()
    const logger = getLogger(config.spConnDebugLoggingEnabled)

    // Type guard: check if account has attributes property
    if ('attributes' in account && account.attributes) {
        logger.debug(`Getting sponsors for ${account.attributes.userPrincipalName}`)
        logger.debug('Loading client')
        const client = new EntraIdClient(config.domainName, config.clientID, config.clientSecret)
        logger.debug('Getting sponsors')
        const sponsors = await client.getSponsorsForGuest(account.attributes.objectId as string)
        logger.debug('Got sponsors')
        if (sponsors.length === 0) {
            logger.debug('No sponsors found')
            return undefined
        } else if (sponsors.length === 1) {
            logger.debug('Found one sponsor: ' + sponsors[0].userPrincipalName)
            return sponsors[0].userPrincipalName
        } else {
            logger.debug('Found more than one sponsor: ' + sponsors.map((x: any) => x.userPrincipalName).join(', '))
            return sponsors.map((x: any) => x.userPrincipalName)
        }
    } else {
        const uuid = 'uuid' in account ? account.uuid : 'unknown'
        logger.debug('No attributes found for ' + uuid)
        return undefined
    }
}

export const accountOperations: OperationMap<AccountObject> = {
    'attributes.sponsors': getSponsors,
}

const runAccountOperationsImpl = runOperations(accountOperations)

// Overloads to match SDK after-handler signatures
export function runAccountOperations(context: Context, output: StdAccountListOutput): Promise<StdAccountListOutput>
export function runAccountOperations(context: Context, output: StdAccountReadOutput): Promise<StdAccountReadOutput>
export function runAccountOperations(context: Context, output: StdAccountCreateOutput): Promise<StdAccountCreateOutput>
export function runAccountOperations(context: Context, output: StdAccountUpdateOutput): Promise<StdAccountUpdateOutput>
export function runAccountOperations(
    context: Context,
    output: StdAccountDisableOutput
): Promise<StdAccountDisableOutput>
export function runAccountOperations(context: Context, output: StdAccountEnableOutput): Promise<StdAccountEnableOutput>
export function runAccountOperations(context: Context, output: StdAccountUnlockOutput): Promise<StdAccountUnlockOutput>
export function runAccountOperations(
    context: Context,
    output: StdChangePasswordOutput
): Promise<StdChangePasswordOutput>

// Implementation
export function runAccountOperations(context: Context, output: AccountObject): Promise<AccountObject> {
    return runAccountOperationsImpl(context, output)
}
