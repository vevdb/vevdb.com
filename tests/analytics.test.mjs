import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import vm from 'node:vm';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const analyticsSource = fs.readFileSync(path.join(repositoryRoot, 'analytics.js'), 'utf8');

function runAnalytics({ config = {}, hostname = 'vevdb.com', search = '' } = {}) {
  const insertedScripts = [];
  const listeners = {};
  const errors = [];
  const document = {
    createElement() {
      return {};
    },
    getElementsByTagName() {
      return [{
        parentNode: {
          insertBefore(script) {
            insertedScripts.push(script);
          }
        }
      }];
    },
    addEventListener(name, listener) {
      listeners[name] = listener;
    }
  };
  const window = {
    __VEVDB_ANALYTICS__: config,
    location: { hostname, pathname: '/', search }
  };
  vm.runInNewContext(analyticsSource, {
    console: { error(error) { errors.push(error); } },
    document,
    URL,
    URLSearchParams,
    window
  });
  return { errors, insertedScripts, listeners, window };
}

test('production remains a no-op without PostHog configuration', () => {
  const result = runAnalytics();
  assert.equal(result.errors.length, 0);
  assert.equal(result.insertedScripts.length, 0);
  assert.equal(result.window.posthog, undefined);
});

test('local preview reports missing PostHog configuration', () => {
  const result = runAnalytics({ hostname: 'localhost' });
  assert.match(result.errors[0].message, /POSTHOG_PROJECT_KEY variable required/);
});

test('configured analytics is cookieless and captures whitelisted intent properties', () => {
  const result = runAnalytics({
    config: {
      posthogProjectKey: 'phc_test',
      posthogApiHost: 'https://eu.i.posthog.com'
    }
  });
  const [projectKey, options] = result.window.posthog._i[0];
  assert.equal(projectKey, 'phc_test');
  assert.equal(options.cookieless_mode, 'always');
  assert.equal(options.person_profiles, 'never');
  assert.equal(options.disable_session_recording, true);
  assert.equal(result.insertedScripts[0].src, 'https://eu-assets.i.posthog.com/static/array.js');

  result.listeners.click({
    target: {
      closest() {
        return {
          dataset: {
            analyticsEvent: 'capability_guide_clicked',
            analyticsLocation: 'problem_cards',
            analyticsCapability: 'history'
          }
        };
      }
    }
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(result.window.posthog.at(-1))),
    ['capture', 'capability_guide_clicked', {
      location: 'problem_cards',
      path: '/',
      capability: 'history'
    }]
  );
});

test('runtime configuration is generated from environment variables', () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vevdb-analytics-'));
  const outputFile = path.join(tempDirectory, 'analytics-config.js');
  const result = spawnSync(
    process.execPath,
    ['scripts/build-analytics-config.mjs', '--output', outputFile],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        POSTHOG_PROJECT_KEY: 'phc_generated',
        POSTHOG_API_HOST: 'https://eu.i.posthog.com'
      },
      encoding: 'utf8'
    }
  );
  assert.equal(result.status, 0, result.stderr);
  const generated = fs.readFileSync(outputFile, 'utf8');
  assert.match(generated, /posthogProjectKey: "phc_generated"/);
  assert.match(generated, /posthogApiHost: "https:\/\/eu\.i\.posthog\.com"/);
  fs.rmSync(tempDirectory, { recursive: true });
});
