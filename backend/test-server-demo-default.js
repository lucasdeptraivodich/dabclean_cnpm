const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const configure = require('./src/config/startupMode');
for (const [initial, expected] of [
  [{}, { NODE_ENV: 'development', DEMO_MODE: 'true' }],
  [{ NODE_ENV: 'development' }, { NODE_ENV: 'development', DEMO_MODE: 'true' }],
  [{ NODE_ENV: 'development', DEMO_MODE: 'false' }, { NODE_ENV: 'development', DEMO_MODE: 'false' }],
  [{ NODE_ENV: 'production' }, { NODE_ENV: 'production' }],
  [{ NODE_ENV: 'test' }, { NODE_ENV: 'test' }],
  [{ NODE_ENV: 'staging' }, { NODE_ENV: 'staging' }],
  [{ NODE_ENV: 'production', DEMO_MODE: 'true' }, { NODE_ENV: 'production', DEMO_MODE: 'true' }]
]) {
  configure(initial);
  assert.deepEqual(initial, expected);
}
for (const mode of ['production', 'staging']) {
  const result = spawnSync(process.execPath, ['-e', "require('./src/config/startupMode')(); require('./src/config/demoMode');"], {
    cwd: __dirname, encoding: 'utf8', env: { ...process.env, NODE_ENV: mode, DEMO_MODE: 'true' }
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DEMO_MODE/);
}
console.log('PASS startup defaults: 7 configurations + production/staging demo refusal');
