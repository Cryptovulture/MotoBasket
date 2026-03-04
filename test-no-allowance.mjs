/**
 * Test: simulate invest with a fresh address (no allowance) to see what error we get.
 * If we get "Motoswap: K" instead of "Insufficient allowance", that confirms
 * the frontend chaining bug.
 */
import { Mnemonic, AddressTypes, Address } from '@btc-vision/transaction';
import { MLDSASecurityLevel } from '@btc-vision/bip32';
import { networks, crypto as btcCrypto } from '@btc-vision/bitcoin';
import { JSONRpcProvider, getContract, OP_20_ABI, BitcoinAbiTypes } from 'opnet';
import { ABIDataTypes } from '@btc-vision/transaction';

const NETWORK = networks.opnetTestnet;
const RPC_URL = 'https://testnet.opnet.org';

// Use a DIFFERENT mnemonic so this address has zero allowance
const FRESH_WORDS = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const OPAI = '0x1c625456bc60c28d590dc2419ba649a4a8215a21a51454c637410ea580232eb8';

const INDEX_ABI = [
  ...OP_20_ABI,
  {
    name: 'invest',
    inputs: [
      { name: 'motoAmount', type: ABIDataTypes.UINT256 },
      { name: 'minSharesOut', type: ABIDataTypes.UINT256 },
    ],
    outputs: [],
    type: BitcoinAbiTypes.Function,
  },
];

const m = new Mnemonic(FRESH_WORDS, '', NETWORK, MLDSASecurityLevel.LEVEL2);
const wallet = m.deriveOPWallet(AddressTypes.P2TR, 0);
const mldsaPub = wallet.mldsaKeypair.publicKey;
const mldsaHash = Buffer.from(btcCrypto.sha256(Buffer.from(mldsaPub))).toString('hex');
const ecPubHex = Buffer.from(wallet.keypair.publicKey).toString('hex');
const freshAddress = Address.fromString(mldsaHash, ecPubHex);

const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
const amount = 10n * 10n ** 18n;

console.log('Testing invest with FRESH address (no MOTO, no allowance)...\n');

try {
  const c = getContract(OPAI, INDEX_ABI, provider, NETWORK, freshAddress);
  const sim = await c.invest(amount, 0n);
  if (sim.revert) {
    console.log('REVERT:', sim.revert);
  } else {
    console.log('SIM OK (unexpected!)');
  }
} catch (e) {
  console.log('ERROR:', e.message?.substring(0, 300));
}
