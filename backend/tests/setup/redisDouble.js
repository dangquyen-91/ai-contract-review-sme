// In-memory Redis for tests. Every test file gets its own empty store, so test runs
// never touch the Redis server configured in .env and never inherit OTP cooldowns
// or send limits from an earlier run.
const RedisMock = require('ioredis-mock');

// ioredis-mock exposes a missing HMGET field to Lua as a truthy null, whereas real
// Redis returns false. Rewrite the one guard that depends on this into an
// equivalent existence check, and fail loudly if the script stops matching.
const MISSING_GUARD = "if not f[1] then return {'missing'} end";
const EXISTS_GUARD = "if redis.call('EXISTS', KEYS[1]) == 0 then return {'missing'} end";

function adaptScript(script) {
  if (!script.includes("redis.call('HMGET'")) return script;
  if (!script.includes(MISSING_GUARD))
    throw new Error('redisDouble: OTP attempt script changed; update tests/setup/redisDouble.js');
  return script.replace(MISSING_GUARD, EXISTS_GUARD);
}

let client;

function getRedis() {
  if (!client) {
    client = new RedisMock();
    const evaluate = client.eval.bind(client);
    client.eval = (script, ...args) => evaluate(adaptScript(script), ...args);
  }
  return client;
}

async function closeRedis() {
  const current = client;
  client = undefined;
  if (current) {
    await current.flushall();
    current.disconnect();
  }
}

module.exports = { getRedis, closeRedis };
