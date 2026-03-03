/**
 * One-shot NAV snapshot with comparison to previous reading.
 * Usage: node nav-snapshot.mjs
 */
const RPC = 'https://testnet.opnet.org/api/v1/json-rpc';
const MOTO = '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd';

const INDEXES = [
  { symbol: 'OPAI', addr: '0x1c625456bc60c28d590dc2419ba649a4a8215a21a51454c637410ea580232eb8', components: ['0xaaf45d2ce96330c48a86f6e45d1f666d38f84c39c3cbb0db379ce806a91ed86f','0x8065620da70e8b7d8b0aa2a896fa18906586a944e668232d5ecafa86d921d16c','0xf624187e93ae18b6d83dd9e68c41670205de6c144b447ec81e40b64865d48b8c','0x5a7b2df0a29c92baae7d8a4209f4949190882f56722f690b75a14083d53b4df7','0x47a65def2d5a80332f1a40b3af90d8c8973fd5cb604d458d7eb1714614cb8940'] },
  { symbol: 'OPMEME', addr: '0x2f8c7fb147949a5bc95f6832a1c1ae7446ced4c5a3a7b3270160a3dc5a5836dd', components: ['0x2495973eca6972620d9565e4236bd966d8723fb36911c0e3e84bc6ef6201c2d6','0x24550d41f446261c3091fb2dad64a62f9065398650e238e2338a22b3bd7a2e22','0x07ec6eb7dd1c071053d390053ea60dfad0a39dc86f84bbd5ba95d7d858789258','0x274cca66f076864b97a29e1001275c69d48eaad9c4eda460f58914e005f8f383'] },
  { symbol: 'OPDEFI', addr: '0xae2575d734f9e6dcba8d2dc8534497b0eed4d563b4ef6360075b2a135400eead', components: ['0xb3640fd16d44469af46ec74097917d3cf16feb28715b8cd8304ce09245d66c18','0x7cadb62baf8d683e04adb3830ae2d273ebe2748df1b68a7d7320d6110050111b','0x589239855469f983c69a31820cd0472eb4f10e585ff215926533dd650a779f46','0xc70a38244ec57b52cb2c52b4d1d5d8976bd40e6c3fb95c9aca8f0291604b6e04'] },
  { symbol: 'OPGAME', addr: '0x0e1a2cc9f3c32c6ed08a50f5fa9f0c6fa13624e44d15f932c453c2801e57815c', components: ['0xd489377d4a9a64ccec90996ad4027fb8b824835b875e7d55d864030fdf4c32ce','0x3f8661627f0d0570f5a3c51be4b80e6e3b5e3e71e1f8f8faa567645987345c27','0x1694edcd0df9053bb9fe8b1ccef3057451a08426e888acb9cf2fe9306f0f46fd','0x3ca2249304ce3ac49c8cadc633f3cc5e02896fc46d30ab44fb91d974ed18f9c1'] },
  { symbol: 'OPINFRA', addr: '0xcc5a01846610a268856b0677ad0550a42f9d81fe04ed757fc39595bd6965bf2c', components: ['0xceca13106b88822d06f8ff1fea5fbe15a60d361ba494170efb3c7d6025bd209d','0xc341404b364262579db4b31276a94f76190b3c24847f1aa5744e593f6c2f6018','0x4332dafd738b89df51e0c75fb8a1d303e6b542b76f014b2daa4f93d5aabc6d53','0xe7817ac350ece2b586869aced8b3cb70b1a1108fd6798d44fc629bbff355b514'] },
  { symbol: 'ANSEM', addr: '0x024379a677871f98836b91eeed15468c2213d7ef3df1e1dbd9303739c9edb5b7', components: ['0xaaf45d2ce96330c48a86f6e45d1f666d38f84c39c3cbb0db379ce806a91ed86f','0xf624187e93ae18b6d83dd9e68c41670205de6c144b447ec81e40b64865d48b8c','0x8065620da70e8b7d8b0aa2a896fa18906586a944e668232d5ecafa86d921d16c','0x5a7b2df0a29c92baae7d8a4209f4949190882f56722f690b75a14083d53b4df7','0x47a65def2d5a80332f1a40b3af90d8c8973fd5cb604d458d7eb1714614cb8940'] },
  { symbol: 'CHAD', addr: '0xc2d24557a1237cced807b9deb531627a4ac4884063891f63967f093b85c67c65', components: ['0x2495973eca6972620d9565e4236bd966d8723fb36911c0e3e84bc6ef6201c2d6','0x24550d41f446261c3091fb2dad64a62f9065398650e238e2338a22b3bd7a2e22','0x07ec6eb7dd1c071053d390053ea60dfad0a39dc86f84bbd5ba95d7d858789258','0x274cca66f076864b97a29e1001275c69d48eaad9c4eda460f58914e005f8f383'] },
  { symbol: 'DANNY', addr: '0xf1c011543071351c09380fac3fd7844c383ead53d68c9206fdc1bf77029534fe', components: ['0xaaf45d2ce96330c48a86f6e45d1f666d38f84c39c3cbb0db379ce806a91ed86f','0x24550d41f446261c3091fb2dad64a62f9065398650e238e2338a22b3bd7a2e22','0x7cadb62baf8d683e04adb3830ae2d273ebe2748df1b68a7d7320d6110050111b','0x47a65def2d5a80332f1a40b3af90d8c8973fd5cb604d458d7eb1714614cb8940'] },
  { symbol: 'GCR', addr: '0xf1f84e8794a03e66274fee486fb3602f7b88ae78e725401e5ef17bd75e621a0a', components: ['0xb3640fd16d44469af46ec74097917d3cf16feb28715b8cd8304ce09245d66c18','0x7cadb62baf8d683e04adb3830ae2d273ebe2748df1b68a7d7320d6110050111b','0xceca13106b88822d06f8ff1fea5fbe15a60d361ba494170efb3c7d6025bd209d','0xc341404b364262579db4b31276a94f76190b3c24847f1aa5744e593f6c2f6018'] },
  { symbol: 'VULTURE', addr: '0x03e9be2c2f770cb643021f06bbfa6c32baf6514daf5dfc0bad4099ed854a44ad', components: ['0x4332dafd738b89df51e0c75fb8a1d303e6b542b76f014b2daa4f93d5aabc6d53','0xe7817ac350ece2b586869aced8b3cb70b1a1108fd6798d44fc629bbff355b514','0xc70a38244ec57b52cb2c52b4d1d5d8976bd40e6c3fb95c9aca8f0291604b6e04','0x589239855469f983c69a31820cd0472eb4f10e585ff215926533dd650a779f46'] },
];

