module.exports = {
  roots: ['src', 'test'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'test/**/*.{ts,js}',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: './config/tsconfig.jest.json',
    },
  },
  extensionsToTreatAsEsm: ['.ts'],
};
