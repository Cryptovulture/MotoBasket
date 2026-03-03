import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    OP20,
    OP20InitParameters,
    Blockchain,
    Address,
    Calldata,
    BytesWriter,
    Selector,
    SafeMath,
    Revert,
    StoredU256,
    StoredAddress,
    encodeSelector,
    EMPTY_POINTER,
} from '@btc-vision/btc-runtime/runtime';

// Max components per index
const MAX_COMPONENTS: u32 = 10;

// Weight basis points — all weights must sum to this
const WEIGHT_BASIS: u256 = u256.fromU32(10000);

// Default minimum investment: 10 MOTO (18 decimals)
const DEFAULT_MIN_INVESTMENT: u256 = u256.fromString('10000000000000000000');

// AMM constants (MotoSwap pool: 0.5% fee)
const FEE_NUMERATOR: u256 = u256.fromU32(995);
const FEE_DENOMINATOR: u256 = u256.fromU32(1000);

// Selectors for cross-contract calls (SHA256-based, full signature)
const SEL_TRANSFER: Selector = encodeSelector('transfer(address,uint256)');
const SEL_TRANSFER_FROM: Selector = encodeSelector('transferFrom(address,address,uint256)');
const SEL_BALANCE_OF: Selector = encodeSelector('balanceOf(address)');
const SEL_GET_RESERVES: Selector = encodeSelector('getReserves()');
const SEL_PAIR_SWAP: Selector = encodeSelector('swap(uint256,uint256,address,bytes)');
const SEL_TOKEN0: Selector = encodeSelector('token0()');

@final
export class IndexToken extends OP20 {
    // ── Scalar storage pointers ──────────────────────────────────────────
    private readonly motoAddressPointer: u16 = Blockchain.nextPointer;
    private readonly componentCountPointer: u16 = Blockchain.nextPointer;
    private readonly minInvestmentPointer: u16 = Blockchain.nextPointer;
    private readonly ownerPointer: u16 = Blockchain.nextPointer;
    private readonly curatorPointer: u16 = Blockchain.nextPointer;
    private readonly lastRebalanceBlockPointer: u16 = Blockchain.nextPointer;

    // ── Component addresses (10 slots) ───────────────────────────────────
    private readonly comp0Pointer: u16 = Blockchain.nextPointer;
    private readonly comp1Pointer: u16 = Blockchain.nextPointer;
    private readonly comp2Pointer: u16 = Blockchain.nextPointer;
    private readonly comp3Pointer: u16 = Blockchain.nextPointer;
    private readonly comp4Pointer: u16 = Blockchain.nextPointer;
    private readonly comp5Pointer: u16 = Blockchain.nextPointer;
    private readonly comp6Pointer: u16 = Blockchain.nextPointer;
    private readonly comp7Pointer: u16 = Blockchain.nextPointer;
    private readonly comp8Pointer: u16 = Blockchain.nextPointer;
    private readonly comp9Pointer: u16 = Blockchain.nextPointer;

    // ── Component weights (10 slots) ─────────────────────────────────────
    private readonly weight0Pointer: u16 = Blockchain.nextPointer;
    private readonly weight1Pointer: u16 = Blockchain.nextPointer;
    private readonly weight2Pointer: u16 = Blockchain.nextPointer;
    private readonly weight3Pointer: u16 = Blockchain.nextPointer;
    private readonly weight4Pointer: u16 = Blockchain.nextPointer;
    private readonly weight5Pointer: u16 = Blockchain.nextPointer;
    private readonly weight6Pointer: u16 = Blockchain.nextPointer;
    private readonly weight7Pointer: u16 = Blockchain.nextPointer;
    private readonly weight8Pointer: u16 = Blockchain.nextPointer;
    private readonly weight9Pointer: u16 = Blockchain.nextPointer;

