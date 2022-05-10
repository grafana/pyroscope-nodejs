module.exports = {
  verbose: true,
  rootDir: '.',
  moduleNameMapper: {
    '^@pyroscope/nodejs$': '<rootDir>/src/',
    '^@pyroscope/nodejs(.*)$': '<rootDir>/src/$1',
  },
  roots: ['<rootDir>/test'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(js|ts|tsx)$': 'ts-jest',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      './config/fileTransformer.js',
  },
  globals: {
    'ts-jest': {
      tsconfig: './config/tsconfig.esm.json'
    }
  },
  extensionsToTreatAsEsm: [".ts"]
}
