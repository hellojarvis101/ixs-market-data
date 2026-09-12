import { mkdir, writeFile } from 'node:fs/promises';

const WORKER_URL = 'https://ixs-market-data.heyjarvis90.workers.dev';
const OUTPUT_PATH = 'data/ixs-data.json';

async function main() {
  const response = await fetch(WORKER_URL, {
    headers: {
      'accept': 'application/json',
      'user-agent': 'ixs-market-data-github-mirror/1.0'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Worker request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();

  if (!payload || typeof payload !== 'object') {
    throw new Error('Worker returned a non-object JSON payload.');
  }

  if (!payload.generatedAt) {
    throw new Error('Worker payload is missing generatedAt.');
  }

  if (!payload.integrity || typeof payload.integrity !== 'object') {
    throw new Error('Worker payload is missing integrity metadata.');
  }

  const workerGeneratedAt = Date.parse(payload.generatedAt);
  if (!Number.isFinite(workerGeneratedAt)) {
    throw new Error('Worker generatedAt is not a valid timestamp.');
  }

  const ageMinutes = (Date.now() - workerGeneratedAt) / 60000;
  if (ageMinutes > 30) {
    throw new Error(`Worker payload is stale (${ageMinutes.toFixed(1)} minutes old).`);
  }

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
  console.log(`Worker status: ${payload.status ?? 'unknown'}`);
  console.log(`Worker generatedAt: ${payload.generatedAt}`);
  console.log(`Core data available: ${payload.integrity.requiredCoreDataAvailable ?? 'unknown'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
