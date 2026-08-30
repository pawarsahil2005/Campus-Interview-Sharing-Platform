const mongoose = require('mongoose');
const https = require('https');

// Fetch current public IP for Atlas whitelist guidance
const getPublicIP = () => {
    return new Promise((resolve) => {
        https.get('https://api.ipify.org?format=json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data).ip); } catch { resolve(null); }
            });
        }).on('error', () => resolve(null));
    });
};

let dbConnected = false;
const RETRY_DELAY_MS = 30000; // retry every 30s

const connectDB = async () => {
    // Keep retrying in the background forever
    while (true) {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 10000,
            });
            dbConnected = true;
            console.log(`✅  MongoDB Connected: ${mongoose.connection.host}`);
            return; // Connected — exit the loop
        } catch (error) {
            dbConnected = false;
            const isIPError = /whitelist|IP access|network access/i.test(error.message);

            if (isIPError) {
                const ip = await getPublicIP();
                console.error('\n🔴  MongoDB Atlas — IP not whitelisted!');
                if (ip) {
                    console.error(`   ➜  Your current IP : ${ip}`);
                    console.error(`   ➜  Quick fix       : Go to Atlas → Security → Network Access → Add IP: ${ip}`);
                }
                console.error('   ➜  Permanent fix   : Add 0.0.0.0/0 to allow connections from any IP (development only)');
                console.error('   ➜  Atlas URL        : https://cloud.mongodb.com');
            } else {
                console.error(`⚠️   MongoDB error: ${error.message}`);
            }

            console.warn(`   ⏳  Retrying connection in ${RETRY_DELAY_MS / 1000}s  (server stays running)\n`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
};

// Export connection status checker
connectDB.isConnected = () => dbConnected;

module.exports = connectDB;