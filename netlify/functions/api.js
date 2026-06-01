const express = require('express');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const cors = require('cors');
const serverless = require('serverless-http'); // Import the wrapper

const app = express();
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BASE_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json"
};

// Helper to keep paths URL-safe
const sanitize = (str) => str.trim().replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/ /g, '_');

// 1. UPLOAD A PAPER INTO NESTED FOLDERS
app.post('/api/upload', async (req, res) => {
    try {
        if (!req.files || !req.files.paper) return res.status(400).send('No file uploaded.');
        
        const { subject, school, className, year } = req.body;
        if (!subject || !school || !className || !year) {
            return res.status(400).send('Missing required fields.');
        }

        const file = req.files.paper;
        const contentBase64 = file.data.toString('base64');

        // Target path: schools/Subject/School_Name/Class/Year/filename.pdf
        const targetPath = `schools/${sanitize(subject)}/${sanitize(school)}/${sanitize(className)}/${sanitize(year)}/${sanitize(file.name)}`;

        await axios.put(`${BASE_URL}/${targetPath}`, {
            message: `Archived: ${file.name}`,
            content: contentBase64
        }, { headers });

        res.status(200).json({ message: "Paper uploaded successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.response?.data?.message || error.message });
    }
});

// 2. DYNAMIC NAVIGATION ENDPOINT FOR DROPDOWNS
app.get('/api/navigation', async (req, res) => {
    const targetFolder = req.query.path ? `schools/${req.query.path}` : 'schools';
    try {
        const response = await axios.get(`${BASE_URL}/${targetFolder}`, { headers });
        
        const items = response.data.map(item => ({
            name: item.name.replace(/_/g, ' '), // Pretty name for dropdowns
            rawName: item.name,                // Folder name for API paths
            type: item.type,                   // 'dir' or 'file'
            downloadUrl: item.download_url
        }));
        res.status(200).json(items);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(200).json([]);
        }
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
module.exports.handler = serverless(app);
