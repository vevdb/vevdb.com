import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseOutput(argv) {
  const outputIndex = argv.indexOf('--output');
  if (outputIndex === -1 || !argv[outputIndex + 1]) {
    throw new Error('Usage: build-analytics-config --output FILE');
  }
  return path.resolve(argv[outputIndex + 1]);
}

function serialize(value) {
  return JSON.stringify(String(value || '')).replaceAll('<', '\\u003c');
}

const outputFile = parseOutput(process.argv.slice(2));
const projectKey = process.env.POSTHOG_PROJECT_KEY;
const apiHost = process.env.POSTHOG_API_HOST;
const contents = [
  'window.__VEVDB_ANALYTICS__ = Object.freeze({',
  '  posthogProjectKey: ' + serialize(projectKey) + ',',
  '  posthogApiHost: ' + serialize(apiHost),
  '});',
  ''
].join('\n');

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, contents);
console.log(projectKey && apiHost
  ? 'Built configured PostHog runtime settings'
  : 'Built analytics runtime settings without PostHog enabled');
