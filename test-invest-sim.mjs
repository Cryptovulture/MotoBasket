// Test script to verify the new OPAI contract works correctly
// Run after contract confirms: node test-invest-sim.mjs
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
  return Buffer.from(b64, 'base64').toString('hex');
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

// Selectors
const SEL = {
  getComponent: 'b0749109',
  getComponentCount: '9d33844c',
  getHolding: '69b8232d',
  getMotoAddress: 'f75a1678',
  getReserves: '06374bfc',
  token0: '3c1f365f',
  balanceOf: '5b46f8f6',
  totalSupply: 'a368022e',
  getOwner: 'b0f28093',
};

const OPAI_NEW = '0xf7351c9eb78fb4c2098e9c8830fea503245a83fc84db171f3531b4dd3aa78196';
const MOTO = '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';

async function main() {
  console.log('=== New OPAI Contract Verification ===\n');
  console.log('Address:', OPAI_NEW);

  // 1. Check bytecode exists
  try {
    const code = await rpc('btc_getCode', [OPAI_NEW]);
    if (!code?.bytecode || code.bytecode.length < 10) {
      console.log('CONTRACT NOT YET CONFIRMED. Try again later.');
      return;
    }
    console.log('Bytecode: OK (' + code.bytecode.length + ' chars)\n');
  } catch (e) {
    console.log('Contract not found:', e.message);
    return;
  }

  // 2. Check MOTO address
  const motoHex = await btcCall(OPAI_NEW, SEL.getMotoAddress);
  const motoStored = decAddr(motoHex, 0);
  console.log('MOTO stored:', motoStored);
  console.log('MOTO match:', motoStored.toLowerCase() === MOTO.toLowerCase());

  // 3. Component count
  const countHex = await btcCall(OPAI_NEW, SEL.getComponentCount);
  const count = Number(decU256(countHex));
  console.log('Components:', count);

  // 4. Total supply
  const supplyHex = await btcCall(OPAI_NEW, SEL.totalSupply);
  console.log('TotalSupply:', decU256(supplyHex).toString());

  // 5. Each component
  for (let i = 0; i < count; i++) {
    const compData = await btcCall(OPAI_NEW, SEL.getComponent + BigInt(i).toString(16).padStart(64, '0'));
    const tokenAddr = decAddr(compData, 0);
    const weight = Number(decU256(compData, 32));
    const pairAddr = decAddr(compData, 64);
    console.log(`\nComponent ${i}: weight=${weight}bps`);
    console.log('  Token:', tokenAddr);
    console.log('  Pair:', pairAddr);

    if (pairAddr === '0x' + '0'.repeat(64)) {
      console.log('  *** ZERO PAIR! ***');
      continue;
    }

    // Check reserves
    try {
      const resHex = await btcCall(pairAddr, SEL.getReserves);
      const r0 = decU256(resHex, 0);
      const r1 = decU256(resHex, 32);

      const t0Hex = await btcCall(pairAddr, SEL.token0);
      const pairToken0 = decAddr(t0Hex, 0);
      const motoIsT0 = pairToken0.toLowerCase() !== tokenAddr.toLowerCase();
      const reserveMoto = motoIsT0 ? r0 : r1;
      const reserveComp = motoIsT0 ? r1 : r0;
      console.log('  ReserveMOTO:', (Number(reserveMoto) / 1e18).toFixed(2));
      console.log('  ReserveCOMP:', (Number(reserveComp) / 1e18).toFixed(2));
    } catch (e) {
      console.log('  Reserves error:', e.message);
    }
  }

  console.log('\n=== Contract verified. Ready for invest test. ===');
}

main().catch(console.error);
