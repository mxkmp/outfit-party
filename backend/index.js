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

// Configure multer for file uploads with better error handling
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            const error = new Error(`Ungültiger Dateityp: ${file.mimetype}. Nur Bilddateien (JPG, PNG, GIF) sind erlaubt.`);
            error.code = 'INVALID_FILE_TYPE';
            cb(error, false);
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

// Multer error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'Datei zu groß',
                details: 'Die ausgewählte Datei ist zu groß. Maximale Dateigröße: 10MB'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                error: 'Unerwartete Datei',
                details: 'Es wurde eine unerwartete Datei empfangen. Bitte wählen Sie nur ein Bild aus.'
            });
        }
    }
    
    if (error.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
            success: false,
            error: 'Ungültiger Dateityp',
            details: error.message
        });
    }
    
    // Handle busboy multipart parsing errors (e.g., "Unexpected end of form")
    if (error.message && error.message.includes('Unexpected end of form')) {
        return res.status(400).json({
            success: false,
            error: 'Upload-Fehler',
            details: 'Die Datei konnte nicht vollständig übertragen werden. Bitte versuchen Sie es erneut.'
        });
    }
    
    next(error);
});

// In-memory storage for simplicity (use Cloud Firestore in production)
let outfits = [];
let votes = {};

// Admin configuration
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Helper function to reset storage (useful for testing)
function resetStorage() {
    outfits = [];
    votes = {};
}

// Export reset function for testing
if (process.env.NODE_ENV === 'test') {
    module.exports.resetStorage = resetStorage;
}

// Helper function to get public URL for uploaded file
function getPublicUrl(fileName) {
    return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}

// Authentication middleware for admin endpoints
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (token !== ADMIN_PASSWORD) {
        return res.status(401).json({
            success: false,
            error: 'Invalid authentication credentials'
        });
    }
    
    next();
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
            error: 'Fehler beim Laden der Outfits',
            details: `Die Outfits konnten nicht geladen werden: ${error.message}. Bitte aktualisieren Sie die Seite.`
        });
    }
});



