const express = require('express');
const { MongoClient } = require('mongodb');
const crypto = require('crypto'); 

const app = express();
const port = 3000;

app.use(express.json());

const url = 'mongodb://192.168.10.30:27017';
const client = new MongoClient(url);

// Select the database and collection
const dbName = 'fanvault_db';
const collectionName = 'users';

// --- HELPER FUNCTION: Verify Password ---
function verifyPassword(password, storedHash) {
    const [salt, originalHash] = storedHash.split(':');
    const hashToVerify = crypto.scryptSync(password, salt, 64).toString('hex');
    return hashToVerify === originalHash;
}

// --- API ENDPOINT: User Login ---
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. INPUT VALIDATION
        if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
            return res.status(400).json({ error: "Invalid input format." });
        }

        const db = client.db(dbName);
        const users = db.collection(collectionName);

        // 2. FIND THE USER
        const user = await users.findOne({ username: username });
        if (!user) {
            return res.status(401).json({ error: "Invalid username or password." });
        }

        // 3. VERIFY THE PASSWORD
        const isMatch = verifyPassword(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid username or password." });
        }

        // 4. SUCCESS!
        console.log(`🟢 Successful login for: ${username}`);
        res.status(200).json({ message: "Login successful!" });

    } catch (error) {
        console.error("🔴 Login Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// --- BOOT UP ---
async function startServer() {
    try {
        await client.connect();
        console.log("SECURE LINK ESTABLISHED: Connected to FanVault Database!");
        
        app.listen(port, () => {
            console.log(`FanVault API is actively listening on port ${port}`);
        });
    } catch (error) {
        console.error("Connection Failed:", error);
    }
}

startServer();
