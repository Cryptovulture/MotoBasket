/**
 * Quick check of all index positions and allowances
 */
import { Mnemonic, AddressTypes, Address } from '@btc-vision/transaction';
import { MLDSASecurityLevel } from '@btc-vision/bip32';
import { networks, crypto as btcCrypto } from '@btc-vision/bitcoin';
import { JSONRpcProvider, getContract, OP_20_ABI } from 'opnet';

const NETWORK = networks.opnetTestnet;
const RPC_URL = 'https://testnet.opnet.org';
const RPC_ENDPOINT = `${RPC_URL}/api/v1/json-rpc`;
const WORDS = 'section middle cake piano brand doctor marine private pass easily immense sun';
const MOTO_HEX = '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';

const INDEXES = [
  { symbol: 'OPAI', addr: '0x1c625456bc60c28d590dc2419ba649a4a8215a21a51454c637410ea580232eb8' },
  { symbol: 'OPMEME', addr: '0x2f8c7fb147949a5bc95f6832a1c1ae7446ced4c5a3a7b3270160a3dc5a5836dd' },
  { symbol: 'OPDEFI', addr: '0xae2575d734f9e6dcba8d2dc8534497b0eed4d563b4ef6360075b2a135400eead' },
  { symbol: 'OPGAME', addr: '0x0e1a2cc9f3c32c6ed08a50f5fa9f0c6fa13624e44d15f932c453c2801e57815c' },
  { symbol: 'OPINFRA', addr: '0xcc5a01846610a268856b0677ad0550a42f9d81fe04ed757fc39595bd6965bf2c' },
  { symbol: 'ANSEM', addr: '0x024379a677871f98836b91eeed15468c2213d7ef3df1e1dbd9303739c9edb5b7' },
  { symbol: 'CHAD', addr: '0xc2d24557a1237cced807b9deb531627a4ac4884063891f63967f093b85c67c65' },
  { symbol: 'DANNY', addr: '0xf1c011543071351c09380fac3fd7844c383ead53d68c9206fdc1bf77029534fe' },
  { symbol: 'GCR', addr: '0xf1f84e8794a03e66274fee486fb3602f7b88ae78e725401e5ef17bd75e621a0a' },
  { symbol: 'VULTURE', addr: '0x03e9be2c2f770cb643021f06bbfa6c32baf6514daf5dfc0bad4099ed854a44ad' },
];

function deriveWallet() {
  const m = new Mnemonic(WORDS, '', NETWORK, MLDSASecurityLevel.LEVEL2);
  const wallet = m.deriveOPWallet(AddressTypes.P2TR, 0);
  const mldsaPub = wallet.mldsaKeypair.publicKey;
  const mldsaHash = Buffer.from(btcCrypto.sha256(Buffer.from(mldsaPub))).toString('hex');
  const ecPubHex = Buffer.from(wallet.keypair.publicKey).toString('hex');
  const senderAddress = Address.fromString(mldsaHash, ecPubHex);
  return { senderAddress };
}

async function main() {
  const { senderAddress } = deriveWallet();
  const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

  // Block number
  const resp = await fetch(RPC_ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_blockNumber', params: [], id: 1 }),
  });
  const block = parseInt((await resp.json()).result, 16);
  console.log(`Block: ${block}\n`);

  // MOTO balance
  const moto = getContract(MOTO_HEX, OP_20_ABI, provider, NETWORK, senderAddress);
  const motoBal = await moto.balanceOf(senderAddress);
  console.log(`MOTO balance: ${(Number(motoBal?.properties?.balance ?? 0n) / 1e18).toFixed(2)}\n`);

  // All indexes
  console.log('Index     Shares          Allowance');
  console.log('────────  ──────────────  ──────────────');
  for (const idx of INDEXES) {
    const c = getContract(idx.addr, OP_20_ABI, provider, NETWORK, senderAddress);
    let shares = '?', allow = '?';
    try {
      const res = await c.balanceOf(senderAddress);
      shares = (Number(res?.properties?.balance ?? 0n) / 1e18).toFixed(2);
    } catch {}
    try {
      const moto2 = getContract(MOTO_HEX, OP_20_ABI, provider, NETWORK, senderAddress);
      const spender = Address.fromString(idx.addr);
      const res = await moto2.allowance(senderAddress, spender);
      allow = (Number(res?.properties?.remaining ?? 0n) / 1e18).toFixed(0);
    } catch {}
    console.log(`${idx.symbol.padEnd(10)}${shares.padStart(14)}  ${allow.padStart(14)}`);
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
