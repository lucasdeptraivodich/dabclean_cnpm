// Explicit opt-in only. Evaluate after dotenv, before any database initialization.
const enabled = process.env.DEMO_MODE === 'true';
if (enabled && !['development', 'test'].includes(process.env.NODE_ENV)) {
  throw new Error('DEMO_MODE chỉ được phép khi NODE_ENV=development hoặc test; cấm trong production.');
}
module.exports = { enabled };
