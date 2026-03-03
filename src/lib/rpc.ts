import { RPC_URL } from '../config/network';

const RPC_ENDPOINT = `${RPC_URL}/api/v1/json-rpc`;
let rpcId = 0;

// Raw JSON-RPC call to OPNet node
async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(RPC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: ++rpcId,
      method,
      params,
    }),
  });

  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

// btc_call — read-only contract call
// Returns hex string (base64 response decoded to hex)
export async function btcCall(to: string, calldata: string): Promise<string> {
  const toAddr = to.startsWith('0x') ? to : '0x' + to;

  const result = (await rpcCall('btc_call', [toAddr, calldata])) as {
    result?: string;
    revert?: string;
    error?: { message: string };
  };

  if (result.revert) throw new Error(`Contract reverted: ${result.revert}`);
  if (result.error) throw new Error(result.error.message);
  if (!result.result) return '';

  // OPNet returns base64 — decode to hex for our calldata decoders
  const raw = atob(result.result);
  let hex = '';
  for (let i = 0; i < raw.length; i++) {
    hex += raw.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

// Get current block number
export async function getBlockNumber(): Promise<number> {
  const result = await rpcCall('btc_blockNumber', []);
  if (typeof result === 'string') {
    return parseInt(result, 16) || parseInt(result, 10) || 0;
  }
  if (typeof result === 'number') return result;
  return 0;
}

// Get balance of an address (raw BTC sats)
export async function getBalance(address: string): Promise<bigint> {
  const result = await rpcCall('btc_getBalance', [address]);
  if (typeof result === 'string') return BigInt(result || '0');
  if (typeof result === 'number') return BigInt(result);
  return 0n;
}
