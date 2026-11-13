const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const configure = require('./src/config/startupMode');
for (const [initial, expected] of [
  [{}, { NODE_ENV: 'development' }],
  [{ NODE_ENV: 'development' }, { NODE_ENV: 'development' }],
  [{ NODE_ENV: 'development', DEMO_MODE: 'true' }, { NODE_ENV: 'development', DEMO_MODE: 'true' }],
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
for (const mode of ['development', 'production']) {
  const script = `
    const http = require('node:http');
    const mysql = require('mysql2/promise');
    let rejectConnection;
    mysql.createPool = () => ({
      getConnection: () => new Promise((resolve, reject) => { rejectConnection = reject; }),
      end: async () => {}
    });
    http.Server.prototype.listen = () => { throw new Error('LISTEN_BEFORE_DB_READY'); };
    require('./server');
    setImmediate(() => rejectConnection(new Error('SIMULATED_DB_UNAVAILABLE')));
  `;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: __dirname, encoding: 'utf8', timeout: 10000,
    env: { ...process.env, NODE_ENV: mode, DEMO_MODE: 'false', JWT_SECRET: require('node:crypto').randomBytes(48).toString('hex') }
  });
  assert.ifError(result.error);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /SIMULATED_DB_UNAVAILABLE/);
  assert.doesNotMatch(result.stderr, /LISTEN_BEFORE_DB_READY/);
}
console.log('PASS startup configuration, demo refusal and fail-closed startup before listen');
