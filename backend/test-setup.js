// Test setup file for global configuration

// Increase timeout for cloud tests
if (process.env.USE_REAL_GCS === 'true') {
  jest.setTimeout(30000);
} else {
  jest.setTimeout(10000);
}

// Global test environment setup
beforeAll(() => {
  if (process.env.USE_REAL_GCS === 'true') {
    console.log('🌩️  Running tests against real Google Cloud Storage');
    console.log('🔧  Make sure BUCKET_NAME and GCS credentials are configured');
  } else {
    console.log('🧪  Running tests with mocked Google Cloud Storage');
  }
});

// Clean up any global state between test suites
afterEach(() => {
  // Reset any global state if needed
  if (global.gc) {
    global.gc();
  }
});