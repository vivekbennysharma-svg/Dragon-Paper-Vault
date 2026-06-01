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

// Validate base64 string
const isValidBase64 = (str) => {
    try {
        return Buffer.from(str, 'base64').toString('base64') === str;
    } catch (err) {
        return false;
    }
};

// 1. FIXED UPLOAD ROUTE FOR SERVERLESS
app.post('/api/upload', async (req, res) => {
    try {
        const { subject, school, className, year, fileName, fileData } = req.body;
        
        // Ensure Netlify is receiving data
        if (!subject || !school || !className || !year || !fileName || !fileData) {
            return res.status(400).json({ error: "Missing required form fields or file details." });
        }

        // Validate base64 encoding
        if (!isValidBase64(fileData)) {
            return res.status(400).json({ error: "Invalid file data encoding. Expected base64." });
        }

        // Validate file extension
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt', '.xlsx', '.xls', '.ppt', '.pptx'];
        const fileExt = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
        if (!fileExt || !allowedExtensions.includes(fileExt)) {
            return res.status(400).json({ error: `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}` });
        }

        // Target folder tree path structure - preserve filename, sanitize folders only
        const targetPath = `schools/${sanitize(subject)}/${sanitize(school)}/${sanitize(className)}/${sanitize(year)}/${fileName}`;

        let fileSha = null;

        // Check if file already exists and get its SHA
        try {
            const existingFile = await axios.get(`${BASE_URL}/${targetPath}`, { headers });
            fileSha = existingFile.data.sha;
        } catch (error) {
            // File doesn't exist (404), that's okay - we're creating it
            if (error.response?.status !== 404) {
                throw error;
            }
        }

        // Upload/update the file
        const uploadPayload = {
            message: `Archived: ${fileName}`,
            content: fileData
        };

        // Only include sha if file already exists
        if (fileSha) {
            uploadPayload.sha = fileSha;
        }

        await axios.put(`${BASE_URL}/${targetPath}`, uploadPayload, { headers });

        res.status(200).json({ message: "Paper successfully saved to GitHub archive!" });
    } catch (error) {
        console.error('Upload error:', error.response?.data || error.message);
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
        console.error('Navigation error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// 3. DOWNLOAD ROUTE
app.get('/api/download', async (req, res) => {
    try {
        const { filepath } = req.query;
        
        if (!filepath) {
            return res.status(400).json({ error: "Missing filepath parameter." });
        }

        const targetPath = `schools/${filepath}`;
        const response = await axios.get(`${BASE_URL}/${targetPath}`, { headers });
        
        const fileBuffer = Buffer.from(response.data.content, 'base64');
        const fileName = response.data.name;
        
        res.set('Content-Disposition', `attachment; filename="${fileName}"`);
        res.set('Content-Type', 'application/octet-stream');
        res.send(fileBuffer);
    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({ error: "File not found." });
        }
        console.error('Download error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports.handler = serverless(app);
