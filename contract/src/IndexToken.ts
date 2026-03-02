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
const MAX_COMPONENTS: u32 = 5;

// Weight basis points — all weights must sum to this
const WEIGHT_BASIS: u256 = u256.fromU32(10000);

// Default minimum investment: 10 MOTO (18 decimals)
const DEFAULT_MIN_INVESTMENT: u256 = u256.fromString('10000000000000000000');

// AMM constants (MotoSwap pool: 0.3% fee, standard Uniswap V2)
const FEE_NUMERATOR: u256 = u256.fromU32(997);
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
    // ── Storage pointers ─────────────────────────────────────────────────
    private readonly motoAddressPointer: u16 = Blockchain.nextPointer;
    private readonly componentCountPointer: u16 = Blockchain.nextPointer;
    private readonly minInvestmentPointer: u16 = Blockchain.nextPointer;

    // Component addresses (5 slots)
    private readonly comp0Pointer: u16 = Blockchain.nextPointer;
    private readonly comp1Pointer: u16 = Blockchain.nextPointer;
    private readonly comp2Pointer: u16 = Blockchain.nextPointer;
    private readonly comp3Pointer: u16 = Blockchain.nextPointer;
    private readonly comp4Pointer: u16 = Blockchain.nextPointer;

    // Component weights (5 slots)
    private readonly weight0Pointer: u16 = Blockchain.nextPointer;
    private readonly weight1Pointer: u16 = Blockchain.nextPointer;
    private readonly weight2Pointer: u16 = Blockchain.nextPointer;
    private readonly weight3Pointer: u16 = Blockchain.nextPointer;
    private readonly weight4Pointer: u16 = Blockchain.nextPointer;

    // Pair addresses for MOTO/component (5 slots)
    private readonly pair0Pointer: u16 = Blockchain.nextPointer;
    private readonly pair1Pointer: u16 = Blockchain.nextPointer;
    private readonly pair2Pointer: u16 = Blockchain.nextPointer;
    private readonly pair3Pointer: u16 = Blockchain.nextPointer;
    private readonly pair4Pointer: u16 = Blockchain.nextPointer;

    // ── Storage instances ───────────────────────────────────────────────
    private _motoAddress: StoredAddress = new StoredAddress(this.motoAddressPointer);
    private _componentCount: StoredU256 = new StoredU256(this.componentCountPointer, EMPTY_POINTER);
    private _minInvestment: StoredU256 = new StoredU256(this.minInvestmentPointer, EMPTY_POINTER);

    private _components: StoredAddress[] = [
        new StoredAddress(this.comp0Pointer),
        new StoredAddress(this.comp1Pointer),
        new StoredAddress(this.comp2Pointer),
        new StoredAddress(this.comp3Pointer),
        new StoredAddress(this.comp4Pointer),
    ];

    private _weights: StoredU256[] = [
        new StoredU256(this.weight0Pointer, EMPTY_POINTER),
        new StoredU256(this.weight1Pointer, EMPTY_POINTER),
        new StoredU256(this.weight2Pointer, EMPTY_POINTER),
        new StoredU256(this.weight3Pointer, EMPTY_POINTER),
        new StoredU256(this.weight4Pointer, EMPTY_POINTER),
    ];

    private _pairs: StoredAddress[] = [
        new StoredAddress(this.pair0Pointer),
        new StoredAddress(this.pair1Pointer),
        new StoredAddress(this.pair2Pointer),
        new StoredAddress(this.pair3Pointer),
        new StoredAddress(this.pair4Pointer),
    ];

    public constructor() {
        super();
    }

    // ── Deployment ──────────────────────────────────────────────────────

    public override onDeployment(calldata: Calldata): void {
        const name: string = calldata.readStringWithLength();
        const symbol: string = calldata.readStringWithLength();
        const motoAddr: Address = calldata.readAddress();
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

        this.instantiate(new OP20InitParameters(
            u256.Max,
            18,
            name,
            symbol,
        ));
    }

    // ── invest(motoAmount: u256, minSharesOut: u256) ────────────────────

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

    // ── redeem(shareAmount: u256) ───────────────────────────────────────

    @method(
        { name: 'shareAmount', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public redeem(calldata: Calldata): BytesWriter {
        const shareAmount: u256 = calldata.readU256();
        const sender: Address = Blockchain.tx.sender;
        const thisAddr: Address = Blockchain.contractAddress;
        const count: u32 = this._componentCount.value.toU32();

        if (u256.eq(shareAmount, u256.Zero)) {
            throw new Revert('Zero shares');
        }

        const senderBal: u256 = this._balanceOf(sender);
        if (u256.lt(senderBal, shareAmount)) {
            throw new Revert('Insufficient shares');
        }

        const currentSupply: u256 = this._totalSupply.value;
        this._burn(sender, shareAmount);

        for (let i: u32 = 0; i < count; i++) {
            const holding: u256 = this._callBalanceOfExternal(this._components[i].value, thisAddr);
            const userAmount: u256 = SafeMath.div(
                SafeMath.mul(holding, shareAmount),
                currentSupply,
            );
            if (u256.gt(userAmount, u256.Zero)) {
                this._callTransfer(this._components[i].value, sender, userAmount);
            }
        }

        const writer: BytesWriter = new BytesWriter(0);
        return writer;
    }

    // ── Read methods ────────────────────────────────────────────────────

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
    )
    public getComponent(calldata: Calldata): BytesWriter {
        const index: u32 = calldata.readU256().toU32();
        const count: u32 = this._componentCount.value.toU32();

        if (index >= count) {
            throw new Revert('Index out of bounds');
        }

        const writer: BytesWriter = new BytesWriter(64);
        writer.writeAddress(this._components[index].value);
        writer.writeU256(this._weights[index].value);
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

    // ── Direct pair swap (bypasses Router) ───────────────────────────────

    private _swapViaPair(
        amountIn: u256,
        tokenIn: Address,
        tokenOut: Address,
        pairAddr: Address,
    ): void {
        // 1. Query token0 from the pair directly (don't rely on Address comparison)
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

        // 3. Compute output amount (Uniswap V2 AMM formula with 0.3% fee)
        // amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
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

        // swap(uint256,uint256,address,bytes) — 4 + 32 + 32 + 32 + 4 = 104
        const swapWriter: BytesWriter = new BytesWriter(104);
        swapWriter.writeSelector(SEL_PAIR_SWAP);
        swapWriter.writeU256(amount0Out);
        swapWriter.writeU256(amount1Out);
        swapWriter.writeAddress(Blockchain.contractAddress);
        swapWriter.writeU32(0); // empty bytes length (u32, matches readBytesWithLength)

        Blockchain.call(pairAddr, swapWriter, true);
    }

    // ── Cross-contract call helpers ─────────────────────────────────────

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
}