const PAIRS = {
  '0xaaf45d2ce96330c48a86f6e45d1f666d38f84c39c3cbb0db379ce806a91ed86f': '0x528352dc4b0b8aea18e9a9a92378f75390ede88d17e0bde754c9d2c822599c5c',
  '0x8065620da70e8b7d8b0aa2a896fa18906586a944e668232d5ecafa86d921d16c': '0x65ac96f5e99e0109c20e606d74f2b1ad3d200378c5f5485aa18f3fb9ad50fec1',
  '0xf624187e93ae18b6d83dd9e68c41670205de6c144b447ec81e40b64865d48b8c': '0x9a3a20391f916ff18040ac9c29889bd59ef4a7f27aa74e1f57aef78a36148f5c',
  '0x5a7b2df0a29c92baae7d8a4209f4949190882f56722f690b75a14083d53b4df7': '0x270063d920c1bbfa19edacc563e41d268f7ed63f067ced86422479ecac2a1833',
  '0x47a65def2d5a80332f1a40b3af90d8c8973fd5cb604d458d7eb1714614cb8940': '0x236453461cb8ecb2e2c384921a28cdcaa4089b90b116686ed647d7081bffa419',
  '0x2495973eca6972620d9565e4236bd966d8723fb36911c0e3e84bc6ef6201c2d6': '0xa6fd538786d91ce70013fa71489219db91b2ebc575e301ed3a45a9a6bcc7f14f',
  '0x24550d41f446261c3091fb2dad64a62f9065398650e238e2338a22b3bd7a2e22': '0x73ca3b95ae58eb57f18467c6c0670c33664970a5ce5fa9c3cc615cf7242064c4',
  '0x07ec6eb7dd1c071053d390053ea60dfad0a39dc86f84bbd5ba95d7d858789258': '0x76455b069d8f06fbd13ddb5a07581470b891dfe13467551aa0ec94d9aece23aa',
  '0x274cca66f076864b97a29e1001275c69d48eaad9c4eda460f58914e005f8f383': '0x7d674c47e2dbd7c666e793c1e89834fa5573bbeda31253189092a95d0828a665',
  '0xb3640fd16d44469af46ec74097917d3cf16feb28715b8cd8304ce09245d66c18': '0x05e4f00e89056c295565340e4b238a685dedcfc49a4b0b8b025b620a0af96d85',
  '0x7cadb62baf8d683e04adb3830ae2d273ebe2748df1b68a7d7320d6110050111b': '0x58a1da36149de67c55c483f7c2ba18dd83b1636b4bea363a99b9f30caca8eaa3',
  '0x589239855469f983c69a31820cd0472eb4f10e585ff215926533dd650a779f46': '0x5f9531cf52a2f484e6804f1c34c92a4faacb0fb41b7a95355cdb25d0d8d95b03',
  '0xc70a38244ec57b52cb2c52b4d1d5d8976bd40e6c3fb95c9aca8f0291604b6e04': '0x032ee52958b133ceeb5b1249f2094060ac655c5e897adb3399a702023fb627e0',
  '0xceca13106b88822d06f8ff1fea5fbe15a60d361ba494170efb3c7d6025bd209d': '0x49fecff9b403535887b59ca3350003ab27c2c4e56de5805a431e7e03697302dc',
  '0xc341404b364262579db4b31276a94f76190b3c24847f1aa5744e593f6c2f6018': '0xca9520723e4d9da1be0d5605650cc803e49ff1240df255b346f5c1c41460d06a',
  '0x4332dafd738b89df51e0c75fb8a1d303e6b542b76f014b2daa4f93d5aabc6d53': '0xb3544fe76741442b5399d3a926047fb82b7e36f3c8b0fea7628793ce7323e978',
  '0xe7817ac350ece2b586869aced8b3cb70b1a1108fd6798d44fc629bbff355b514': '0x2c3970839a8344b06d2e27aa6555c03f306935091ec33a83bb4c97bc8c2cbd83',
  '0xd489377d4a9a64ccec90996ad4027fb8b824835b875e7d55d864030fdf4c32ce': '0xff53be752b1cda125c0bde66c053d23c2d1a3dbc88f45409e5694eccd76b4e2c',
  '0x3f8661627f0d0570f5a3c51be4b80e6e3b5e3e71e1f8f8faa567645987345c27': '0x4590e4e366148b089d306d103175a5a1c94556b8a8f29000b7dcb59c67a2c2b5',
  '0x1694edcd0df9053bb9fe8b1ccef3057451a08426e888acb9cf2fe9306f0f46fd': '0x628a40caebd50b15df22b9ae9387042ddae166c8c4390777678bf52da14789b6',
  '0x3ca2249304ce3ac49c8cadc633f3cc5e02896fc46d30ab44fb91d974ed18f9c1': '0x330fa0e57ffee21f2829515cb4c47ef2772f26b17167311dd7cf42506ce2df62',
};

