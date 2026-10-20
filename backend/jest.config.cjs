module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js', '<rootDir>/tests/**/*.test.cjs'],
  testTimeout: 120000,
  clearMocks: true,
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'CommonJS', moduleResolution: 'Node' } }] },
};
