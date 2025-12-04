module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/../tests'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'frontend/js/**/*.js',
    '!frontend/js/lib/**',
    '!frontend/js/workers/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../frontend/$1',
    '^@js/(.*)$': '<rootDir>/../frontend/js/$1',
    '^@css/(.*)$': '<rootDir>/../frontend/css/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 
      '<rootDir>/../tests/__mocks__/fileMock.js'
  },
  setupFilesAfterEnv: ['<rootDir>/../tests/setup.js'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  testTimeout: 10000
};