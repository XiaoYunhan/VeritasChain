/**
 * Jest Test Setup
 * 
 * Global test configuration and custom matchers.
 */

// import { customMatchers } from './test-fixtures.js';

// Extend Jest with custom matchers
// beforeAll(() => {
//   expect.extend(customMatchers);
// });

// Global test timeout for storage operations
jest.setTimeout(30000);

// Console suppression for cleaner test output
const originalConsole = console;
beforeEach(() => {
  if (process.env.NODE_ENV === 'test' && !process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  }
});

afterEach(() => {
  if (process.env.NODE_ENV === 'test' && !process.env.VERBOSE_TESTS) {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  }
});

// Environment validation
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}