// Upload new outfit
app.post('/api/outfits', (req, res, next) => {
    // Use custom error handling for multer middleware
    upload.single('image')(req, res, (err) => {
        if (err) {
            // Handle specific multer/busboy errors
            if (err.message && err.message.includes('Unexpected end of form')) {
                return res.status(400).json({
                    success: false,
                    error: 'Upload-Fehler',
                    details: 'Die Datei konnte nicht vollständig übertragen werden. Bitte versuchen Sie es erneut.'
                });
            }
            // Pass other errors to the general error handler
            return next(err);
        }
        // Continue to the actual route handler
        next();
    });
}, async (req, res) => {
    try {
        const { userName, userIdentifier } = req.body;
        
        // Validate required fields
        if (!userName || !userIdentifier) {
            return res.status(400).json({
                success: false,
                error: 'Erforderliche Felder fehlen',
                details: !userName && !userIdentifier 
                    ? 'Name und Benutzerkennung sind erforderlich' 
                    : !userName 
                        ? 'Name ist erforderlich'
                        : 'Benutzerkennung ist erforderlich'
            });
        }

        // Validate name format
        const nameValidation = validateUserName(userName);
        if (!nameValidation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Ungültiger Name',
                details: nameValidation.errors.join(', ')
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Bild ist erforderlich',
                details: 'Bitte wählen Sie ein Bild aus (JPG, PNG, GIF - max. 10MB)'
            });
        }

        // Validate file type
        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({
                success: false,
                error: 'Ungültiger Dateityp',
                details: `Nur Bilddateien sind erlaubt. Empfangen: ${req.file.mimetype}`
            });
        }

        // Validate file size
        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                error: 'Datei zu groß',
                details: `Maximale Dateigröße: 10MB. Ihre Datei: ${(req.file.size / 1024 / 1024).toFixed(1)}MB`
            });
        }

        // Check if user already uploaded
        const existingOutfit = outfits.find(outfit => outfit.userIdentifier === userIdentifier);
        if (existingOutfit) {
            return res.status(400).json({
                success: false,
                error: 'Bereits hochgeladen',
                details: 'Du kannst nur ein Outfit pro Person hochladen. Dein Outfit wurde bereits gespeichert.'
            });
        }

        // Check if name already exists (case insensitive)
        const nameExists = outfits.some(outfit => 
            outfit.userName.toLowerCase() === userName.toLowerCase()
        );
        if (nameExists) {
            return res.status(400).json({
                success: false,
                error: 'Name bereits vergeben',
                details: `Der Name "${userName}" wird bereits verwendet. Bitte wählen Sie einen anderen Namen.`
            });
        }

        // Generate unique filename
        const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
        const fileName = `outfit-${uuidv4()}.${fileExtension}`;

        let imageUrl = '';
        try {
            // Upload to Google Cloud Storage
            const file = bucket.file(fileName);
            const stream = file.createWriteStream({
                metadata: {
                    contentType: req.file.mimetype,
                    cacheControl: 'public, max-age=31536000'
                }
            });

            await new Promise((resolve, reject) => {
                stream.on('error', (error) => {
                    console.error('Storage upload error:', error);
                    reject(new Error(`Fehler beim Hochladen: ${error.message}`));
                });
                stream.on('finish', resolve);
                stream.end(req.file.buffer);
            });

            // Make file publicly readable
            await file.makePublic();
            imageUrl = getPublicUrl(fileName);
        } catch (uploadError) {
            console.error('Error uploading to cloud storage:', uploadError);
            return res.status(500).json({
                success: false,
                error: 'Upload fehlgeschlagen',
                details: `Fehler beim Speichern des Bildes: ${uploadError.message}. Bitte versuchen Sie es erneut.`
            });
        }

        // Create outfit object
        const outfit = {
            id: uuidv4(),
            userName: userName.trim(),
            userIdentifier,
            imageUrl,
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
            error: 'Server-Fehler',
            details: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}. Bitte versuchen Sie es später erneut.`
        });
    }
});

// Helper function to validate user name
function validateUserName(name) {
    const errors = [];
    
    if (!name || typeof name !== 'string') {
        errors.push('Name ist erforderlich');
        return { valid: false, errors };
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length < 2) {
        errors.push('Name muss mindestens 2 Zeichen haben');
    }
    
    if (trimmedName.length > 50) {
        errors.push('Name darf maximal 50 Zeichen haben');
    }
    
    if (!/^[a-zA-ZäöüÄÖÜß\s\-\.0-9]+$/.test(trimmedName)) {
        errors.push('Name darf nur Buchstaben, Zahlen, Leerzeichen, Bindestriche und Punkte enthalten');
    }
    
    return { valid: errors.length === 0, errors };
}

// Vote for an outfit
app.post('/api/vote', async (req, res) => {
    try {
        const { outfitId, userIdentifier } = req.body;

        // Validate required fields
        if (!outfitId || !userIdentifier) {
            return res.status(400).json({
                success: false,
                error: 'Erforderliche Felder fehlen',
                details: !outfitId && !userIdentifier 
                    ? 'Outfit-ID und Benutzerkennung sind erforderlich' 
                    : !outfitId 
                        ? 'Outfit-ID ist erforderlich'
                        : 'Benutzerkennung ist erforderlich'
            });
        }

        // Check if user already voted
        if (votes[userIdentifier]) {
            const votedOutfit = outfits.find(o => o.id === votes[userIdentifier]);
            const votedName = votedOutfit ? votedOutfit.userName : 'unbekannt';
            return res.status(400).json({
                success: false,
                error: 'Bereits abgestimmt',
                details: `Du hast bereits für "${votedName}" abgestimmt. Pro Person ist nur eine Stimme erlaubt.`
            });
        }

        // Find outfit
        const outfitIndex = outfits.findIndex(outfit => outfit.id === outfitId);
        if (outfitIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Outfit nicht gefunden',
                details: 'Das gewählte Outfit existiert nicht mehr oder wurde gelöscht.'
            });
        }

        const targetOutfit = outfits[outfitIndex];

        // Check if user is voting for their own outfit
        if (targetOutfit.userIdentifier === userIdentifier) {
            return res.status(400).json({
                success: false,
                error: 'Selbstabstimmung nicht erlaubt',
                details: 'Du kannst nicht für dein eigenes Outfit abstimmen. Wähle ein anderes Outfit aus.'
            });
        }

        // Add vote
        outfits[outfitIndex].votes += 1;
        votes[userIdentifier] = outfitId;

        res.json({
            success: true,
            message: 'Stimme erfolgreich abgegeben',
            details: `Deine Stimme für "${targetOutfit.userName}" wurde gezählt!`
        });

    } catch (error) {
        console.error('Error recording vote:', error);
        res.status(500).json({
            success: false,
            error: 'Server-Fehler',
            details: `Fehler beim Speichern der Stimme: ${error.message}. Bitte versuchen Sie es erneut.`
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
            error: 'Fehler beim Laden der Ergebnisse',
            details: `Die Voting-Ergebnisse konnten nicht geladen werden: ${error.message}. Bitte aktualisieren Sie die Seite.`
        });
    }
});

// Delete an outfit (admin only)
app.delete('/api/outfits/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Outfit-ID erforderlich',
                details: 'Die Outfit-ID muss angegeben werden.'
            });
        }
        
        const outfitIndex = outfits.findIndex(outfit => outfit.id === id);
        if (outfitIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Outfit nicht gefunden',
                details: 'Das zu löschende Outfit existiert nicht oder wurde bereits entfernt.'
            });
        }

        const outfit = outfits[outfitIndex];

        // Delete from Google Cloud Storage
        try {
            await bucket.file(outfit.fileName).delete();
        } catch (storageError) {
            console.warn('Error deleting file from storage:', storageError);
            // Continue with deletion even if storage deletion fails
        }

        // Remove from memory
        outfits.splice(outfitIndex, 1);

        // Remove related votes
        const removedVotes = Object.keys(votes).filter(userIdentifier => votes[userIdentifier] === id);
        removedVotes.forEach(userIdentifier => {
            delete votes[userIdentifier];
        });

        res.json({
            success: true,
            message: 'Outfit erfolgreich gelöscht',
            details: `Das Outfit von "${outfit.userName}" wurde entfernt. ${removedVotes.length} Stimmen wurden zurückgesetzt.`,
            deletedUserIdentifier: outfit.userIdentifier // Include userIdentifier for frontend state reset
        });

    } catch (error) {
        console.error('Error deleting outfit:', error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Löschen',
            details: `Das Outfit konnte nicht gelöscht werden: ${error.message}. Bitte versuchen Sie es erneut.`
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Backend läuft',
            details: `Server ist aktiv. Zeitstempel: ${new Date().toISOString()}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Health-Check fehlgeschlagen',
            details: error.message
        });
    }
});

// Admin password verification
app.post('/api/admin/verify-password', async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'Passwort erforderlich',
                details: 'Bitte geben Sie das Admin-Passwort ein.'
            });
        }
        
        if (password === ADMIN_PASSWORD) {
            res.json({
                success: true,
                message: 'Passwort korrekt',
                details: 'Sie wurden erfolgreich als Administrator angemeldet.'
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Falsches Passwort',
                details: 'Das eingegebene Passwort ist nicht korrekt. Bitte versuchen Sie es erneut.'
            });
        }
    } catch (error) {
        console.error('Error verifying admin password:', error);
        res.status(500).json({
            success: false,
            error: 'Fehler bei der Passwort-Überprüfung',
            details: `Die Passwort-Überprüfung ist fehlgeschlagen: ${error.message}. Bitte versuchen Sie es später erneut.`
        });
    }
});

// Register the Express app as a Cloud Function
functions.http('outfit-voting', app);

module.exports = app;