const SEL_GET_RESERVES = '06374bfc';
const SEL_BALANCE_OF = '5b46f8f6';
const SEL_TOTAL_SUPPLY = 'a368022e';

let rpcId = 0;
async function rpc(method, params) {
  const resp = await fetch(RPC, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: ++rpcId }),
  });
  return (await resp.json()).result;
}

function hexToU256(hex) {
  if (!hex || hex.length < 64) return 0n;
  return BigInt('0x' + hex.slice(0, 64));
}

function addrToCalldata(hex) {
  return hex.replace(/^0x/, '').padStart(64, '0');
}

function decodeBase64Hex(b64) {
  return Buffer.from(b64, 'base64').toString('hex');
}

async function btcCall(contract, calldata) {
  const result = await rpc('btc_call', [contract, calldata]);
  if (!result) return null;
  if (typeof result === 'string') {
    if (result.startsWith('0x')) return result.slice(2);
    try { return decodeBase64Hex(result); } catch { return result; }
  }
  if (result.result) {
    const r = result.result;
    if (typeof r === 'string') {
      if (r.startsWith('0x')) return r.slice(2);
      try { return decodeBase64Hex(r); } catch { return r; }
    }
  }
  return null;
}

async function getPairReserves(pairAddr, tokenAddr) {
  const hex = await btcCall(pairAddr, SEL_GET_RESERVES);
  if (!hex || hex.length < 128) return [0n, 0n];
  const r0 = hexToU256(hex.substring(0, 64));
  const r1 = hexToU256(hex.substring(64, 128));
  const motoClean = MOTO.replace(/^0x/, '').toLowerCase();
  const tokenClean = tokenAddr.replace(/^0x/, '').toLowerCase();
  return motoClean < tokenClean ? [r0, r1] : [r1, r0];
}

