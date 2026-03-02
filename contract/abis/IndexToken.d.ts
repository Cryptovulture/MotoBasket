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

// ------------------------------------------------------------------
// IIndexToken
// ------------------------------------------------------------------
export interface IIndexToken extends IOP_NETContract {
    invest(motoAmount: bigint, minSharesOut: bigint): Promise<Invest>;
    redeem(shareAmount: bigint): Promise<Redeem>;
    getComponentCount(): Promise<GetComponentCount>;
    getComponent(index: bigint): Promise<GetComponent>;
    getHolding(index: bigint): Promise<GetHolding>;
}
