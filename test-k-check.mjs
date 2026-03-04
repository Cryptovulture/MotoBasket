/**
 * Quick diagnostic: test invest simulation on multiple indexes to check for K invariant errors.
 */
import { Mnemonic, AddressTypes, Address } from '@btc-vision/transaction';
import { MLDSASecurityLevel } from '@btc-vision/bip32';
import { networks, crypto as btcCrypto } from '@btc-vision/bitcoin';
import { JSONRpcProvider, getContract, OP_20_ABI, BitcoinAbiTypes } from 'opnet';
import { ABIDataTypes } from '@btc-vision/transaction';

const NETWORK = networks.opnetTestnet;
const RPC_URL = 'https://testnet.opnet.org';
const WORDS = 'section middle cake piano brand doctor marine private pass easily immense sun';

const INDEXES = {
  OPAI: '0x1c625456bc60c28d590dc2419ba649a4a8215a21a51454c637410ea580232eb8',
  OPMEME: '0x2f8c7fb147949a5bc95f6832a1c1ae7446ced4c5a3a7b3270160a3dc5a5836dd',
  OPDEFI: '0xae2575d734f9e6dcba8d2dc8534497b0eed4d563b4ef6360075b2a135400eead',
  OPGAME: '0x0e1a2cc9f3c32c6ed08a50f5fa9f0c6fa13624e44d15f932c453c2801e57815c',
  OPINFRA: '0xcc5a01846610a268856b0677ad0550a42f9d81fe04ed757fc39595bd6965bf2c',
  ANSEM: '0x024379a677871f98836b91eeed15468c2213d7ef3df1e1dbd9303739c9edb5b7',
  CHAD: '0xc2d24557a1237cced807b9deb531627a4ac4884063891f63967f093b85c67c65',
  DANNY: '0xf1c011543071351c09380fac3fd7844c383ead53d68c9206fdc1bf77029534fe',
  GCR: '0xf1f84e8794a03e66274fee486fb3602f7b88ae78e725401e5ef17bd75e621a0a',
  VULTURE: '0x03e9be2c2f770cb643021f06bbfa6c32baf6514daf5dfc0bad4099ed854a44ad',
};

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
  const amount = 10n * 10n ** 18n;

  console.log('Testing invest simulation (10 MOTO each)...\n');

  for (const [sym, addr] of Object.entries(INDEXES)) {
    try {
      const c = getContract(addr, INDEX_ABI, provider, NETWORK, senderAddress);
      const sim = await c.invest(amount, 0n);
      if (sim.revert) {
        console.log(`${sym}: REVERT - ${sim.revert}`);
      } else if (sim.calldata && sim.calldata.length === 1) {
        console.log(`${sym}: SILENT VM ABORT`);
      } else {
        console.log(`${sym}: SIM OK (gas: ${sim.estimatedGas})`);
      }
    } catch (e) {
      console.log(`${sym}: ERROR - ${e.message?.substring(0, 200)}`);
    }
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
