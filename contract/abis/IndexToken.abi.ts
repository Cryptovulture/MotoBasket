import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const IndexTokenEvents = [];

export const IndexTokenAbi = [
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
    {
        name: 'getComponentCount',
        inputs: [],
        outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getComponent',
        inputs: [{ name: 'index', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'token', type: ABIDataTypes.ADDRESS },
            { name: 'weight', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getHolding',
        inputs: [{ name: 'index', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...IndexTokenEvents,
    ...OP_NET_ABI,
];

export default IndexTokenAbi;
