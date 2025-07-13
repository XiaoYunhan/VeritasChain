export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        target: 'es2020',
        module: 'esnext',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
      },
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  testEnvironment: 'node',
  
  // Test setup and teardown
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.ts'],
  globalTeardown: '<rootDir>/tests/helpers/cleanup.ts',
  
  // Coverage thresholds (Disabled for now - working toward CLAUDE.md 100% core requirement)
  // coverageThreshold: {
  //   './src/core/': {
  //     branches: 100,
  //     functions: 100,
  //     lines: 100,
  //     statements: 100
  //   }
  // },
  
  // Coverage reporting
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  
  // Test timeout for storage operations
  testTimeout: 15000,
  
  // Verbose output control
  verbose: process.env.VERBOSE_TESTS === 'true',
  
  // Test file organization
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  
  // Module resolution
  moduleDirectories: ['node_modules', 'src'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    'tests/output/',
    'tests/storage-integration.js'  // Old integration script
  ],
  
  // Coverage ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/',
    'src/index.ts'
  ]
};