const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Explicitly serve index.html for the root path (Public Display)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files for admin panel (e.g., admin/admin.js, admin/style.css if they exist separately)
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Explicitly serve admin.html when someone navigates directly to /admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

// Middleware to parse JSON and URL-encoded data from incoming requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Path to your menu data files
const menuFilePath = path.join(__dirname, 'data', 'menu.json');
const availableFilePath = path.join(__dirname, 'data', 'available.json');

// --- API Endpoints ---

// 1. Get full menu for admin page and public page lookup
app.get('/api/menu', (req, res) => {
    fs.readFile(menuFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading menu file:', err);
            return res.status(500).send('Error loading menu.');
        }
        res.json(JSON.parse(data));
    });
});

// 2. Get currently available items for public display
app.get('/api/available-items', (req, res) => {
    fs.readFile(availableFilePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.json({ availableItems: [], lastUpdated: new Date().toISOString() });
            }
            console.error('Error reading available items file:', err);
            return res.status(500).send('Error loading available items.');
        }
        res.json(JSON.parse(data));
    });
});

// 3. Update available items (from admin page)
app.post('/api/update-availability', (req, res) => {
    const selectedItemIds = req.body.availableItems || [];
    const now = new Date();
    const dataToWrite = JSON.stringify({
        availableItems: selectedItemIds,
        lastUpdated: now.toISOString()
    }, null, 2);

    fs.writeFile(availableFilePath, dataToWrite, 'utf8', (err) => {
        if (err) {
            console.error('Error writing available items file:', err);
            return res.status(500).send('Error updating availability.');
        }
        res.status(200).send('Availability updated successfully!');
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // console.log(`Admin panel: http://localhost:${PORT}/admin`);
    // console.log(`Public display: http://localhost:${PORT}/`);
});