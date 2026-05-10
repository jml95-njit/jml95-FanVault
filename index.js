const express = require('express');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(express.json());

function writeLog(message) {
    const timestamp = new Date().toISOString();
    const finalMessage = `[${timestamp}] ${message}`;
    console.log(finalMessage);
    fs.appendFileSync('server.log', finalMessage + '\n');
}

app.use((req, res, next) => {
    writeLog(`[INFO] Incoming Request: ${req.method} ${req.url}`);
    next();
});

const url = 'mongodb://192.168.10.30:27017';
const client = new MongoClient(url);
const dbName = 'fanvault_db';
const usersCollection = 'users';
const artistsCollection = 'artists'; 

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    const [salt, originalHash] = storedHash.split(':');
    const hashToVerify = crypto.scryptSync(password, salt, 64).toString('hex');
    return hashToVerify === originalHash;
}

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
            return res.status(400).json({ error: "Invalid input format." });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d!@#$%^&*]).{6,}$/;
        if (!passwordRegex.test(password)) {
            writeLog(`[REJECTED] Weak password attempt for: ${username}`);
            return res.status(400).json({ 
                error: "Password must be at least 6 characters and include uppercase, lowercase, and a number or symbol." 
            });
        }

        const db = client.db(dbName);
        const users = db.collection(usersCollection);
        const existingUser = await users.findOne({ username: username });
        
        if (existingUser) {
            return res.status(409).json({ error: "Username already exists." });
        }

        const securedPassword = hashPassword(password);
        await users.insertOne({ username, passwordHash: securedPassword, createdAt: new Date() });
        
        writeLog(`[SUCCESS] New user registered: ${username}`);
        res.status(201).json({ message: "User registered successfully!" });

    } catch (error) {
        writeLog(`[ERROR] Registration Error: ${error.message}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
            return res.status(400).json({ error: "Invalid input format." });
        }
        const db = client.db(dbName);
        const users = db.collection(usersCollection);
        const user = await users.findOne({ username: username });
        if (!user || !verifyPassword(password, user.passwordHash)) {
            return res.status(401).json({ error: "Invalid username or password." });
        }
        writeLog(`[SUCCESS] Successful login for: ${username}`);
        res.status(200).json({ message: "Login successful!" });
    } catch (error) {
        writeLog(`[ERROR] Login Error: ${error.message}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// --- NEW SEARCH API ---
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: "Search query required." });
        }

        const db = client.db(dbName);
        const artists = db.collection(artistsCollection);

        const results = await artists.find({ 
            name: { $regex: query, $options: 'i' } 
        }).toArray();

        writeLog(`[INFO] Search executed for: "${query}". Found ${results.length} results.`);
        res.status(200).json(results);
    } catch (error) {
        writeLog(`[ERROR] Search Error: ${error.message}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

async function startServer() {
    try {
        await client.connect();
        writeLog("[SUCCESS] SECURE LINK ESTABLISHED: Connected to FanVault Database!");
        
        // --- SEED DUMMY DATA FOR TESTING ---
        const db = client.db(dbName);
        const artists = db.collection(artistsCollection);
        const count = await artists.countDocuments();
        if (count === 0) {
            await artists.insertMany([
                { name: "Taylor Swift", genre: "Pop", nextTour: "London, UK" },
                { name: "The Weeknd", genre: "R&B", nextTour: "Paris, FR" },
                { name: "Bad Bunny", genre: "Reggaeton", nextTour: "Miami, FL" }
            ]);
            writeLog("[SYSTEM] Seeded dummy artists into database.");
        }

        app.listen(port, () => {
            writeLog(`[SYSTEM] FanVault API is actively listening on port ${port}`);
        });
    } catch (error) {
        writeLog(`[ERROR] Connection Failed: ${error.message}`);
    }
}
startServer();
