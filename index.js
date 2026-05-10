const express = require('express');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const fs = require('fs');
const speakeasy = require('speakeasy'); // NEW: MFA Math Library
const QRCode = require('qrcode');       // NEW: QR Code Generator

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

// --- UPGRADED MFA REGISTRATION ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || typeof username !== 'string' || !password || typeof password !== 'string') return res.status(400).json({ error: "Invalid input." });
        
        const db = client.db(dbName);
        const existingUser = await db.collection('users').findOne({ username: username });
        if (existingUser) return res.status(409).json({ error: "Username already exists." });
        
        // 1. Generate MFA Secret
        const secret = speakeasy.generateSecret({ name: `FanVault (${username})` });
        const securedPassword = hashPassword(password);
        
        // 2. Save User + MFA Secret to Database
        await db.collection('users').insertOne({ 
            username, 
            passwordHash: securedPassword, 
            mfaSecret: secret.base32, // Save the secret!
            createdAt: new Date() 
        });

        // 3. Generate QR Code Image URL to send to Front-End
        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) return res.status(500).json({ error: "Failed to generate QR code" });
            writeLog(`[SUCCESS] User registered with MFA: ${username}`);
            // Send the QR code back so the user can scan it
            res.status(201).json({ message: "Registration successful!", qrCode: data_url });
        });

    } catch (error) { res.status(500).json({ error: "Internal Server Error" }); }
});

// --- UPGRADED MFA LOGIN ---
app.post('/api/login', async (req, res) => {
    try {
        // We now accept an optional 'mfaCode' from the Front-End
        const { username, password, mfaCode } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Invalid input." });
        
        const user = await client.db(dbName).collection('users').findOne({ username: username });
        if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: "Invalid username or password." });
        
        // If the password is correct, but they haven't sent an MFA code yet:
        if (!mfaCode) {
            return res.status(200).json({ requireMFA: true, message: "Password correct, please enter Authenticator code." });
        }

        // If they sent an MFA code, verify it!
        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token: mfaCode
        });

        if (verified) {
            writeLog(`[SUCCESS] Full MFA Login successful for: ${username}`);
            res.status(200).json({ message: "Login successful!" });
        } else {
            writeLog(`[WARNING] Failed MFA attempt for: ${username}`);
            res.status(401).json({ error: "Invalid Authenticator code." });
        }

    } catch (error) { res.status(500).json({ error: "Internal Server Error" }); }
});

// ... [Search, Merch, and Ticketmaster Routes remain identical below] ...
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

app.get('/api/tour', async (req, res) => {
    try {
        const keyword = req.query.q;
        if (!keyword) return res.status(400).json({ error: "Artist name required" });
        const apiKey = "CXXIXXXXXX4s9Aie"; 
        const tmUrl = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(keyword)}&classificationName=music&apikey=${apiKey}`;
        const response = await fetch(tmUrl);
        const data = await response.json();
        let tours = [];
        if (data._embedded && data._embedded.events) {
            tours = data._embedded.events.slice(0, 5).map(event => {
                let socials = {};
                if (event._embedded && event._embedded.attractions && event._embedded.attractions[0].externalLinks) {
                    const links = event._embedded.attractions[0].externalLinks;
                    if (links.instagram) socials.instagram = links.instagram[0].url;
                    if (links.twitter) socials.twitter = links.twitter[0].url;
                    if (links.youtube) socials.youtube = links.youtube[0].url;
                    if (links.homepage) socials.website = links.homepage[0].url;
                }
                return {
                    name: event.name,
                    date: event.dates?.start?.localDate || "TBA",
                    venue: event._embedded?.venues[0]?.name || "TBA",
                    city: event._embedded?.venues[0]?.city?.name || "TBA",
                    url: event.url,
                    socials: socials
                };
            });
        }
        res.status(200).json(tours);
    } catch (error) { res.status(500).json({ error: "External API Error" }); }
});

async function startServer() {
    try {
        await client.connect();
        writeLog("[SUCCESS] SECURE LINK ESTABLISHED: Connected to FanVault Database!");
        app.listen(port, () => writeLog(`[SYSTEM] FanVault API is actively listening on port ${port}`));
    } catch (error) { writeLog(`[ERROR] Connection Failed: ${error.message}`); }
}
startServer();
