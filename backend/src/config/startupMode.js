// Demo mode is selected explicitly via DEMO_MODE or npm run demo.
// This runs after dotenv and before loading app/database modules.
module.exports = function configureStartupMode(env = process.env) {
  env.NODE_ENV ||= 'development';
};
