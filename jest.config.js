module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^n8n-workflow$': '<rootDir>/__mocks__/n8n-workflow.ts',
  },
};