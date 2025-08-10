const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Initialize Google Cloud Storage
const storage = new Storage();
const bucketName = process.env.BUCKET_NAME || 'your-outfit-voting-project-outfit-images';
const bucket = storage.bucket(bucketName);

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Initialize Express app
const app = express();

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:8080',
        'http://localhost:8000',
        'https://mxkmp.github.io',
        /^https:\/\/.*\.github\.io$/,
        /^https:\/\/.*\.netlify\.app$/,
        /^https:\/\/.*\.vercel\.app$/
    ],
    credentials: true
}));

app.use(express.json());

// In-memory storage for simplicity (use Cloud Firestore in production)
let outfits = [];
let votes = {};

// Helper function to get public URL for uploaded file
function getPublicUrl(fileName) {
    return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}

// Get all outfits
app.get('/api/outfits', async (req, res) => {
    try {
        res.json({
            success: true,
            outfits: outfits
        });
    } catch (error) {
        console.error('Error fetching outfits:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch outfits'
        });
    }
});

// Upload new outfit
app.post('/api/outfits', upload.single('image'), async (req, res) => {
    try {
        const { userName, userIdentifier } = req.body;
        
        if (!userName || !userIdentifier) {
            return res.status(400).json({
                success: false,
                error: 'User name and identifier are required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Image file is required'
            });
        }

        // Check if user already uploaded
        const existingOutfit = outfits.find(outfit => outfit.userIdentifier === userIdentifier);
        if (existingOutfit) {
            return res.status(400).json({
                success: false,
                error: 'User has already uploaded an outfit'
            });
        }

        // Check if name already exists (case insensitive)
        const nameExists = outfits.some(outfit => 
            outfit.userName.toLowerCase() === userName.toLowerCase()
        );
        if (nameExists) {
            return res.status(400).json({
                success: false,
                error: 'This name is already taken'
            });
        }

        // Generate unique filename
        const fileExtension = req.file.originalname.split('.').pop();
        const fileName = `outfit-${uuidv4()}.${fileExtension}`;

        // Upload to Google Cloud Storage
        const file = bucket.file(fileName);
        const stream = file.createWriteStream({
            metadata: {
                contentType: req.file.mimetype,
                cacheControl: 'public, max-age=31536000'
            }
        });

        await new Promise((resolve, reject) => {
            stream.on('error', reject);
            stream.on('finish', resolve);
            stream.end(req.file.buffer);
        });

        // Make file publicly readable
        await file.makePublic();

        // Create outfit object
        const outfit = {
            id: uuidv4(),
            userName: userName.trim(),
            userIdentifier,
            imageUrl: getPublicUrl(fileName),
            fileName,
            uploadedAt: new Date().toISOString(),
            votes: 0
        };

        outfits.push(outfit);

        res.json({
            success: true,
            outfit
        });

    } catch (error) {
        console.error('Error uploading outfit:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload outfit'
        });
    }
});

// Vote for an outfit
app.post('/api/vote', async (req, res) => {
    try {
        const { outfitId, userIdentifier } = req.body;

        if (!outfitId || !userIdentifier) {
            return res.status(400).json({
                success: false,
                error: 'Outfit ID and user identifier are required'
            });
        }

        // Check if user already voted
        if (votes[userIdentifier]) {
            return res.status(400).json({
                success: false,
                error: 'User has already voted'
            });
        }

        // Find outfit
        const outfitIndex = outfits.findIndex(outfit => outfit.id === outfitId);
        if (outfitIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Outfit not found'
            });
        }

        // Check if user is voting for their own outfit
        if (outfits[outfitIndex].userIdentifier === userIdentifier) {
            return res.status(400).json({
                success: false,
                error: 'Cannot vote for your own outfit'
            });
        }

        // Add vote
        outfits[outfitIndex].votes += 1;
        votes[userIdentifier] = outfitId;

        res.json({
            success: true,
            message: 'Vote recorded successfully'
        });

    } catch (error) {
        console.error('Error recording vote:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record vote'
        });
    }
});

// Get voting results
app.get('/api/results', async (req, res) => {
    try {
        const sortedOutfits = [...outfits].sort((a, b) => b.votes - a.votes);
        
        res.json({
            success: true,
            results: sortedOutfits.map((outfit, index) => ({
                ...outfit,
                rank: index + 1
            }))
        });
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch results'
        });
    }
});

// Delete an outfit (admin only)
app.delete('/api/outfits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const outfitIndex = outfits.findIndex(outfit => outfit.id === id);
        if (outfitIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Outfit not found'
            });
        }

        const outfit = outfits[outfitIndex];

        // Delete from Google Cloud Storage
        try {
            await bucket.file(outfit.fileName).delete();
        } catch (error) {
            console.warn('Error deleting file from storage:', error);
        }

        // Remove from memory
        outfits.splice(outfitIndex, 1);

        // Remove related votes
        Object.keys(votes).forEach(userIdentifier => {
            if (votes[userIdentifier] === id) {
                delete votes[userIdentifier];
            }
        });

        res.json({
            success: true,
            message: 'Outfit deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting outfit:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete outfit'
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is running',
        timestamp: new Date().toISOString()
    });
});

// Register the Express app as a Cloud Function
functions.http('outfit-voting', app);

module.exports = app;
