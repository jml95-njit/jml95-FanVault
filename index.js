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

// --- SECURITY & AUTHENTICATION ---
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
        if (!username || typeof username !== 'string' || !password || typeof password !== 'string') return res.status(400).json({ error: "Invalid input format." });
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d!@#$%^&*]).{6,}$/;
        if (!passwordRegex.test(password)) return res.status(400).json({ error: "Password must be at least 6 characters and include uppercase, lowercase, and a number or symbol." });
        
        const db = client.db(dbName);
        const existingUser = await db.collection('users').findOne({ username: username });
        if (existingUser) return res.status(409).json({ error: "Username already exists." });
        
        const securedPassword = hashPassword(password);
        await db.collection('users').insertOne({ username, passwordHash: securedPassword, createdAt: new Date() });
        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) { res.status(500).json({ error: "Internal Server Error" }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || typeof username !== 'string' || !password || typeof password !== 'string') return res.status(400).json({ error: "Invalid input format." });
        const user = await client.db(dbName).collection('users').findOne({ username: username });
        if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: "Invalid username or password." });
        res.status(200).json({ message: "Login successful!" });
    } catch (error) { res.status(500).json({ error: "Internal Server Error" }); }
});

// --- SEARCH SANITIZATION (CARD 5) ---
app.get('/api/search', async (req, res) => {
    try {
        let query = req.query.q;
        if (!query || typeof query !== 'string') return res.status(400).json({ error: "Search query required." });
        
        const originalQuery = query;
        query = query.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 50);
        if (originalQuery !== query) writeLog(`[WARNING] Sanitized malicious search. Original: "${originalQuery}", Cleaned: "${query}"`);

        const results = await client.db(dbName).collection('artists').find({ name: { $regex: query, $options: 'i' } }).toArray();
        res.status(200).json(results);
    } catch (error) { res.status(500).json({ error: "Internal Server Error" }); }
});

app.get('/api/merch', async (req, res) => {
    try {
        const results = await client.db(dbName).collection('merch').find({}).toArray();
        res.status(200).json(results);
    } catch (error) { res.status(500).json({ error: "Internal Server Error" }); }
});

async function startServer() {
    try {
        await client.connect();
        writeLog("[SUCCESS] SECURE LINK ESTABLISHED: Connected to FanVault Database!");
        const db = client.db(dbName);
        
        // RE-SEED 5 ITEMS WITH IMAGES (CARD 2)
        const merchCollection = db.collection('merch');
        await merchCollection.deleteMany({}); // Clear old data
        await merchCollection.insertMany([
            { name: "World Tour T-Shirt", description: "Official 2026 Tour Merch", price: 35.00, image: "https://via.placeholder.com/200/222222/FFFFFF/?text=T-Shirt" },
            { name: "Limited Edition Vinyl", description: "Exclusive Colorway", price: 28.00, image: "https://via.placeholder.com/200/333333/FFFFFF/?text=Vinyl" },
            { name: "FanVault Hoodie", description: "Premium Heavyweight Cotton", price: 65.00, image: "https://via.placeholder.com/200/111111/FFFFFF/?text=Hoodie" },
            { name: "Signed Tour Poster", description: "Autographed 18x24 Poster", price: 45.00, image: "https://via.placeholder.com/200/444444/FFFFFF/?text=Poster" },
            { name: "VIP Backstage Pass", description: "Commemorative Lanyard", price: 15.00, image: "https://via.placeholder.com/200/555555/FFFFFF/?text=Pass" }
        ]);
        writeLog("[SYSTEM] Seeded 5 new merch items with images.");

        app.listen(port, () => writeLog(`[SYSTEM] FanVault API is actively listening on port ${port}`));
    } catch (error) { writeLog(`[ERROR] Connection Failed: ${error.message}`); }
}
startServer();
