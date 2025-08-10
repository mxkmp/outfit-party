const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

const UPLOAD_PATH = path.join(__dirname, 'uploads');
const DATA_PATH = path.join(__dirname, 'data/votes.json');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_PATH)) {
    fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

// Ensure data file exists
if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({}));
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_PATH);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use('/uploads', express.static(UPLOAD_PATH));
app.use(express.json());

// Store user uploads and votes in memory (for this simple version)
let uploads = {}; // Stores upload metadata {name, ip} by filename.
let votes = JSON.parse(fs.readFileSync(DATA_PATH));

app.post('/upload', upload.single('outfit'), (req, res) => {
    const ip = req.ip;
    const name = req.body.name;

    // For testing purposes, the check to prevent multiple uploads is disabled.
    // if (Object.values(uploads).some(u => u.ip === ip)) {
    //     return res.status(403).send('You have already uploaded a picture.');
    // }

    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    uploads[req.file.filename] = { name: name, ip: ip };
    
    res.status(200).send('File uploaded successfully.');
});

app.post('/vote/:image', (req, res) => {
    const ip = req.ip;
    const image = req.params.image;

    // A simple check to prevent a user from voting multiple times for the same image
    if (votes[image] && votes[image].includes(ip)) {
        return res.status(403).send('You have already voted for this outfit.');
    }

    if (!votes[image]) {
        votes[image] = [];
    }
    votes[image].push(ip);
    fs.writeFileSync(DATA_PATH, JSON.stringify(votes));

    res.status(200).send('Vote counted.');
});

app.get('/images', (req, res) => {
    fs.readdir(UPLOAD_PATH, (err, files) => {
        if (err) {
            return res.status(500).send('Could not list images.');
        }
        const imageInfo = files.map(file => {
            const name = uploads[file] ? uploads[file].name : 'Unknown';
            return {
                filename: file,
                name: name,
                votes: (votes[file] || []).length
            };
        });
        res.json(imageInfo);
    });
});

app.get('/status', (req, res) => {
    const ip = req.ip;
    // For testing purposes, always allow uploading.
    res.json({
        hasUploaded: false
    });
});


app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});
