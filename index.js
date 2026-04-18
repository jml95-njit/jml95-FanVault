const express = require('express');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const app = express();
const port = 3000;

app.use(express.json());

// 📡 THE RADAR: Logs every incoming request!
app.use((req, res, next) => {
    console.log(`📡 Incoming Request: ${req.method} ${req.url}`);
    next();
});

const url = 'mongodb://192.168.10.30:27017';
const client = new MongoClient(url);
const dbName = 'fanvault_db';
const collectionName = 'users';

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
        const db = client.db(dbName);
        const users = db.collection(collectionName);
        const existingUser = await users.findOne({ username: username });
        if (existingUser) {
            return res.status(409).json({ error: "Username already exists." });
        }
        const securedPassword = hashPassword(password);
        await users.insertOne({ username, passwordHash: securedPassword, createdAt: new Date() });
        console.log(`🟢 New user registered: ${username}`);
        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        console.error("🔴 Registration Error:", error);
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
        const users = db.collection(collectionName);
        const user = await users.findOne({ username: username });
        if (!user || !verifyPassword(password, user.passwordHash)) {
            return res.status(401).json({ error: "Invalid username or password." });
        }
        console.log(`🟢 Successful login for: ${username}`);
        res.status(200).json({ message: "Login successful!" });
    } catch (error) {
        console.error("🔴 Login Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

async function startServer() {
    try {
        await client.connect();
        console.log("🟢 SECURE LINK ESTABLISHED: Connected to FanVault Database!");
        app.listen(port, () => {
            console.log(`🚀 FanVault API is actively listening on port ${port}`);
        });
    } catch (error) {
        console.error("🔴 Connection Failed:", error);
    }
}
startServer();
