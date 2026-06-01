const express = require('express');
const axios = require('axios');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();
app.use(cors());

// Increase payload parsing limit to handle files converted to base64 or JSON text
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BASE_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json"
};

const sanitize = (str) => str.trim().replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/ /g, '_');

// 1. FIXED UPLOAD ROUTE FOR SERVERLESS
app.post('/api/upload', async (req, res) => {
    try {
        const { subject, school, className, year, fileName, fileData } = req.body;
        
        // Ensure Netlify is receiving data
        if (!subject || !school || !className || !year || !fileName || !fileData) {
            return res.status(400).json({ error: "Missing required form fields or file details." });
        }

        // Target folder tree path structure
        const targetPath = `schools/${sanitize(subject)}/${sanitize(school)}/${sanitize(className)}/${sanitize(year)}/${sanitize(fileName)}`;

        await axios.put(`${BASE_URL}/${targetPath}`, {
            message: `Archived: ${fileName}`,
            content: fileData // React will send this pre-encoded as a clean Base64 block
        }, { headers });

        res.status(200).json({ message: "Paper successfully saved to GitHub archive!" });
    } catch (error) {
        res.status(500).json({ error: error.response?.data?.message || error.message });
    }
});

// 2. FIXED NAVIGATION ROUTE FOR SERVERLESS
app.get('/api/navigation', async (req, res) => {
    const targetFolder = req.query.path ? `schools/${req.query.path}` : 'schools';
    try {
        const response = await axios.get(`${BASE_URL}/${targetFolder}`, { headers });
        
        const items = response.data.map(item => ({
            name: item.name.replace(/_/g, ' '),
            rawName: item.name,
            type: item.type,
            downloadUrl: item.download_url
        }));
        res.status(200).json(items);
    } catch (error) {
        // Safe check for missing directory targets
        if (error.response && error.response.status === 404) {
            return res.status(200).json([]);
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports.handler = serverless(app);
