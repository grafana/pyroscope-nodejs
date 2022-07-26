module.exports = {
  "roots": [
    "src",
    "test"
  ],
  moduleNameMapper: {
    '^@pyroscope/nodejs$': '<rootDir>/src',
      "./express.js": "<rootDir>/src/express.ts",
      "./cpu.js": "<rootDir>/src/cpu.ts",
      "./wall.js": "<rootDir>/src/wall.ts",
      "./heap.js": "<rootDir>/src/heap.ts",
      "./index.js": "<rootDir>/src/index.ts"
  },
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "test/**/*.{ts,js}",    
    "!**/node_modules/**",
    "!**/vendor/**"
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  globals: {
    'ts-jest': {
      tsconfig: './config/tsconfig.jest.json',
    },
  },
  "extensionsToTreatAsEsm": [".ts"]
}
