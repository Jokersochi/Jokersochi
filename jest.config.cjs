module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost/'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  injectGlobals: true,
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  setupFiles: ['<rootDir>/jest.setup.cjs']
};
