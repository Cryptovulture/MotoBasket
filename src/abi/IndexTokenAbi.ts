import { ABIDataTypes, BitcoinAbiTypes, OP_20_ABI } from 'opnet';
import type { BitcoinInterfaceAbi } from 'opnet';

export const IndexTokenAbi: BitcoinInterfaceAbi = [
  ...OP_20_ABI,

  // Custom read methods
  {
    name: 'getComponentCount',
    constant: true,
    inputs: [],
    outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'getComponent',
    constant: true,
    inputs: [{ name: 'index', type: ABIDataTypes.UINT256 }],
    outputs: [
      { name: 'token', type: ABIDataTypes.ADDRESS },
      { name: 'weight', type: ABIDataTypes.UINT256 },
    ],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'getHolding',
    constant: true,
    inputs: [{ name: 'index', type: ABIDataTypes.UINT256 }],
    outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Function,
  },

  // Custom write methods
  {
    name: 'invest',
    inputs: [
      { name: 'motoAmount', type: ABIDataTypes.UINT256 },
      { name: 'minSharesOut', type: ABIDataTypes.UINT256 },
    ],
    outputs: [{ name: 'shares', type: ABIDataTypes.UINT256 }],
    type: BitcoinAbiTypes.Function,
  },
  {
    name: 'redeem',
    inputs: [{ name: 'shareAmount', type: ABIDataTypes.UINT256 }],
    outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
    type: BitcoinAbiTypes.Function,
  },
] as BitcoinInterfaceAbi;
