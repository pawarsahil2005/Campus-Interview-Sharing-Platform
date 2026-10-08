/**
 * Helper: show your current public IP + Atlas whitelist instructions
 * Usage: node scripts/add-ip.js
 */
const https = require('https');

https.get('https://api.ipify.org?format=json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const ip = JSON.parse(data).ip;
        console.log('\n====================================================');
        console.log('  MongoDB Atlas — IP Whitelist Helper');
        console.log('====================================================');
        console.log(`\n  Your current public IP : \x1b[32m${ip}\x1b[0m\n`);
        console.log('  Steps to whitelist it:');
        console.log('  1. Go to  https://cloud.mongodb.com');
        console.log('  2. Select your project → Security → Network Access');
        console.log(`  3. Click "Add IP Address" and enter: \x1b[32m${ip}\x1b[0m`);
        console.log('');
        console.log('  \x1b[33mDev tip\x1b[0m: Use 0.0.0.0/0 to allow all IPs (development only).');
        console.log('====================================================\n');
    });
}).on('error', () => {
    console.error('Could not fetch your public IP (are you offline?)');
});