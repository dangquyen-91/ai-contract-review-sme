module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js', '<rootDir>/tests/**/*.test.cjs'],
  testTimeout: 120000,
  clearMocks: true,
  // Tests never use the Redis server from .env; see tests/setup/redisDouble.js.
  setupFiles: ['<rootDir>/tests/setup/redis.js'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'CommonJS', moduleResolution: 'Node' } }] },
};
