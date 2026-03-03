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
        inputs: [
            { name: 'shareAmount', type: ABIDataTypes.UINT256 },
            { name: 'minMotoOut', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'motoReturned', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'rebalance',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'updateWeights',
        inputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'updatePair',
        inputs: [
            { name: 'componentIndex', type: ABIDataTypes.UINT256 },
            { name: 'newPairAddr', type: ABIDataTypes.ADDRESS },
        ],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setMinInvestment',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
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
            { name: 'pair', type: ABIDataTypes.ADDRESS },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getHolding',
        inputs: [{ name: 'index', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getCurator',
        inputs: [],
        outputs: [{ name: 'curator', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getLastRebalanceBlock',
        inputs: [],
        outputs: [{ name: 'blockNumber', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMinInvestment',
        inputs: [],
        outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getOwner',
        inputs: [],
        outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMotoAddress',
        inputs: [],
        outputs: [{ name: 'moto', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    ...IndexTokenEvents,
    ...OP_NET_ABI,
];

export default IndexTokenAbi;
