// Tests never use the Redis server configured in .env. Point the URL at a closed
// port so anything that bypasses the in-memory double fails visibly instead of
// writing to a shared server (dotenv does not override an existing variable).
process.env.REDIS_URL = 'redis://127.0.0.1:1';

// Route both the compiled and the TypeScript Redis client to the in-memory double.
jest.mock('../../dist/config/redis', () => require('./redisDouble'));
jest.mock('../../src/config/redis', () => require('./redisDouble'));