    // ── Pair addresses (10 slots) ────────────────────────────────────────
    private readonly pair0Pointer: u16 = Blockchain.nextPointer;
    private readonly pair1Pointer: u16 = Blockchain.nextPointer;
    private readonly pair2Pointer: u16 = Blockchain.nextPointer;
    private readonly pair3Pointer: u16 = Blockchain.nextPointer;
    private readonly pair4Pointer: u16 = Blockchain.nextPointer;
    private readonly pair5Pointer: u16 = Blockchain.nextPointer;
    private readonly pair6Pointer: u16 = Blockchain.nextPointer;
    private readonly pair7Pointer: u16 = Blockchain.nextPointer;
    private readonly pair8Pointer: u16 = Blockchain.nextPointer;
    private readonly pair9Pointer: u16 = Blockchain.nextPointer;

    // ── Storage instances ────────────────────────────────────────────────
    private _motoAddress: StoredAddress = new StoredAddress(this.motoAddressPointer);
    private _componentCount: StoredU256 = new StoredU256(this.componentCountPointer, EMPTY_POINTER);
    private _minInvestment: StoredU256 = new StoredU256(this.minInvestmentPointer, EMPTY_POINTER);
    private _owner: StoredAddress = new StoredAddress(this.ownerPointer);
    private _curator: StoredAddress = new StoredAddress(this.curatorPointer);
    private _lastRebalanceBlock: StoredU256 = new StoredU256(this.lastRebalanceBlockPointer, EMPTY_POINTER);

    private _components: StoredAddress[] = [
        new StoredAddress(this.comp0Pointer),
        new StoredAddress(this.comp1Pointer),
        new StoredAddress(this.comp2Pointer),
        new StoredAddress(this.comp3Pointer),
        new StoredAddress(this.comp4Pointer),
        new StoredAddress(this.comp5Pointer),
        new StoredAddress(this.comp6Pointer),
        new StoredAddress(this.comp7Pointer),
        new StoredAddress(this.comp8Pointer),
        new StoredAddress(this.comp9Pointer),
    ];

    private _weights: StoredU256[] = [
        new StoredU256(this.weight0Pointer, EMPTY_POINTER),
        new StoredU256(this.weight1Pointer, EMPTY_POINTER),
        new StoredU256(this.weight2Pointer, EMPTY_POINTER),
        new StoredU256(this.weight3Pointer, EMPTY_POINTER),
        new StoredU256(this.weight4Pointer, EMPTY_POINTER),
        new StoredU256(this.weight5Pointer, EMPTY_POINTER),
        new StoredU256(this.weight6Pointer, EMPTY_POINTER),
        new StoredU256(this.weight7Pointer, EMPTY_POINTER),
        new StoredU256(this.weight8Pointer, EMPTY_POINTER),
        new StoredU256(this.weight9Pointer, EMPTY_POINTER),
    ];

    private _pairs: StoredAddress[] = [
        new StoredAddress(this.pair0Pointer),
        new StoredAddress(this.pair1Pointer),
        new StoredAddress(this.pair2Pointer),
        new StoredAddress(this.pair3Pointer),
        new StoredAddress(this.pair4Pointer),
        new StoredAddress(this.pair5Pointer),
        new StoredAddress(this.pair6Pointer),
        new StoredAddress(this.pair7Pointer),
        new StoredAddress(this.pair8Pointer),
        new StoredAddress(this.pair9Pointer),
    ];

    public constructor() {
        super();
    }

    // ── Deployment ───────────────────────────────────────────────────────

