import { mkdir, writeFile } from 'node:fs/promises';

const WORKER_URL = 'https://serv-market-watch.heyjarvis90.workers.dev/';
const OUTPUT_PATH = 'data/serv-data.json';

const EXPECTED = {
  symbol: 'SERV',
  ethereumContract: '0x40e3d1A4B2C47d9AA61261F5606136ef73E28042'.toLowerCase(),
  baseContract: '0x5576D6ed9181F2225afF5282Ac0ED29f755437Ea'.toLowerCase()
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const response = await fetch(WORKER_URL, {
    headers: {
      accept: 'application/json',
      'user-agent': 'serv-market-data-github-mirror/1.0'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Worker request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  assert(payload && typeof payload === 'object', 'Worker returned a non-object JSON payload.');
  assert(payload.asset?.symbol === EXPECTED.symbol, 'Worker asset symbol mismatch.');
  assert(String(payload.asset?.ethereumContract || '').toLowerCase() === EXPECTED.ethereumContract, 'Worker Ethereum contract mismatch.');
  assert(String(payload.asset?.baseContract || '').toLowerCase() === EXPECTED.baseContract, 'Worker Base contract mismatch.');

  const workerTimestamp = Date.parse(payload.timestamp);
  assert(Number.isFinite(workerTimestamp), 'Worker timestamp is missing or invalid.');

  const ageMinutes = (Date.now() - workerTimestamp) / 60000;
  assert(ageMinutes <= 30, `Worker payload is stale (${ageMinutes.toFixed(1)} minutes old).`);

  assert(payload.sourceStatus && typeof payload.sourceStatus === 'object', 'Worker sourceStatus is missing.');
  assert(payload.sourceStatus.lbank?.ticker === true, 'LBank ticker unhealthy.');
  assert(payload.sourceStatus.lbank?.depth === true, 'LBank depth unhealthy.');
  assert(payload.sourceStatus.lbank?.candles15m === true, 'LBank 15m candles unhealthy.');
  assert(payload.sourceStatus.lbank?.candles1h === true, 'LBank 1h candles unhealthy.');
  assert(payload.sourceStatus.lbank?.candles4h === true, 'LBank 4h candles unhealthy.');
  assert(payload.sourceStatus.lbank?.historicalDataHealthy === true, 'LBank historical data unhealthy.');

  const counts = payload.lbank?.candleCounts || {};
  assert((counts['15m'] ?? 0) >= 500, `LBank 15m history too short (${counts['15m'] ?? 0}).`);
  assert((counts['1h'] ?? 0) >= 500, `LBank 1h history too short (${counts['1h'] ?? 0}).`);
  assert((counts['4h'] ?? 0) >= 150, `LBank 4h history too short (${counts['4h'] ?? 0}).`);

  const mirrored = {
    mirror: {
      mirroredAt: new Date().toISOString(),
      source: WORKER_URL,
      repository: 'hellojarvis101/ixs-market-data',
      workerAgeMinutesAtMirror: Number(ageMinutes.toFixed(2))
    },
    ...payload
  };

  await mkdir('data', { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(mirrored, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Worker timestamp: ${payload.timestamp}`);
  console.log(`Worker age: ${ageMinutes.toFixed(2)} minutes`);
  console.log(`LBank candles: 15m=${counts['15m']}, 1h=${counts['1h']}, 4h=${counts['4h']}`);
  console.log(`XT core healthy: ${payload.sourceStatus.xt?.coreHealthy ?? 'unknown'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
