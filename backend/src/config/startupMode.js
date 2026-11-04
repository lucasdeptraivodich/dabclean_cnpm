// Local server entry point defaults to the demo profile. Explicit settings win.
// This runs after dotenv and before loading app/database modules.
module.exports = function configureStartupMode(env = process.env) {
  env.NODE_ENV ||= 'development';
  if (env.NODE_ENV === 'development' && env.DEMO_MODE === undefined) {
    env.DEMO_MODE = 'true';
  }
};