    public override onDeployment(calldata: Calldata): void {
        const name: string = calldata.readStringWithLength();
        const symbol: string = calldata.readStringWithLength();
        const motoAddr: Address = calldata.readAddress();
        const curatorAddr: Address = calldata.readAddress();
        const compCount: u256 = calldata.readU256();

        const count: u32 = compCount.toU32();
        if (count == 0 || count > MAX_COMPONENTS) {
            throw new Revert('Invalid component count');
        }

        let weightSum: u256 = u256.Zero;
        for (let i: u32 = 0; i < count; i++) {
            const compAddr: Address = calldata.readAddress();
            const weight: u256 = calldata.readU256();
            const pairAddr: Address = calldata.readAddress();

            if (u256.eq(weight, u256.Zero)) {
                throw new Revert('Weight cannot be zero');
            }

            if (pairAddr.isZero()) {
                throw new Revert('Pair address cannot be zero');
            }

            this._components[i].value = compAddr;
            this._weights[i].value = weight;
            this._pairs[i].value = pairAddr;
            weightSum = SafeMath.add(weightSum, weight);
        }

        if (!u256.eq(weightSum, WEIGHT_BASIS)) {
            throw new Revert('Weights must sum to 10000');
        }

        this._motoAddress.value = motoAddr;
        this._componentCount.value = compCount;
        this._minInvestment.value = DEFAULT_MIN_INVESTMENT;
        this._owner.value = Blockchain.tx.sender;
        this._curator.value = curatorAddr;
        this._lastRebalanceBlock.value = u256.Zero;

        this.instantiate(new OP20InitParameters(
            u256.Max,
            18,
            name,
            symbol,
        ));
    }

    // ── invest(motoAmount: u256, minSharesOut: u256) ─────────────────────

    @method(
        { name: 'motoAmount', type: ABIDataTypes.UINT256 },
        { name: 'minSharesOut', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'shares', type: ABIDataTypes.UINT256 })
    public invest(calldata: Calldata): BytesWriter {
        const motoAmount: u256 = calldata.readU256();
        const minSharesOut: u256 = calldata.readU256();

        const sender: Address = Blockchain.tx.sender;
        const thisAddr: Address = Blockchain.contractAddress;
        const count: u32 = this._componentCount.value.toU32();
        const motoAddr: Address = this._motoAddress.value;

        if (u256.lt(motoAmount, this._minInvestment.value)) {
            throw new Revert('Below minimum investment');
        }

        // Pull MOTO from sender to this contract
        this._callTransferFrom(motoAddr, sender, thisAddr, motoAmount);

        // Record pre-swap balances for each component
        const preBals: u256[] = new Array<u256>(count);
        for (let i: u32 = 0; i < count; i++) {
            preBals[i] = this._callBalanceOfExternal(this._components[i].value, thisAddr);
        }

        // Swap MOTO to each component via direct pair interaction
        for (let i: u32 = 0; i < count; i++) {
            const weight: u256 = this._weights[i].value;
            const portion: u256 = SafeMath.div(SafeMath.mul(motoAmount, weight), WEIGHT_BASIS);

            if (u256.gt(portion, u256.Zero)) {
                this._swapViaPair(
                    portion,
                    motoAddr,
                    this._components[i].value,
                    this._pairs[i].value,
                );
            }
        }

        // Record post-swap balances, compute received amounts
        const received: u256[] = new Array<u256>(count);
        for (let i: u32 = 0; i < count; i++) {
            const postBal: u256 = this._callBalanceOfExternal(this._components[i].value, thisAddr);
            received[i] = SafeMath.sub(postBal, preBals[i]);
        }

        // Calculate shares to mint
        const currentSupply: u256 = this._totalSupply.value;
        let shares: u256;

        if (u256.eq(currentSupply, u256.Zero)) {
            shares = motoAmount;
        } else {
            shares = u256.Max;
            for (let i: u32 = 0; i < count; i++) {
                const existing: u256 = preBals[i];
                if (u256.eq(existing, u256.Zero)) {
                    continue;
                }
                const ratio: u256 = SafeMath.div(
                    SafeMath.mul(received[i], currentSupply),
                    existing,
                );
                if (u256.lt(ratio, shares)) {
                    shares = ratio;
                }
            }
            if (u256.eq(shares, u256.Max)) {
                shares = motoAmount;
            }
        }

        if (u256.lt(shares, minSharesOut)) {
            throw new Revert('Slippage: shares below minimum');
        }

        if (u256.eq(shares, u256.Zero)) {
            throw new Revert('Zero shares computed');
        }

        this._mint(sender, shares);

        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(shares);
        return writer;
    }

    // ── redeem(shareAmount: u256, minMotoOut: u256) ──────────────────────
    // Burns shares, swaps all component tokens back to MOTO, sends MOTO to user

