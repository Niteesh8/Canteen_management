const express = require('express');
const bodyParser = require('body-parser'); // To parse form data
const fs = require('fs'); // Node.js file system module
const path = require('path'); // Node.js path module

const app = express();
const PORT = 3000; // You can choose any available port

// Middleware to serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin'))); // For admin files

// Middleware to parse JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Path to your menu data files
const menuFilePath = path.join(__dirname, 'data', 'menu.json');
const availableFilePath = path.join(__dirname, 'data', 'available.json');

// --- API Endpoints ---

// 1. Get full menu for admin page
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
            // If file doesn't exist yet, return empty list
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
    const selectedItemIds = req.body.availableItems || []; // Get selected IDs from checkboxes
    const now = new Date();
    const dataToWrite = JSON.stringify({
        availableItems: selectedItemIds,
        lastUpdated: now.toISOString()
    }, null, 2); // null, 2 for pretty printing

    fs.writeFile(availableFilePath, dataToWrite, 'utf8', (err) => {
        if (err) {
            console.error('Error writing available items file:', err);
            return res.status(500).send('Error updating availability.');
        }
        res.status(200).send('Availability updated successfully!');
    });
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`Public display: http://localhost:${PORT}/`);
});