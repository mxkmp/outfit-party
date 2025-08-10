const request = require('supertest');

// This test file runs against real Google Cloud Storage
// Set USE_REAL_GCS=true to enable cloud testing

describe('Outfit Voting API - Cloud Integration Tests', () => {
  let app;

  // Only run cloud tests if explicitly enabled
  const shouldRunCloudTests = process.env.USE_REAL_GCS === 'true';

  // Clear module cache before each test to ensure fresh state
  beforeEach(() => {
    if (!shouldRunCloudTests) {
      return;
    }

    // Clear module cache for fresh state
    jest.resetModules();
    
    // Set test environment but allow real GCS
    process.env.NODE_ENV = 'test';
    
    // Import fresh app instance without mocks
    app = require('./index');
  });

  beforeAll(() => {
    if (!shouldRunCloudTests) {
      console.log('⚠️  Cloud tests skipped. Set USE_REAL_GCS=true to run cloud integration tests.');
      console.log('⚠️  Make sure you have valid Google Cloud credentials and BUCKET_NAME configured.');
    }
  });

  // Skip all tests if cloud testing is not enabled
  const testIf = (condition) => condition ? test : test.skip;
  const describeIf = (condition) => condition ? describe : describe.skip;

  describeIf(shouldRunCloudTests)('Health Check', () => {
    testIf(shouldRunCloudTests)('should return health status', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Backend is running',
        timestamp: expect.any(String)
      });
    });
  });

  describeIf(shouldRunCloudTests)('Cloud Storage Integration', () => {
    let uploadedOutfitId;
    let uploadedFileName;

    testIf(shouldRunCloudTests)('should upload outfit to real Google Cloud Storage', async () => {
      const response = await request(app)
        .post('/api/outfits')
        .field('userName', 'Cloud Test User')
        .field('userIdentifier', 'cloud-test-123')
        .attach('image', Buffer.from('fake image data for cloud test'), 'cloud-test.jpg');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.outfit).toMatchObject({
        id: expect.any(String),
        userName: 'Cloud Test User',
        userIdentifier: 'cloud-test-123',
        imageUrl: expect.stringContaining('storage.googleapis.com'),
        fileName: expect.stringMatching(/^outfit-.*\.jpg$/),
        uploadedAt: expect.any(String),
        votes: 0
      });

      // Store for cleanup
      uploadedOutfitId = response.body.outfit.id;
      uploadedFileName = response.body.outfit.fileName;
    });

    testIf(shouldRunCloudTests)('should retrieve uploaded outfit', async () => {
      const response = await request(app).get('/api/outfits');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.outfits).toHaveLength(1);
      expect(response.body.outfits[0]).toMatchObject({
        id: uploadedOutfitId,
        userName: 'Cloud Test User',
        userIdentifier: 'cloud-test-123'
      });
    });

    testIf(shouldRunCloudTests)('should delete outfit from cloud storage', async () => {
      const response = await request(app)
        .delete(`/api/outfits/${uploadedOutfitId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Outfit deleted successfully');

      // Verify it's removed from the list
      const getResponse = await request(app).get('/api/outfits');
      expect(getResponse.body.outfits).toHaveLength(0);
    });
  });

  describeIf(shouldRunCloudTests)('Full Cloud Workflow', () => {
    let outfit1Id, outfit2Id;

    testIf(shouldRunCloudTests)('should handle complete outfit voting workflow with cloud storage', async () => {
      // Upload first outfit
      const upload1 = await request(app)
        .post('/api/outfits')
        .field('userName', 'Alice')
        .field('userIdentifier', 'alice-cloud')
        .attach('image', Buffer.from('alice outfit image'), 'alice.jpg');

      expect(upload1.status).toBe(200);
      outfit1Id = upload1.body.outfit.id;

      // Upload second outfit
      const upload2 = await request(app)
        .post('/api/outfits')
        .field('userName', 'Bob')
        .field('userIdentifier', 'bob-cloud')
        .attach('image', Buffer.from('bob outfit image'), 'bob.jpg');

      expect(upload2.status).toBe(200);
      outfit2Id = upload2.body.outfit.id;

      // Vote for first outfit
      const vote1 = await request(app)
        .post('/api/vote')
        .send({
          outfitId: outfit1Id,
          userIdentifier: 'charlie-cloud'
        });

      expect(vote1.status).toBe(200);

      // Vote for second outfit
      const vote2 = await request(app)
        .post('/api/vote')
        .send({
          outfitId: outfit2Id,
          userIdentifier: 'david-cloud'
        });

      expect(vote2.status).toBe(200);

      // Check results
      const results = await request(app).get('/api/results');
      expect(results.status).toBe(200);
      expect(results.body.results).toHaveLength(2);
      expect(results.body.results.every(r => r.votes === 1)).toBe(true);

      // Cleanup - delete both outfits
      await request(app).delete(`/api/outfits/${outfit1Id}`);
      await request(app).delete(`/api/outfits/${outfit2Id}`);
    });
  });

  describeIf(shouldRunCloudTests)('Cloud Error Handling', () => {
    testIf(shouldRunCloudTests)('should handle cloud storage errors gracefully', async () => {
      // This test might fail if there are cloud connectivity issues
      // but should handle errors gracefully
      const response = await request(app)
        .post('/api/outfits')
        .field('userName', 'Error Test User')
        .field('userIdentifier', 'error-test-123')
        .attach('image', Buffer.from('test image'), 'test.jpg');

      // Should either succeed or fail gracefully
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 500) {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      } else {
        expect(response.body.success).toBe(true);
        // Cleanup if successful
        await request(app).delete(`/api/outfits/${response.body.outfit.id}`);
      }
    });
  });
});