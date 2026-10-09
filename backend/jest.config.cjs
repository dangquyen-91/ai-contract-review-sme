module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.cjs'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'CommonJS', moduleResolution: 'Node' } }] },
};