    @method(
        { name: 'shareAmount', type: ABIDataTypes.UINT256 },
        { name: 'minMotoOut', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'motoReturned', type: ABIDataTypes.UINT256 })
    public redeem(calldata: Calldata): BytesWriter {
        const shareAmount: u256 = calldata.readU256();
        const minMotoOut: u256 = calldata.readU256();
        const sender: Address = Blockchain.tx.sender;
        const thisAddr: Address = Blockchain.contractAddress;
        const count: u32 = this._componentCount.value.toU32();
        const motoAddr: Address = this._motoAddress.value;

        if (u256.eq(shareAmount, u256.Zero)) {
            throw new Revert('Zero shares');
        }

        const senderBal: u256 = this._balanceOf(sender);
        if (u256.lt(senderBal, shareAmount)) {
            throw new Revert('Insufficient shares');
        }

        const currentSupply: u256 = this._totalSupply.value;

        // Record MOTO balance before swaps
        const motoBalBefore: u256 = this._callBalanceOfExternal(motoAddr, thisAddr);

        // Burn shares first
        this._burn(sender, shareAmount);

        // Swap each component's pro-rata portion back to MOTO
        for (let i: u32 = 0; i < count; i++) {
            const holding: u256 = this._callBalanceOfExternal(this._components[i].value, thisAddr);
            const userAmount: u256 = SafeMath.div(
                SafeMath.mul(holding, shareAmount),
                currentSupply,
            );
            if (u256.gt(userAmount, u256.Zero)) {
                this._swapViaPair(
                    userAmount,
                    this._components[i].value,
                    motoAddr,
                    this._pairs[i].value,
                );
            }
        }

        // Calculate total MOTO received from swaps
        const motoBalAfter: u256 = this._callBalanceOfExternal(motoAddr, thisAddr);
        const motoReturned: u256 = SafeMath.sub(motoBalAfter, motoBalBefore);

        if (u256.lt(motoReturned, minMotoOut)) {
            throw new Revert('Slippage: MOTO below minimum');
        }

        // Transfer MOTO to user
        this._callTransfer(motoAddr, sender, motoReturned);

        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(motoReturned);
        return writer;
    }

    // ── rebalance() ── Admin-only, sells overweight / buys underweight ───

