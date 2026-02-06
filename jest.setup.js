// Ensure test globals are available
const jestGlobals = require('@jest/globals');

Object.assign(global, {
  ...jestGlobals,
  jest: jestGlobals.jest,
  expect: jestGlobals.expect,
  test: jestGlobals.test,
  describe: jestGlobals.describe,
  beforeEach: jestGlobals.beforeEach,
  afterEach: jestGlobals.afterEach,
  beforeAll: jestGlobals.beforeAll,
  afterAll: jestGlobals.afterAll
});