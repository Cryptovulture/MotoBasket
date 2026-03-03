import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the invest function call.
 */
export type Invest = CallResult<
    {
        shares: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the redeem function call.
 */
export type Redeem = CallResult<
    {
        motoReturned: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the rebalance function call.
 */
export type Rebalance = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the updateWeights function call.
 */
export type UpdateWeights = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the updatePair function call.
 */
export type UpdatePair = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setMinInvestment function call.
 */
export type SetMinInvestment = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getComponentCount function call.
 */
export type GetComponentCount = CallResult<
    {
        count: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getComponent function call.
 */
export type GetComponent = CallResult<
    {
        token: Address;
        weight: bigint;
        pair: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getHolding function call.
 */
export type GetHolding = CallResult<
    {
        amount: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getCurator function call.
 */
export type GetCurator = CallResult<
    {
        curator: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getLastRebalanceBlock function call.
 */
export type GetLastRebalanceBlock = CallResult<
    {
        blockNumber: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getMinInvestment function call.
 */
export type GetMinInvestment = CallResult<
    {
        amount: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getOwner function call.
 */
export type GetOwner = CallResult<
    {
        owner: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getMotoAddress function call.
 */
export type GetMotoAddress = CallResult<
    {
        moto: Address;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IIndexToken
// ------------------------------------------------------------------
export interface IIndexToken extends IOP_NETContract {
    invest(motoAmount: bigint, minSharesOut: bigint): Promise<Invest>;
    redeem(shareAmount: bigint, minMotoOut: bigint): Promise<Redeem>;
    rebalance(): Promise<Rebalance>;
    updateWeights(count: bigint): Promise<UpdateWeights>;
    updatePair(componentIndex: bigint, newPairAddr: Address): Promise<UpdatePair>;
    setMinInvestment(amount: bigint): Promise<SetMinInvestment>;
    getComponentCount(): Promise<GetComponentCount>;
    getComponent(index: bigint): Promise<GetComponent>;
    getHolding(index: bigint): Promise<GetHolding>;
    getCurator(): Promise<GetCurator>;
    getLastRebalanceBlock(): Promise<GetLastRebalanceBlock>;
    getMinInvestment(): Promise<GetMinInvestment>;
    getOwner(): Promise<GetOwner>;
    getMotoAddress(): Promise<GetMotoAddress>;
}
