import { OP_20_ABI } from 'opnet';
import type { BitcoinInterfaceAbi } from 'opnet';

export const MotoTokenAbi: BitcoinInterfaceAbi = [
  ...OP_20_ABI,
] as BitcoinInterfaceAbi;