    @method()
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public rebalance(_calldata: Calldata): BytesWriter {
        this._requireOwner();

        const count: u32 = this._componentCount.value.toU32();
        const thisAddr: Address = Blockchain.contractAddress;
        const motoAddr: Address = this._motoAddress.value;

        // Phase 1: Gather holdings and MOTO values
        const holdings: u256[] = new Array<u256>(count);
        const motoValues: u256[] = new Array<u256>(count);
        let totalMotoValue: u256 = u256.Zero;

        for (let i: u32 = 0; i < count; i++) {
            holdings[i] = this._callBalanceOfExternal(this._components[i].value, thisAddr);

            const pairInfo: PairInfo = this._getPairInfo(this._pairs[i].value, motoAddr);

            if (u256.gt(holdings[i], u256.Zero) && u256.gt(pairInfo.reserveComp, u256.Zero)) {
                motoValues[i] = SafeMath.div(
                    SafeMath.mul(holdings[i], pairInfo.reserveMoto),
                    pairInfo.reserveComp,
                );
            } else {
                motoValues[i] = u256.Zero;
            }
            totalMotoValue = SafeMath.add(totalMotoValue, motoValues[i]);
        }

        if (u256.eq(totalMotoValue, u256.Zero)) {
            throw new Revert('Nothing to rebalance');
        }

        // Phase 2: Sell overweight components (component → MOTO)
        for (let i: u32 = 0; i < count; i++) {
            const targetValue: u256 = SafeMath.div(
                SafeMath.mul(totalMotoValue, this._weights[i].value),
                WEIGHT_BASIS,
            );
            if (u256.gt(motoValues[i], targetValue)) {
                const excessMoto: u256 = SafeMath.sub(motoValues[i], targetValue);
                const pairInfo: PairInfo = this._getPairInfo(this._pairs[i].value, motoAddr);
                if (u256.gt(pairInfo.reserveMoto, u256.Zero)) {
                    const compToSell: u256 = SafeMath.div(
                        SafeMath.mul(excessMoto, pairInfo.reserveComp),
                        pairInfo.reserveMoto,
                    );
                    if (u256.gt(compToSell, u256.Zero) && u256.le(compToSell, holdings[i])) {
                        this._swapViaPair(
                            compToSell,
                            this._components[i].value,
                            motoAddr,
                            this._pairs[i].value,
                        );
                    }
                }
            }
        }

        // Phase 3: Buy underweight components (MOTO → component)
        const motoAvailable: u256 = this._callBalanceOfExternal(motoAddr, thisAddr);
        if (u256.gt(motoAvailable, u256.Zero)) {
            // Recompute underweight deficits
            let totalDeficit: u256 = u256.Zero;
            const deficits: u256[] = new Array<u256>(count);

            for (let i: u32 = 0; i < count; i++) {
                const targetValue: u256 = SafeMath.div(
                    SafeMath.mul(totalMotoValue, this._weights[i].value),
                    WEIGHT_BASIS,
                );
                if (u256.lt(motoValues[i], targetValue)) {
                    deficits[i] = SafeMath.sub(targetValue, motoValues[i]);
                    totalDeficit = SafeMath.add(totalDeficit, deficits[i]);
                } else {
                    deficits[i] = u256.Zero;
                }
            }

            if (u256.gt(totalDeficit, u256.Zero)) {
                for (let i: u32 = 0; i < count; i++) {
                    if (u256.gt(deficits[i], u256.Zero)) {
                        // Proportional share of available MOTO
                        const motoToSpend: u256 = SafeMath.div(
                            SafeMath.mul(motoAvailable, deficits[i]),
                            totalDeficit,
                        );
                        if (u256.gt(motoToSpend, u256.Zero)) {
                            this._swapViaPair(
                                motoToSpend,
                                motoAddr,
                                this._components[i].value,
                                this._pairs[i].value,
                            );
                        }
                    }
                }
            }
        }

        this._lastRebalanceBlock.value = u256.fromU64(Blockchain.block.number);

        const writer: BytesWriter = new BytesWriter(0);
        return writer;
    }

    // ── updateWeights(count, weight0, weight1, ...) ── Admin-only ────────

