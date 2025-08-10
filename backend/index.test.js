const request = require('supertest');

// Only mock Google Cloud Storage for local tests (not when USE_REAL_GCS=true)
if (process.env.USE_REAL_GCS !== 'true') {
  // Mock Google Cloud Storage before requiring the main module
  jest.mock('@google-cloud/storage', () => {
    const mockFile = {
      createWriteStream: jest.fn().mockImplementation(() => {
        const stream = require('stream').PassThrough();
        // Simulate successful upload by emitting finish event
        setTimeout(() => {
          stream.emit('finish');
        }, 10);
        return stream;
      }),
      makePublic: jest.fn().mockResolvedValue(),
      delete: jest.fn().mockResolvedValue()
    };

    const mockBucket = {
      file: jest.fn(() => mockFile)
    };

    const mockStorage = {
      bucket: jest.fn(() => mockBucket)
    };

    return {
      Storage: jest.fn(() => mockStorage)
    };
  });

  // Mock uuid to have predictable IDs for testing
  jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-123')
  }));
}

describe('Outfit Voting API', () => {
  let app;

  // Clear module cache before each test to ensure fresh state
  beforeEach(() => {
    // Clear module cache for fresh state
    jest.resetModules();
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Import fresh app instance after mocks are set up
    app = require('./index');
  });

  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Backend is running',
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/outfits', () => {
    test('should return empty outfits array initially', async () => {
      const response = await request(app)
        .get('/api/outfits')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        outfits: []
      });
    });
  });

  describe('POST /api/outfits', () => {
    test('should upload a new outfit successfully', async () => {
      const response = await request(app)
        .post('/api/outfits')
        .field('userName', 'John Doe')
        .field('userIdentifier', 'user123')
        .attach('image', Buffer.from('fake image data'), 'test.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.outfit).toMatchObject({
        id: 'test-uuid-123',
        userName: 'John Doe',
        userIdentifier: 'user123',
        imageUrl: expect.stringContaining('test-uuid-123.jpg'),
        fileName: expect.stringContaining('test-uuid-123.jpg'),
        uploadedAt: expect.any(String),
        votes: 0
      });
    });

    test('should reject upload without userName', async () => {
      const response = await request(app)
        .post('/api/outfits')
        .field('userIdentifier', 'user123')
        .attach('image', Buffer.from('fake image data'), 'test.jpg')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'User name and identifier are required'
      });
    });

    test('should reject upload without userIdentifier', async () => {
      const response = await request(app)
        .post('/api/outfits')
        .field('userName', 'John Doe')
        .attach('image', Buffer.from('fake image data'), 'test.jpg')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'User name and identifier are required'
      });
    });

    test('should reject upload without image', async () => {
      const response = await request(app)
        .post('/api/outfits')
        .field('userName', 'John Doe')
        .field('userIdentifier', 'user123')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Image file is required'
      });
    });

    test('should prevent duplicate uploads from same user', async () => {
      // Mock uuid to return different values for each call
      const { v4: mockUuid } = require('uuid');
      mockUuid
        .mockReturnValueOnce('test-uuid-1')
        .mockReturnValueOnce('test-uuid-2');

      // First upload
      await request(app)
        .post('/api/outfits')
        .field('userName', 'John Doe')
        .field('userIdentifier', 'user123')
        .attach('image', Buffer.from('fake image data'), 'test.jpg')
        .expect(200);

      // Second upload from same user
      const response = await request(app)
        .post('/api/outfits')
        .field('userName', 'Jane Doe')
        .field('userIdentifier', 'user123')
        .attach('image', Buffer.from('fake image data'), 'test2.jpg')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'User has already uploaded an outfit'
      });
    });

    test('should prevent duplicate usernames (case insensitive)', async () => {
      // Mock uuid to return different values for each call
      const { v4: mockUuid } = require('uuid');
      mockUuid
        .mockReturnValueOnce('test-uuid-1')
        .mockReturnValueOnce('test-uuid-2');

      // First upload
      await request(app)
        .post('/api/outfits')
        .field('userName', 'John Doe')
        .field('userIdentifier', 'user123')
        .attach('image', Buffer.from('fake image data'), 'test.jpg')
        .expect(200);

      // Second upload with same name (different case)
      const response = await request(app)
        .post('/api/outfits')
        .field('userName', 'john doe')
        .field('userIdentifier', 'user456')
        .attach('image', Buffer.from('fake image data'), 'test2.jpg')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'This name is already taken'
      });
    });
  });

  describe('POST /api/vote', () => {
    let outfitId;

    beforeEach(async () => {
      // Mock uuid for consistent outfit ID
      const { v4: mockUuid } = require('uuid');
      mockUuid.mockReturnValue('test-outfit-id');

      // Create an outfit to vote for
      const response = await request(app)
        .post('/api/outfits')
        .field('userName', 'John Doe')
        .field('userIdentifier', 'outfit-owner')
        .attach('image', Buffer.from('fake image data'), 'test.jpg');
      
      outfitId = response.body.outfit.id;
    });

    test('should record a vote successfully', async () => {
      const response = await request(app)
        .post('/api/vote')
        .send({
          outfitId: outfitId,
          userIdentifier: 'voter123'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Vote recorded successfully'
      });
    });

    test('should reject vote without outfitId', async () => {
      const response = await request(app)
        .post('/api/vote')
        .send({
          userIdentifier: 'voter123'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Outfit ID and user identifier are required'
      });
    });

    test('should reject vote without userIdentifier', async () => {
      const response = await request(app)
        .post('/api/vote')
        .send({
          outfitId: outfitId
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Outfit ID and user identifier are required'
      });
    });

    test('should prevent duplicate votes from same user', async () => {
      // First vote
      await request(app)
        .post('/api/vote')
        .send({
          outfitId: outfitId,
          userIdentifier: 'voter123'
        })
        .expect(200);

      // Second vote from same user
      const response = await request(app)
        .post('/api/vote')
        .send({
          outfitId: outfitId,
          userIdentifier: 'voter123'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'User has already voted'
      });
    });

    test('should prevent voting for non-existent outfit', async () => {
      const response = await request(app)
        .post('/api/vote')
        .send({
          outfitId: 'non-existent-id',
          userIdentifier: 'voter123'
        })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Outfit not found'
      });
    });

    test('should prevent voting for own outfit', async () => {
      const response = await request(app)
        .post('/api/vote')
        .send({
          outfitId: outfitId,
          userIdentifier: 'outfit-owner'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Cannot vote for your own outfit'
      });
    });
  });

  describe('GET /api/results', () => {
    test('should return empty results initially', async () => {
      const response = await request(app)
        .get('/api/results')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        results: []
      });
    });

    test('should return results sorted by votes', async () => {
      // Mock uuid to return different values for each outfit
      const { v4: mockUuid } = require('uuid');
      mockUuid
        .mockReturnValueOnce('outfit-1-id')
        .mockReturnValueOnce('outfit-1-file')
        .mockReturnValueOnce('outfit-2-id')
        .mockReturnValueOnce('outfit-2-file');

      // Create multiple outfits
      const outfit1Response = await request(app)
        .post('/api/outfits')
        .field('userName', 'John Doe')
        .field('userIdentifier', 'user1')
        .attach('image', Buffer.from('fake image data'), 'test1.jpg');

      const outfit2Response = await request(app)
        .post('/api/outfits')
        .field('userName', 'Jane Doe')
        .field('userIdentifier', 'user2')
        .attach('image', Buffer.from('fake image data'), 'test2.jpg');

      const outfit1Id = outfit1Response.body.outfit.id;
      const outfit2Id = outfit2Response.body.outfit.id;

      // Vote for outfit2 twice and outfit1 once
      await request(app)
        .post('/api/vote')
        .send({ outfitId: outfit2Id, userIdentifier: 'voter1' });

      await request(app)
        .post('/api/vote')
        .send({ outfitId: outfit2Id, userIdentifier: 'voter2' });

      await request(app)
        .post('/api/vote')
        .send({ outfitId: outfit1Id, userIdentifier: 'voter3' });

      const response = await request(app)
        .get('/api/results')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(2);
      
      // Should be sorted by votes (outfit2 first with 2 votes, outfit1 second with 1 vote)
      expect(response.body.results[0].votes).toBe(2);
      expect(response.body.results[0].rank).toBe(1);
      expect(response.body.results[0].userName).toBe('Jane Doe');
      
      expect(response.body.results[1].votes).toBe(1);
      expect(response.body.results[1].rank).toBe(2);
      expect(response.body.results[1].userName).toBe('John Doe');
    });
  });

  describe('DELETE /api/outfits/:id', () => {
    let outfitId;

    beforeEach(async () => {
      // Mock uuid for consistent outfit ID
      const { v4: mockUuid } = require('uuid');
      mockUuid.mockReturnValue('test-outfit-delete-id');

      // Create an outfit to delete
      const response = await request(app)
        .post('/api/outfits')
        .field('userName', 'John Doe')
        .field('userIdentifier', 'user123')
        .attach('image', Buffer.from('fake image data'), 'test.jpg');
      
      outfitId = response.body.outfit.id;
    });

    test('should delete outfit successfully', async () => {
      const response = await request(app)
        .delete(`/api/outfits/${outfitId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Outfit deleted successfully'
      });

      // Verify outfit is deleted
      const outfitsResponse = await request(app)
        .get('/api/outfits')
        .expect(200);

      expect(outfitsResponse.body.outfits).toHaveLength(0);
    });

    test('should return 404 for non-existent outfit', async () => {
      const response = await request(app)
        .delete('/api/outfits/non-existent-id')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Outfit not found'
      });
    });

    test('should remove related votes when deleting outfit', async () => {
      // Add a vote for the outfit
      await request(app)
        .post('/api/vote')
        .send({
          outfitId: outfitId,
          userIdentifier: 'voter123'
        });

      // Delete the outfit
      await request(app)
        .delete(`/api/outfits/${outfitId}`)
        .expect(200);

      // Create a new outfit and verify that the user can vote again
      const { v4: mockUuid } = require('uuid');
      mockUuid.mockReturnValue('new-outfit-id');

      const newOutfitResponse = await request(app)
        .post('/api/outfits')
        .field('userName', 'New User')
        .field('userIdentifier', 'user456')
        .attach('image', Buffer.from('fake image data'), 'test2.jpg');

      const voteResponse = await request(app)
        .post('/api/vote')
        .send({
          outfitId: newOutfitResponse.body.outfit.id,
          userIdentifier: 'voter123'
        })
        .expect(200);

      expect(voteResponse.body.success).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('complete outfit voting workflow', async () => {
      // Mock uuid to return different values for each call
      const { v4: mockUuid } = require('uuid');
      mockUuid
        .mockReturnValueOnce('alice-outfit-id')
        .mockReturnValueOnce('alice-file-id')
        .mockReturnValueOnce('bob-outfit-id')
        .mockReturnValueOnce('bob-file-id');

      // 1. Upload multiple outfits
      const outfit1Response = await request(app)
        .post('/api/outfits')
        .field('userName', 'Alice')
        .field('userIdentifier', 'alice123')
        .attach('image', Buffer.from('fake image data'), 'alice.jpg')
        .expect(200);

      const outfit2Response = await request(app)
        .post('/api/outfits')
        .field('userName', 'Bob')
        .field('userIdentifier', 'bob456')
        .attach('image', Buffer.from('fake image data'), 'bob.jpg')
        .expect(200);

      // 2. Check outfits are listed
      const outfitsResponse = await request(app)
        .get('/api/outfits')
        .expect(200);

      expect(outfitsResponse.body.outfits).toHaveLength(2);

      // 3. Cast votes
      await request(app)
        .post('/api/vote')
        .send({
          outfitId: outfit1Response.body.outfit.id,
          userIdentifier: 'voter1'
        })
        .expect(200);

      await request(app)
        .post('/api/vote')
        .send({
          outfitId: outfit1Response.body.outfit.id,
          userIdentifier: 'voter2'
        })
        .expect(200);

      await request(app)
        .post('/api/vote')
        .send({
          outfitId: outfit2Response.body.outfit.id,
          userIdentifier: 'voter3'
        })
        .expect(200);

      // 4. Check results
      const resultsResponse = await request(app)
        .get('/api/results')
        .expect(200);

      expect(resultsResponse.body.results).toHaveLength(2);
      expect(resultsResponse.body.results[0].votes).toBe(2); // Alice should be first
      expect(resultsResponse.body.results[0].userName).toBe('Alice');
      expect(resultsResponse.body.results[1].votes).toBe(1); // Bob should be second
      expect(resultsResponse.body.results[1].userName).toBe('Bob');

      // 5. Delete an outfit (admin action)
      await request(app)
        .delete(`/api/outfits/${outfit1Response.body.outfit.id}`)
        .expect(200);

      // 6. Verify outfit is removed from results
      const finalResultsResponse = await request(app)
        .get('/api/results')
        .expect(200);

      expect(finalResultsResponse.body.results).toHaveLength(1);
      expect(finalResultsResponse.body.results[0].userName).toBe('Bob');
    });
  });
});