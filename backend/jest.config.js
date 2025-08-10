module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "*.js",
    "!coverage/**"
  ],
  testMatch: [
    "**/__tests__/**/*.js",
    "**/*.test.js"
  ],
  // Setup files to run before tests
  setupFilesAfterEnv: ["<rootDir>/test-setup.js"],
  // Test timeout increased for cloud tests
  testTimeout: 30000,
  // Separate configurations for different test types
  projects: [
    {
      displayName: "local",
      testMatch: ["<rootDir>/index.test.js"],
      testTimeout: 10000
    },
    {
      displayName: "cloud",
      testMatch: ["<rootDir>/index.cloud.test.js"],
      testTimeout: 30000
    }
  ]
};