async function getBalance(tokenAddr, holderAddr) {
  const calldata = SEL_BALANCE_OF + addrToCalldata(holderAddr);
  const hex = await btcCall(tokenAddr, calldata);
  if (!hex || hex.length < 64) return 0n;
  return hexToU256(hex);
}

async function getTotalSupply(indexAddr) {
  const hex = await btcCall(indexAddr, SEL_TOTAL_SUPPLY);
  if (!hex || hex.length < 64) return 0n;
  return hexToU256(hex);
}

async function calcNAV(index) {
  const supply = await getTotalSupply(index.addr);
  if (supply === 0n) return { nav: 0, supply: 0n, total: 0 };
  let totalMotoValue = 0n;
  for (const compAddr of index.components) {
    const pairAddr = PAIRS[compAddr];
    if (!pairAddr) continue;
    const balance = await getBalance(compAddr, index.addr);
    const [motoRes, tokenRes] = await getPairReserves(pairAddr, compAddr);
    if (tokenRes > 0n && balance > 0n) {
      totalMotoValue += (balance * motoRes) / tokenRes;
    }
  }
  return {
    nav: Number(totalMotoValue) / Number(supply),
    supply,
    total: Number(totalMotoValue) / 1e18,
  };
}

// Baseline from block 3714 (after initial round 1 swaps)
const BASELINE = {
  OPAI: 1.1093, OPMEME: 1.1158, OPDEFI: 1.0073,
  OPGAME: 0.9983, OPINFRA: 1.0015, ANSEM: 1.1490,
  CHAD: 1.1294, DANNY: 1.1514, GCR: 0.9963, VULTURE: 0.9968,
};

async function main() {
  const block = parseInt(await rpc('btc_blockNumber', []), 16);
  const time = new Date().toLocaleTimeString();

  console.log(`\nBlock: ${block} — ${time}\n`);
  console.log('Index     NAV/Share  Baseline   Delta      Total MOTO  Supply');
  console.log('--------  ---------  ---------  ---------  ----------  ------');

  for (const idx of INDEXES) {
    const { nav, supply, total } = await calcNAV(idx);
    const base = BASELINE[idx.symbol];
    const delta = ((nav - base) / base * 100);
    const sign = delta >= 0 ? '+' : '';
    const deltaStr = sign + delta.toFixed(2) + '%';

    console.log(
      idx.symbol.padEnd(10) +
      nav.toFixed(4).padStart(9) + '  ' +
      base.toFixed(4).padStart(9) + '  ' +
      deltaStr.padStart(9) + '  ' +
      total.toFixed(2).padStart(10) + '  ' +
      (Number(supply) / 1e18).toFixed(1).padStart(6)
    );
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
