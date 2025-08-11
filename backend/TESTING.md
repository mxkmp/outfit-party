# Backend Tests

This directory contains comprehensive tests for the outfit voting backend API with support for both local (mocked) and cloud (real GCS) testing.

## Test Framework

- **Jest**: JavaScript testing framework
- **Supertest**: HTTP assertion library for testing Express apps
- **Conditional Mocking**: Google Cloud Storage can be mocked or real based on environment

## Running Tests

### Local Tests (Default - Fast, No Cloud Dependencies)

```bash
# Run local tests with mocked Google Cloud Storage
npm test

# Run local tests in watch mode
npm run test:watch

# Run local tests with coverage
npm run test:coverage

# Run only local tests explicitly
npm run test:local
```

### Cloud Integration Tests (Requires GCS Setup)

```bash
# Run tests against real Google Cloud Storage
npm run test:cloud

# Run cloud tests in watch mode
npm run test:cloud:watch

# Run all tests (local + cloud)
npm run test:all
```

### Prerequisites for Cloud Tests

Before running cloud tests, ensure you have:

1. **Google Cloud Storage Bucket**:
   ```bash
   export BUCKET_NAME="your-outfit-voting-bucket"
   ```

2. **Google Cloud Credentials**:
   - Set up a service account with Cloud Storage permissions
   - Download the service account key file
   - Set the credentials:
     ```bash
     export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
     # OR
     gcloud auth application-default login
     ```

3. **Bucket Permissions**:
   - Storage Object Admin role for the service account
   - Public access configured for the bucket (for `makePublic()` calls)

## Test Types

### Local Tests (`index.test.js`)
- **Fast execution** with mocked Google Cloud Storage
- **No external dependencies** required
- **Predictable results** with mocked UUIDs
- **20 comprehensive tests** covering all API endpoints

### Cloud Integration Tests (`index.cloud.test.js`)
- **Real Google Cloud Storage** integration
- **End-to-end validation** of cloud upload/download/delete
- **Network and authentication testing**
- **Graceful error handling** for cloud failures

## Test Coverage

The test suite covers:

- **Health Check Endpoint** (`GET /api/health`)
- **Outfit Management** (`GET /api/outfits`, `POST /api/outfits`, `DELETE /api/outfits/:id`)
- **Voting System** (`POST /api/vote`)
- **Results** (`GET /api/results`)
- **Input Validation** (required fields, file uploads)
- **Business Logic** (duplicate prevention, voting rules)
- **Integration Tests** (complete workflows)
- **Cloud Storage Integration** (upload, delete, public access)

Current local test coverage: **86.66% statements**, **93.33% branches**

## Test Structure

Each test suite includes:

1. **Happy Path Tests**: Normal operation scenarios
2. **Validation Tests**: Input validation and error handling
3. **Edge Cases**: Boundary conditions and business rules
4. **Integration Tests**: End-to-end workflows

## Environment Configuration

Tests automatically detect the environment:

- **`USE_REAL_GCS=true`**: Run against real Google Cloud Storage
- **`USE_REAL_GCS=false`** (default): Use mocked Google Cloud Storage

## Troubleshooting Cloud Tests

If cloud tests fail:

1. **Check credentials**:
   ```bash
   gcloud auth list
   gcloud config list project
   ```

2. **Verify bucket access**:
   ```bash
   gsutil ls gs://your-bucket-name
   ```

3. **Test bucket permissions**:
   ```bash
   echo "test" | gsutil cp - gs://your-bucket-name/test.txt
   gsutil rm gs://your-bucket-name/test.txt
   ```

4. **Check environment variables**:
   ```bash
   echo $BUCKET_NAME
   echo $GOOGLE_APPLICATION_CREDENTIALS
   ```

## Development Workflow

Recommended testing workflow:

1. **During development**: Use `npm run test:watch` for fast feedback
2. **Before commits**: Run `npm test` to ensure local tests pass
3. **Before deployment**: Run `npm run test:cloud` to validate cloud integration
4. **In CI/CD**: Run `npm run test:all` for comprehensive validation