    @method(
        { name: 'count', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public updateWeights(calldata: Calldata): BytesWriter {
        this._requireOwner();

        const count: u32 = calldata.readU256().toU32();
        const storedCount: u32 = this._componentCount.value.toU32();

        if (count != storedCount) {
            throw new Revert('Count mismatch');
        }

        let weightSum: u256 = u256.Zero;
        for (let i: u32 = 0; i < count; i++) {
            const weight: u256 = calldata.readU256();
            if (u256.eq(weight, u256.Zero)) {
                throw new Revert('Weight cannot be zero');
            }
            this._weights[i].value = weight;
            weightSum = SafeMath.add(weightSum, weight);
        }

        if (!u256.eq(weightSum, WEIGHT_BASIS)) {
            throw new Revert('Weights must sum to 10000');
        }

        const writer: BytesWriter = new BytesWriter(0);
        return writer;
    }

    // ── updatePair(componentIndex, newPairAddr) ── Admin-only ────────────

    @method(
        { name: 'componentIndex', type: ABIDataTypes.UINT256 },
        { name: 'newPairAddr', type: ABIDataTypes.ADDRESS },
    )
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public updatePair(calldata: Calldata): BytesWriter {
        this._requireOwner();

        const idx: u32 = calldata.readU256().toU32();
        const newPair: Address = calldata.readAddress();
        const count: u32 = this._componentCount.value.toU32();

        if (idx >= count) {
            throw new Revert('Index out of bounds');
        }

        if (newPair.isZero()) {
            throw new Revert('Pair address cannot be zero');
        }

        this._pairs[idx].value = newPair;

        const writer: BytesWriter = new BytesWriter(0);
        return writer;
    }

    // ── setMinInvestment(amount) ── Admin-only ───────────────────────────

    @method(
        { name: 'amount', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public setMinInvestment(calldata: Calldata): BytesWriter {
        this._requireOwner();

        const amount: u256 = calldata.readU256();
        this._minInvestment.value = amount;

        const writer: BytesWriter = new BytesWriter(0);
        return writer;
    }

    // ── Read methods ─────────────────────────────────────────────────────

    @method()
    @returns({ name: 'count', type: ABIDataTypes.UINT256 })
    public getComponentCount(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(this._componentCount.value);
        return writer;
    }

    @method(
        { name: 'index', type: ABIDataTypes.UINT256 },
    )
    @returns(
        { name: 'token', type: ABIDataTypes.ADDRESS },
        { name: 'weight', type: ABIDataTypes.UINT256 },
        { name: 'pair', type: ABIDataTypes.ADDRESS },
    )
    public getComponent(calldata: Calldata): BytesWriter {
        const index: u32 = calldata.readU256().toU32();
        const count: u32 = this._componentCount.value.toU32();

        if (index >= count) {
            throw new Revert('Index out of bounds');
        }

        const writer: BytesWriter = new BytesWriter(96);
        writer.writeAddress(this._components[index].value);
        writer.writeU256(this._weights[index].value);
        writer.writeAddress(this._pairs[index].value);
        return writer;
    }

    @method(
        { name: 'index', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'amount', type: ABIDataTypes.UINT256 })
    public getHolding(calldata: Calldata): BytesWriter {
        const index: u32 = calldata.readU256().toU32();
        const count: u32 = this._componentCount.value.toU32();

        if (index >= count) {
            throw new Revert('Index out of bounds');
        }

        const holding: u256 = this._callBalanceOfExternal(
            this._components[index].value,
            Blockchain.contractAddress,
        );

        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(holding);
        return writer;
    }

    @method()
    @returns({ name: 'curator', type: ABIDataTypes.ADDRESS })
    public getCurator(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(32);
        writer.writeAddress(this._curator.value);
        return writer;
    }

    @method()
    @returns({ name: 'blockNumber', type: ABIDataTypes.UINT256 })
    public getLastRebalanceBlock(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(this._lastRebalanceBlock.value);
        return writer;
    }

    @method()
    @returns({ name: 'amount', type: ABIDataTypes.UINT256 })
    public getMinInvestment(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(this._minInvestment.value);
        return writer;
    }

    @method()
    @returns({ name: 'owner', type: ABIDataTypes.ADDRESS })
    public getOwner(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(32);
        writer.writeAddress(this._owner.value);
        return writer;
    }

    @method()
    @returns({ name: 'moto', type: ABIDataTypes.ADDRESS })
    public getMotoAddress(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(32);
        writer.writeAddress(this._motoAddress.value);
        return writer;
    }

    // ── Direct pair swap (bypasses Router) ────────────────────────────────

    private _swapViaPair(
        amountIn: u256,
        tokenIn: Address,
        tokenOut: Address,
        pairAddr: Address,
    ): void {
        // 1. Query token0 from the pair
        const t0Writer: BytesWriter = new BytesWriter(4);
        t0Writer.writeSelector(SEL_TOKEN0);
        const t0Result = Blockchain.call(pairAddr, t0Writer, true);

        if (t0Result.data.byteLength < 32) {
            throw new Revert('token0: response too short');
        }

        const pairToken0: Address = t0Result.data.readAddress();
        const tokenInIsToken0: bool = tokenIn.equals(pairToken0);

        // 2. Get reserves from pair
        const resWriter: BytesWriter = new BytesWriter(4);
        resWriter.writeSelector(SEL_GET_RESERVES);
        const resResult = Blockchain.call(pairAddr, resWriter, true);

        if (resResult.data.byteLength < 64) {
            throw new Revert('getReserves: response too short');
        }

        const reserve0: u256 = resResult.data.readU256();
        const reserve1: u256 = resResult.data.readU256();

        let reserveIn: u256;
        let reserveOut: u256;
        if (tokenInIsToken0) {
            reserveIn = reserve0;
            reserveOut = reserve1;
        } else {
            reserveIn = reserve1;
            reserveOut = reserve0;
        }

        // 3. Compute output amount (MotoSwap 0.5% fee: 995/1000)
        const amountInWithFee: u256 = SafeMath.mul(amountIn, FEE_NUMERATOR);
        const numerator: u256 = SafeMath.mul(amountInWithFee, reserveOut);
        const denominator: u256 = SafeMath.add(
            SafeMath.mul(reserveIn, FEE_DENOMINATOR),
            amountInWithFee,
        );
        const amountOut: u256 = SafeMath.div(numerator, denominator);

        if (u256.eq(amountOut, u256.Zero)) {
            throw new Revert('Insufficient output amount');
        }

        // 4. Transfer input tokens directly to pair contract
        this._callTransfer(tokenIn, pairAddr, amountIn);

        // 5. Call pair.swap to execute the trade
        let amount0Out: u256;
        let amount1Out: u256;
        if (tokenInIsToken0) {
            amount0Out = u256.Zero;
            amount1Out = amountOut;
        } else {
            amount0Out = amountOut;
            amount1Out = u256.Zero;
        }

        const swapWriter: BytesWriter = new BytesWriter(104);
        swapWriter.writeSelector(SEL_PAIR_SWAP);
        swapWriter.writeU256(amount0Out);
        swapWriter.writeU256(amount1Out);
        swapWriter.writeAddress(Blockchain.contractAddress);
        swapWriter.writeU32(0); // empty bytes length
        Blockchain.call(pairAddr, swapWriter, true);
    }

    // ── Helper: get pair reserves split by MOTO/component ────────────────

    private _getPairInfo(pairAddr: Address, motoAddr: Address): PairInfo {
        const t0Writer: BytesWriter = new BytesWriter(4);
        t0Writer.writeSelector(SEL_TOKEN0);
        const t0Result = Blockchain.call(pairAddr, t0Writer, true);
        const pairToken0: Address = t0Result.data.readAddress();

        const resWriter: BytesWriter = new BytesWriter(4);
        resWriter.writeSelector(SEL_GET_RESERVES);
        const resResult = Blockchain.call(pairAddr, resWriter, true);
        const reserve0: u256 = resResult.data.readU256();
        const reserve1: u256 = resResult.data.readU256();

        const motoIsToken0: bool = motoAddr.equals(pairToken0);
        return new PairInfo(
            motoIsToken0 ? reserve0 : reserve1,
            motoIsToken0 ? reserve1 : reserve0,
        );
    }

    // ── Cross-contract call helpers ──────────────────────────────────────

    private _callTransferFrom(token: Address, from: Address, to: Address, amount: u256): void {
        const writer: BytesWriter = new BytesWriter(100);
        writer.writeSelector(SEL_TRANSFER_FROM);
        writer.writeAddress(from);
        writer.writeAddress(to);
        writer.writeU256(amount);
        Blockchain.call(token, writer, true);
    }

    private _callTransfer(token: Address, to: Address, amount: u256): void {
        const writer: BytesWriter = new BytesWriter(68);
        writer.writeSelector(SEL_TRANSFER);
        writer.writeAddress(to);
        writer.writeU256(amount);
        Blockchain.call(token, writer, true);
    }

    private _callBalanceOfExternal(token: Address, account: Address): u256 {
        const writer: BytesWriter = new BytesWriter(36);
        writer.writeSelector(SEL_BALANCE_OF);
        writer.writeAddress(account);
        const result = Blockchain.call(token, writer, true);
        if (result.data.byteLength < 32) {
            throw new Revert('balanceOf: response too short');
        }
        return result.data.readU256();
    }

    // ── Access control ───────────────────────────────────────────────────

    private _requireOwner(): void {
        if (!Blockchain.tx.sender.equals(this._owner.value)) {
            throw new Revert('Not owner');
        }
    }
}

// Helper class for pair reserve data
class PairInfo {
    constructor(
        public reserveMoto: u256,
        public reserveComp: u256,
    ) {}
}
