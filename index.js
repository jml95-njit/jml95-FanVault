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
    // ... [Auth logic remains identical] ...
    res.status(201).json({ message: "Auth placeholder" });
});

app.post('/api/login', async (req, res) => {
    // ... [Auth logic remains identical] ...
    res.status(200).json({ message: "Auth placeholder" });
});

app.get('/api/search', async (req, res) => {
    try {
        let query = req.query.q;
        if (!query || typeof query !== 'string') return res.status(400).json({ error: "Search query required." });
        query = query.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 50);
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

// --- NEW TICKETMASTER PROXY ROUTE ---
app.get('/api/tour', async (req, res) => {
    try {
        const keyword = req.query.q;
        if (!keyword) return res.status(400).json({ error: "Artist name required" });

        // Your Ticketmaster API Key
        const apiKey = "CXXIhVKDejj1pGZTxTuerxw3AY4s9Aie"; 
        const tmUrl = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(keyword)}&classificationName=music&apikey=${apiKey}`;

        // Fetch from Ticketmaster using Native Node.js Fetch
        const response = await fetch(tmUrl);
        const data = await response.json();

        // Extract just the top 5 events so Angular isn't overwhelmed
        let tours = [];
        if (data._embedded && data._embedded.events) {
            tours = data._embedded.events.slice(0, 5).map(event => ({
                name: event.name,
                date: event.dates?.start?.localDate || "TBA",
                venue: event._embedded?.venues[0]?.name || "TBA",
                city: event._embedded?.venues[0]?.city?.name || "TBA",
                url: event.url
            }));
        }
        
        writeLog(`[INFO] External API Call: Ticketmaster queried for "${keyword}". Found ${tours.length} events.`);
        res.status(200).json(tours);

    } catch (error) {
        writeLog(`[ERROR] Ticketmaster Fetch Failed: ${error.message}`);
        res.status(500).json({ error: "External API Error" });
    }
});

async function startServer() {
    try {
        await client.connect();
        writeLog("[SUCCESS] SECURE LINK ESTABLISHED: Connected to FanVault Database!");
        app.listen(port, () => writeLog(`[SYSTEM] FanVault API is actively listening on port ${port}`));
    } catch (error) { writeLog(`[ERROR] Connection Failed: ${error.message}`); }
}
startServer();
