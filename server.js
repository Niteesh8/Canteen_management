const express = require('express');
const bodyParser = require('body-parser'); // To parse form data
const fs = require('fs'); // Node.js file system module
const path = require('path'); // Node.js path module

// const app = express();
// // Use process.env.PORT for Render, or default to 3000 for local development
// const PORT = process.env.PORT || 3000; 

// // Middleware to serve static files (HTML, CSS, JS) from the 'public' folder
// app.use(express.static(path.join(__dirname, 'public')));

// // Explicitly serve index.html for the root path
// // This ensures that when someone visits your Render URL (e.g., https://your-app.onrender.com/),
// // it correctly serves the main public page.
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public','index.html'));
// });

// // Serve static files for admin panel (e.g., admin/admin.html, admin/admin.js)
// app.use('/admin', express.static(path.join(__dirname, 'admin'))); 
const app = express();
const PORT = process.env.PORT || 3000; // Corrected: use process.env.PORT for Render

// Middleware to serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Explicitly serve index.html for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files for admin panel (e.g., admin/admin.html, admin/admin.js)
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Middleware to parse JSON and URL-encoded data from incoming requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Path to your menu data files
const menuFilePath = path.join(__dirname, 'data', 'menu.json');
const availableFilePath = path.join(__dirname, 'data', 'available.json');

// --- API Endpoints ---

// 1. Get full menu for admin page
// This API is called by admin.js to populate the list of all possible menu items.
app.get('/api/menu', (req, res) => {
    fs.readFile(menuFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading menu file:', err);
            // Send a 500 status code and an error message if the file can't be read
            return res.status(500).send('Error loading menu.');
        }
        // Parse the JSON data and send it as a JSON response
        res.json(JSON.parse(data));
    });
});

// 2. Get currently available items for public display
// This API is called by public.js to show what's currently available.
app.get('/api/available-items', (req, res) => {
    fs.readFile(availableFilePath, 'utf8', (err, data) => {
        if (err) {
            // If the available.json file doesn't exist yet (e.g., first run),
            // return an empty list so the app doesn't crash.
            if (err.code === 'ENOENT') {
                return res.json({ availableItems: [], lastUpdated: new Date().toISOString() });
            }
            console.error('Error reading available items file:', err);
            // Send a 500 status code and an error message if the file can't be read
            return res.status(500).send('Error loading available items.');
        }
        // Parse the JSON data and send it as a JSON response
        res.json(JSON.parse(data));
    });
});

// 3. Update available items (from admin page)
// This API receives data from the admin panel to update available items.
app.post('/api/update-availability', (req, res) => {
    // Get the array of selected item IDs from the request body
    const selectedItemIds = req.body.availableItems || []; 
    const now = new Date(); // Get current timestamp
    
    // Create the data object to write to available.json
    const dataToWrite = JSON.stringify({
        availableItems: selectedItemIds,
        lastUpdated: now.toISOString() // Store timestamp in ISO format
    }, null, 2); // null, 2 makes the JSON output nicely formatted (pretty printed)

    // Write the data to the available.json file
    fs.writeFile(availableFilePath, dataToWrite, 'utf8', (err) => {
        if (err) {
            console.error('Error writing available items file:', err);
            return res.status(500).send('Error updating availability.');
        }
        // Send a success response
        res.status(200).send('Availability updated successfully!');
    });
});

// Start the server and listen for incoming requests
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // These console logs are useful for local development
    // console.log(`Admin panel: http://localhost:${PORT}/admin`);
    // console.log(`Public display: http://localhost:${PORT}/`);
});