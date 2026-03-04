// Quick test script to probe on-chain state and diagnose "Motoswap: K" error
const RPC = 'https://testnet.opnet.org/api/v1/json-rpc';
let id = 0;

async function rpc(method, params) {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  });
  return (await r.json()).result;
}

function b64toHex(b64) {
  const buf = Buffer.from(b64, 'base64');
  return buf.toString('hex');
}

async function btcCall(to, data) {
  const res = await rpc('btc_call', [to.startsWith('0x') ? to : '0x' + to, data]);
  if (res?.revert) throw new Error('Revert: ' + res.revert);
  if (res?.error) throw new Error('Error: ' + JSON.stringify(res.error));
  if (!res?.result) return '';
  return b64toHex(res.result);
}

function decU256(hex, offset = 0) {
  const s = hex.slice(offset * 2, offset * 2 + 64);
  return BigInt('0x' + (s || '0'));
}

function decAddr(hex, offset = 0) {
  return '0x' + hex.slice(offset * 2, offset * 2 + 64);
}

function encU256(n) {
  return BigInt(n).toString(16).padStart(64, '0');
}

function encAddr(addr) {
  return addr.replace('0x', '').padStart(64, '0');
}

// Selectors
const SEL = {
  getComponent: 'b0749109',
  getComponentCount: '9d33844c',
  getHolding: '69b8232d',
  getMotoAddress: 'f75a1678',
  getReserves: '06374bfc',
  token0: '3c1f365f',
  balanceOf: '5b46f8f6',
  getPool: '00bdc06a',
  totalSupply: 'a368022e',
};

const OPAI = '0x725f25c622f943b50e5f53bb774863a4ad4611ffbbeb3ffc9501c796d7966721';
const MOTO = '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';
const FACTORY = '0xa02aa5ca4c307107484d5fb690d811df1cf526f8de204d24528653dcae369a0f';

async function main() {
  console.log('=== OPAI Index Contract Diagnostics ===\n');

  // 1. Get MOTO address from contract
  const motoHex = await btcCall(OPAI, SEL.getMotoAddress);
  const motoStored = decAddr(motoHex, 0);
  console.log('MOTO stored in contract:', motoStored);
  console.log('MOTO expected:          ', MOTO);
  console.log('Match:', motoStored.toLowerCase() === MOTO.toLowerCase());

  // 2. Get component count
  const countHex = await btcCall(OPAI, SEL.getComponentCount);
  const count = Number(decU256(countHex));
  console.log('\nComponent count:', count);

  // 3. For each component, check stored data
  for (let i = 0; i < count; i++) {
    console.log(`\n--- Component ${i} ---`);
    const compHex = await btcCall(OPAI, SEL.getComponent + encU256(i));
    const tokenAddr = decAddr(compHex, 0);
    const weight = Number(decU256(compHex, 32));
    const pairAddr = decAddr(compHex, 64);

    console.log('  Token:', tokenAddr);
    console.log('  Weight:', weight, 'bps');
    console.log('  Pair:', pairAddr);

    // Check pair exists (not zero)
    if (pairAddr === '0x' + '0'.repeat(64)) {
      console.log('  *** PAIR IS ZERO ADDRESS! ***');
      continue;
    }

    // Check token0 of pair
    try {
      const t0Hex = await btcCall(pairAddr, SEL.token0);
      const token0 = decAddr(t0Hex, 0);
      console.log('  Pair token0:', token0);
      const motoIsT0 = token0.toLowerCase() === MOTO.toLowerCase();
      console.log('  MOTO is token0:', motoIsT0);

      // Check reserves
      const resHex = await btcCall(pairAddr, SEL.getReserves);
      const r0 = decU256(resHex, 0);
      const r1 = decU256(resHex, 32);
      console.log('  Reserve0:', r0.toString(), `(${Number(r0) / 1e18} tokens)`);
      console.log('  Reserve1:', r1.toString(), `(${Number(r1) / 1e18} tokens)`);

      const reserveMoto = motoIsT0 ? r0 : r1;
      const reserveComp = motoIsT0 ? r1 : r0;
      console.log('  ReserveMOTO:', Number(reserveMoto) / 1e18);
      console.log('  ReserveCOMP:', Number(reserveComp) / 1e18);

      // Simulate the swap math for 20 MOTO (1/5 of 100 MOTO with equal weights)
      const amountIn = 20n * 10n**18n;
      const amountInWithFee = amountIn * 995n;
      const num = amountInWithFee * reserveComp;
      const den = reserveMoto * 1000n + amountInWithFee;
      const amountOut = num / den;
      console.log('  Swap 20 MOTO → ', Number(amountOut) / 1e18, 'tokens');

      // Verify K
      const balance0After = (motoIsT0 ? r0 + amountIn : r0 - amountOut);
      const balance1After = (motoIsT0 ? r1 - amountOut : r1 + amountIn);
      const amt0In = motoIsT0 ? amountIn : 0n;
      const amt1In = motoIsT0 ? 0n : amountIn;
      const b0Adj = balance0After * 1000n - amt0In * 5n;
      const b1Adj = balance1After * 1000n - amt1In * 5n;
      const kNew = b0Adj * b1Adj;
      const kOld = r0 * r1 * 1000000n;
      console.log('  K_new >= K_old:', kNew >= kOld, `(diff: ${kNew - kOld})`);

      // Also verify: what does the factory say the pool is?
      try {
        const poolHex = await btcCall(FACTORY, SEL.getPool + encAddr(MOTO) + encAddr(tokenAddr));
        const factoryPool = decAddr(poolHex, 0);
        console.log('  Factory pool:', factoryPool);
        console.log('  Matches stored pair:', factoryPool.toLowerCase() === pairAddr.toLowerCase());
      } catch (e) {
        console.log('  Factory lookup failed:', e.message);
      }

    } catch (e) {
      console.log('  *** Pair call failed:', e.message, '***');
    }
  }

  // 4. Check OPAI totalSupply
  const supplyHex = await btcCall(OPAI, SEL.totalSupply);
  console.log('\nOPAI totalSupply:', decU256(supplyHex).toString());
}

main().catch(console.error);
