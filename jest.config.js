/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // Use the Angular preset to handle .mjs modules and other Angular-specific
  // transform rules. ts-jest is still used under the hood.
  preset: 'jest-preset-angular',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'html'],
  transform: {
    '^.+\\.(ts|js|html)$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  reporters: ["jest-silent-reporter"],
};
