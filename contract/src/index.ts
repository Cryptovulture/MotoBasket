import { Blockchain } from '@btc-vision/btc-runtime/runtime';
import { IndexToken } from './IndexToken';
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';

// Factory function — REQUIRED (must return new instance, not assign directly)
Blockchain.contract = (): IndexToken => {
    return new IndexToken();
};

// Runtime exports — REQUIRED
export * from '@btc-vision/btc-runtime/runtime/exports';

// Abort handler — REQUIRED
export function abort(message: string, fileName: string, line: u32, column: u32): void {
    revertOnError(message, fileName, line, column);
}
