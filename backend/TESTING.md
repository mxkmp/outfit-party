# Backend Tests

This directory contains comprehensive tests for the outfit voting backend API.

## Test Framework

- **Jest**: JavaScript testing framework
- **Supertest**: HTTP assertion library for testing Express apps
- **Mocked Dependencies**: Google Cloud Storage is mocked for local development

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

The test suite covers:

- **Health Check Endpoint** (`GET /api/health`)
- **Outfit Management** (`GET /api/outfits`, `POST /api/outfits`, `DELETE /api/outfits/:id`)
- **Voting System** (`POST /api/vote`)
- **Results** (`GET /api/results`)
- **Input Validation** (required fields, file uploads)
- **Business Logic** (duplicate prevention, voting rules)
- **Integration Tests** (complete workflows)

Current coverage: **86.66% statements**, **93.33% branches**

## Test Structure

Each test suite is organized by endpoint and includes:

1. **Happy Path Tests**: Normal operation scenarios
2. **Validation Tests**: Input validation and error handling
3. **Edge Cases**: Boundary conditions and business rules
4. **Integration Tests**: End-to-end workflows

## Mocking

Google Cloud Storage is mocked to:
- Simulate successful file uploads
- Avoid requiring actual GCS credentials
- Speed up test execution
- Ensure tests are deterministic

## Local Development

These tests are designed for local development and do not require:
- Google Cloud credentials
- Actual cloud storage
- External dependencies

Run `npm test` to verify your changes work correctly before deployment.