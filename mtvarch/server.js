const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Load configuration
let config = {};
try {
    config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
} catch (error) {
    console.warn('Configuration file not found, using defaults:', error.message);
    config = {
        flashDrivePath: './public/assets',
        defaultAssetsPath: './public/assets'
    };
}

const app = express();
const PORT = 5500;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Cloudflare headers for API requests
const CLOUDFLARE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json',
    'Origin': 'https://mtvarchive.proxyplayground.com',
    'Referer': 'https://mtvarchive.proxyplayground.com/'
};

// Password verification endpoint
app.post('/api/verify', (req, res) => {
    const { password, serviceName } = req.body;
    
    if (!password || !serviceName) {
        return res.status(400).json({ valid: false });
    }
    
    const rawPwd = password;
    const cleanedPwd = rawPwd.trim();
    
    console.log('\n' + '='.repeat(60));
    console.log(`[🔍 VERIFICATION] Service: ${serviceName}`);
    console.log(`Password length (raw): ${rawPwd.length} chars`);
    console.log(`Password length (trimmed): ${cleanedPwd.length} chars`);
    
    if (cleanedPwd.length !== rawPwd.length) {
        const wsRemoved = rawPwd.length - cleanedPwd.length;
        console.log(`[💡] TRIM APPLIED: Removed ${wsRemoved} whitespace character(s)`);
    }
    
    if (!cleanedPwd || serviceName !== 'adea') {
        console.log('[❌] REJECTED: Empty password or invalid service');
        return res.json({ valid: false });
    }
    
    const apiPayload = JSON.stringify({
        password: cleanedPwd,
        serviceName: 'adea'
    });
    
    const reqOptions = {
        hostname: 'techsusindustries.com',
        port: 443,
        path: '/api/validate-service-password',
        method: 'POST',
        headers: {
            ...CLOUDFLARE_HEADERS,
            'Content-Length': Buffer.byteLength(apiPayload)
        }
    };
    
    const apiReq = https.request(reqOptions, (apiRes) => {
        let data = '';
        apiRes.on('data', (chunk) => { data += chunk; });
        apiRes.on('end', () => {
            try {
                const apiResponse = JSON.parse(data);
                console.log(`[✅ API] Response: valid=${apiResponse.valid}`);
                
                if (apiResponse.valid === true) {
                    console.log('[🎉] ACCESS GRANTED');
                    res.json({ valid: true });
                } else {
                    console.log('[❌] API rejected credentials');
                    res.json({ valid: false });
                }
            } catch (e) {
                console.log('[🔥 PARSE ERROR] Invalid JSON response');
                res.json({ valid: false });
            }
        });
    });
    
    apiReq.on('error', (e) => {
        console.log(`[🔥 CONNECTION ERROR] ${e.message}`);
        res.json({ valid: false, debug: 'conn_err' });
    });
    
    apiReq.write(apiPayload);
    apiReq.end();
});

// Serve static files from the flash drive path if configured
if (config.flashDrivePath && config.flashDrivePath !== '') {
    app.use('/assets', express.static(config.flashDrivePath));
    console.log(`Serving flash drive assets from: ${config.flashDrivePath}`);
} else {
    console.log('No flash drive path configured, using default assets path');
}

// Endpoint to fetch the library configuration
app.get('/api/data', (req, res) => {
    const dataPath = path.join(__dirname, 'data', 'metadata.json');
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading metadata');
        }
        res.json(JSON.parse(data));
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n==================================================`);
    console.log(`Media Library Server Running!`);
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`LAN access: http://192.168.86.25:${PORT}`);
    console.log(`==================================================\n`);
});
