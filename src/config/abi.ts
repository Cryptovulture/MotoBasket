import { OP_20_ABI, BitcoinAbiTypes } from 'opnet';
import { ABIDataTypes } from '@btc-vision/transaction';

const F = BitcoinAbiTypes.Function;
const U256 = ABIDataTypes.UINT256;
const ADDR = ABIDataTypes.ADDRESS;
const AU256 = ABIDataTypes.ARRAY_OF_UINT256;

// IndexToken ABI = OP20 base + custom index methods
export const INDEX_TOKEN_ABI: typeof OP_20_ABI = [
  ...OP_20_ABI,
  {
    name: 'invest',
    inputs: [
      { name: 'motoAmount', type: U256 },
      { name: 'minSharesOut', type: U256 },
    ],
    outputs: [{ name: 'sharesMinted', type: U256 }],
    type: F,
  },
  {
    name: 'redeem',
    inputs: [
      { name: 'shareAmount', type: U256 },
      { name: 'minMotoOut', type: U256 },
    ],
    outputs: [{ name: 'motoReturned', type: U256 }],
    type: F,
  },
  {
    name: 'rebalance',
    inputs: [],
    outputs: [],
    type: F,
  },
  {
    name: 'updateWeights',
    inputs: [
      { name: 'count', type: U256 },
      { name: 'weights', type: AU256 },
    ],
    outputs: [],
    type: F,
  },
  {
    name: 'getComponentCount',
    constant: true,
    inputs: [],
    outputs: [{ name: 'count', type: U256 }],
    type: F,
  },
  {
    name: 'getComponent',
    constant: true,
    inputs: [{ name: 'index', type: U256 }],
    outputs: [
      { name: 'token', type: ADDR },
      { name: 'weight', type: U256 },
      { name: 'pair', type: ADDR },
    ],
    type: F,
  },
  {
    name: 'getHolding',
    constant: true,
    inputs: [{ name: 'token', type: ADDR }],
    outputs: [{ name: 'amount', type: U256 }],
    type: F,
  },
  {
    name: 'getCurator',
    constant: true,
    inputs: [],
    outputs: [{ name: 'curator', type: ADDR }],
    type: F,
  },
  {
    name: 'getLastRebalanceBlock',
    constant: true,
    inputs: [],
    outputs: [{ name: 'block', type: U256 }],
    type: F,
  },
  {
    name: 'getMinInvestment',
    constant: true,
    inputs: [],
    outputs: [{ name: 'amount', type: U256 }],
    type: F,
  },
  {
    name: 'getOwner',
    constant: true,
    inputs: [],
    outputs: [{ name: 'owner', type: ADDR }],
    type: F,
  },
  {
    name: 'getMotoAddress',
    constant: true,
    inputs: [],
    outputs: [{ name: 'moto', type: ADDR }],
    type: F,
  },
];
