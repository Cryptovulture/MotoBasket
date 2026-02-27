import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';
import type { BitcoinInterfaceAbi } from 'opnet';

export const ExpertIndexAbi: BitcoinInterfaceAbi = [
  ...OP_NET_ABI,

  // Read
  {
    name: 'getStats',
    inputs: [],
    outputs: [
      { name: 'nextBasketId', type: ABIDataTypes.UINT256 },
      { name: 'platformFeeBps', type: ABIDataTypes.UINT256 },
    ],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'getBasketInfo',
    inputs: [{ name: 'basketId', type: ABIDataTypes.UINT256 }],
    outputs: [
      { name: 'creator', type: ABIDataTypes.UINT256 },
      { name: 'compCount', type: ABIDataTypes.UINT256 },
      { name: 'totalShares', type: ABIDataTypes.UINT256 },
      { name: 'totalMoto', type: ABIDataTypes.UINT256 },
      { name: 'perfFeeBps', type: ABIDataTypes.UINT256 },
      { name: 'createdAt', type: ABIDataTypes.UINT256 },
      { name: 'lockState', type: ABIDataTypes.UINT256 },
      { name: 'active', type: ABIDataTypes.UINT256 },
      { name: 'investorCount', type: ABIDataTypes.UINT256 },
    ],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'getComponent',
    inputs: [
      { name: 'basketId', type: ABIDataTypes.UINT256 },
      { name: 'componentIndex', type: ABIDataTypes.UINT256 },
    ],
    outputs: [
      { name: 'token', type: ABIDataTypes.UINT256 },
      { name: 'weight', type: ABIDataTypes.UINT256 },
      { name: 'holding', type: ABIDataTypes.UINT256 },
    ],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'getInvestorPosition',
    inputs: [
      { name: 'basketId', type: ABIDataTypes.UINT256 },
      { name: 'investor', type: ABIDataTypes.ADDRESS },
    ],
    outputs: [
      { name: 'shares', type: ABIDataTypes.UINT256 },
      { name: 'costBasis', type: ABIDataTypes.UINT256 },
    ],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'getBasketName',
    inputs: [{ name: 'basketId', type: ABIDataTypes.UINT256 }],
    outputs: [
      { name: 'nameWord1', type: ABIDataTypes.UINT256 },
      { name: 'nameWord2', type: ABIDataTypes.UINT256 },
      { name: 'nameLen', type: ABIDataTypes.UINT256 },
    ],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'getBasketNAV',
    inputs: [{ name: 'basketId', type: ABIDataTypes.UINT256 }],
    outputs: [{ name: 'nav', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'isPaused',
    inputs: [],
    outputs: [{ name: 'isPaused', type: ABIDataTypes.BOOL }],
    type: BitcoinAbiTypes.Function,
  },

  // Write
  {
    name: 'createBasket',
    inputs: [{ name: 'nameLen', type: ABIDataTypes.UINT256 }],
    outputs: [{ name: 'basketId', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'invest',
    inputs: [
      { name: 'basketId', type: ABIDataTypes.UINT256 },
      { name: 'motoAmount', type: ABIDataTypes.UINT256 },
      { name: 'minSharesOut', type: ABIDataTypes.UINT256 },
    ],
    outputs: [{ name: 'shares', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'withdraw',
    inputs: [
      { name: 'basketId', type: ABIDataTypes.UINT256 },
      { name: 'shareAmount', type: ABIDataTypes.UINT256 },
      { name: 'minMotoOut', type: ABIDataTypes.UINT256 },
    ],
    outputs: [{ name: 'motoOut', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'scheduleRebalance',
    inputs: [{ name: 'basketId', type: ABIDataTypes.UINT256 }],
    outputs: [],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'executeRebalance',
    inputs: [{ name: 'basketId', type: ABIDataTypes.UINT256 }],
    outputs: [],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'collectPerfFee',
    inputs: [{ name: 'basketId', type: ABIDataTypes.UINT256 }],
    outputs: [{ name: 'feeAmount', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'returnCreatorLock',
    inputs: [{ name: 'basketId', type: ABIDataTypes.UINT256 }],
    outputs: [],
    type: BitcoinAbiTypes.Function,
  },

  // Events
  {
    name: 'Investment',
    values: [
      { name: 'basketId', type: ABIDataTypes.UINT256 },
      { name: 'investor', type: ABIDataTypes.ADDRESS },
      { name: 'motoIn', type: ABIDataTypes.UINT256 },
      { name: 'sharesOut', type: ABIDataTypes.UINT256 },
    ],
    type: BitcoinAbiTypes.Event,
  },
  {
    name: 'Withdrawal',
    values: [
      { name: 'basketId', type: ABIDataTypes.UINT256 },
      { name: 'investor', type: ABIDataTypes.ADDRESS },
      { name: 'sharesIn', type: ABIDataTypes.UINT256 },
      { name: 'motoOut', type: ABIDataTypes.UINT256 },
    ],
    type: BitcoinAbiTypes.Event,
  },
  {
    name: 'BasketCreated',
    values: [
      { name: 'basketId', type: ABIDataTypes.UINT256 },
      { name: 'creator', type: ABIDataTypes.ADDRESS },
      { name: 'perfFeeBps', type: ABIDataTypes.UINT256 },
    ],
    type: BitcoinAbiTypes.Event,
  },
  {
    name: 'RebalanceScheduled',
    values: [
      { name: 'basketId', type: ABIDataTypes.UINT256 },
      { name: 'executeAt', type: ABIDataTypes.UINT256 },
      { name: 'scheduledBy', type: ABIDataTypes.ADDRESS },
    ],
    type: BitcoinAbiTypes.Event,
  },
  {
    name: 'RebalanceExecuted',
    values: [
      { name: 'basketId', type: ABIDataTypes.UINT256 },
      { name: 'executedBy', type: ABIDataTypes.ADDRESS },
    ],
    type: BitcoinAbiTypes.Event,
  },
  {
    name: 'PerfFeeCollected',
    values: [
      { name: 'basketId', type: ABIDataTypes.UINT256 },
      { name: 'expert', type: ABIDataTypes.ADDRESS },
      { name: 'feeAmount', type: ABIDataTypes.UINT256 },
    ],
    type: BitcoinAbiTypes.Event,
  },
  {
    name: 'CreatorLock',
    values: [
      { name: 'basketId', type: ABIDataTypes.UINT256 },
      { name: 'creator', type: ABIDataTypes.ADDRESS },
      { name: 'action', type: ABIDataTypes.UINT256 },
    ],
    type: BitcoinAbiTypes.Event,
  },
] as BitcoinInterfaceAbi;
