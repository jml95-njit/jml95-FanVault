const express = require('express');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const fs = require('fs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

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
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Username and password are required." });
        
        const db = client.db(dbName);
        const existingUser = await db.collection('users').findOne({ username: username });
        if (existingUser) return res.status(409).json({ error: "Username already exists." });
        
        const secret = speakeasy.generateSecret({ name: `FanVault:${username}`, issuer: 'FanVault' });
        const securedPassword = hashPassword(password);
        
        await db.collection('users').insertOne({ 
            username, passwordHash: securedPassword, mfaSecret: secret.base32, createdAt: new Date() 
        });

        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) return res.status(500).json({ error: "Failed to generate QR code." });
            writeLog(`[SUCCESS] User registered with MFA: ${username}`);
            res.status(201).json({ message: "Registration successful!", qrCode: data_url });
        });
    } catch (error) { 
        res.status(500).json({ error: "Internal Server Error" }); 
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password, mfaCode } = req.body;
        const user = await client.db(dbName).collection('users').findOne({ username: username });
        
        if (!user || !verifyPassword(password, user.passwordHash)) {
            return res.status(401).json({ error: "Invalid username or password." });
        }
        
        if (!mfaCode) return res.status(200).json({ requireMFA: true });

        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token: mfaCode,
            window: 2 
        });

        if (verified) {
            writeLog(`[SUCCESS] MFA Login: ${username}`);
            res.status(200).json({ message: "Login successful!" });
        } else {
            writeLog(`[WARNING] Invalid MFA: ${username}`);
            res.status(401).json({ error: "Invalid code." });
        }
    } catch (error) { 
        res.status(500).json({ error: "Internal Server Error" }); 
    }
});

app.get('/api/search', async (req, res) => {
    try {
        let rawQuery = req.query.q;
        if (!rawQuery) return res.status(400).json({ error: "Search query required." });

        // 1. Security Check FIRST
        if (typeof rawQuery !== 'string') rawQuery = String(rawQuery);
        const suspiciousPattern = /[<>$\{\}]/g;
        
        if (rawQuery.length > 50 || suspiciousPattern.test(rawQuery)) {
            writeLog(`[SECURITY ALERT] Malicious search blocked! IP: ${req.ip || 'Unknown'} | Input: ${rawQuery}`);
            return res.status(403).json({ error: "Security violation: Invalid search characters detected." });
        }

        // 2. Check Local DB
        let results = await client.db(dbName).collection('artists').find({ name: { $regex: rawQuery, $options: 'i' } }).toArray();

        // 3. Fallback to TheAudioDB API if not in local database
        if (results.length === 0) {
            const tadbUrl = `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(rawQuery)}`;
            const response = await fetch(tadbUrl);
            const data = await response.json();

            if (data.artists) {
                results = data.artists.map(a => ({
                    name: a.strArtist,
                    genre: a.strGenre,
                    imageUrl: a.strArtistThumb, 
                    bio: a.strBiographyEN ? a.strBiographyEN.split('.')[0] + '.' : "No bio available.",
                    isExternal: true
                }));
            }
        }
        res.status(200).json(results);
    } catch (error) { 
        res.status(500).json({ error: "Internal Server Error" }); 
    }
});

app.get('/api/merch', async (req, res) => {
    try {
        const results = await client.db(dbName).collection('merch').find({}).toArray();
        res.status(200).json(results);
    } catch (error) { res.status(500).json({ error: "Internal Server Error" }); }
});

app.get('/api/tour', async (req, res) => {
    try {
        let keyword = req.query.q;
        if (!keyword || typeof keyword !== 'string') return res.status(400).json({ error: "Invalid query." });

        const suspiciousPattern = /[<>$\{\}]/g;
        if (keyword.length > 50 || suspiciousPattern.test(keyword)) {
            writeLog(`[SECURITY ALERT] Malicious proxy request blocked! Input: ${keyword}`);
            return res.status(403).json({ error: "Security violation." });
        }

        const apiKey = "CXXIhVKDejj1pGZTxTuerxw3AY4s9Aie"; 
        const tmUrl = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(keyword)}&classificationName=music&apikey=${apiKey}`;
        const response = await fetch(tmUrl);
        const data = await response.json();
        
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
        res.status(200).json(tours);
    } catch (error) { 
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
