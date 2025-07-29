const express = require('express');
const path = require('path');
const fs = require('fs').promises; // Use promises version of fs
const bodyParser = require('body-parser'); // For parsing form data
const session = require('express-session'); // For session management
require('dotenv').config(); // Load environment variables from .env file (for local testing)

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuration ---

// Use environment variables for sensitive data
// These will be pulled from .env locally, and from Render's Environment Variables in production
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'default_admin'; // Fallback for development, should be set in .env or Render
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'default_password'; // Fallback for development, should be set in .env or Render
const SESSION_SECRET = process.env.SESSION_SECRET || 'superSecretDefaultKeyForSessions!'; // Fallback for development, should be set in .env or Render

const MENU_FILE = path.join(__dirname, 'Data', 'menu.json'); // Corrected path to 'Data'
const AVAILABILITY_FILE = path.join(__dirname, 'Data', 'available.json'); // Corrected path to 'Data'

// --- Middleware ---

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'Public'))); // Corrected path to 'Public'
// Serve static files (CSS, JS) from the 'Admin' directory specifically under the /admin path
app.use('/admin', express.static(path.join(__dirname, 'Admin'))); // Corrected path to 'Admin'

// Parse URL-encoded bodies (from HTML forms, like login)
app.use(bodyParser.urlencoded({ extended: true }));
// Parse JSON bodies (for API requests like updating availability)
app.use(bodyParser.json());

// Session middleware configuration
app.use(session({
    secret: SESSION_SECRET, // Use the secret loaded from .env or Render's env vars
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 hours (cookie expiration)
        secure: process.env.NODE_ENV === 'production', // Use secure cookies (HTTPS) in production
        httpOnly: true // Prevent client-side JS from accessing the cookie
    }
}));

// Middleware to check if user is authenticated for admin routes
function isAuthenticated(req, res, next) {
    if (req.session.isAuthenticated) {
        next(); // User is authenticated, proceed to the next middleware or route handler
    } else {
        res.redirect('/login'); // Redirect to login page if not authenticated
    }
}

// --- Routes ---

// Route for the public menu display page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html')); // Corrected path to 'Public'
});

// Route for the login page
app.get('/login', (req, res) => {
    // If already authenticated, redirect to admin panel to avoid showing login page unnecessarily
    if (req.session.isAuthenticated) {
        return res.redirect('/admin');
    }
    res.sendFile(path.join(__dirname, 'Public', 'login.html')); // Corrected path to 'Public'
});

// Handle login form submission
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Basic authentication: Check if provided credentials match configured ADMIN_USERNAME and ADMIN_PASSWORD
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isAuthenticated = true; // Mark session as authenticated
        req.session.username = username; // Optionally store username in session
        res.redirect('/admin'); // Redirect to the protected admin panel on success
    } else {
        // If authentication fails, render a simple error page
        res.status(401).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Login Failed</title>
                <link rel="stylesheet" href="/style.css"> <style>
                    body {
                        font-family: 'Arial', sans-serif;
                        background-color: #f4f4f4;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                    }
                    .container {
                        background-color: #ffffff;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        text-align: center;
                        width: 90%;
                        max-width: 400px;
                    }
                    .button {
                        display: inline-block;
                        background-color: #dc3545; /* Red for "Try Again" on error */
                        color: white;
                        padding: 10px 20px;
                        border-radius: 5px;
                        text-decoration: none;
                        margin-top: 20px;
                    }
                    .button:hover {
                        background-color: #c82333;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Login Failed</h1>
                    <p style="color: red;">Invalid username or password.</p>
                    <a href="/login" class="button">Try Again</a>
                </div>
            </body>
            </html>
        `);
    }
});

// Handle logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => { // Destroy the session associated with the request
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Could not log out.');
        }
        res.clearCookie('connect.sid'); // Clear the session cookie from the client's browser
        res.redirect('/login'); // Redirect to login page after successful logout
    });
});

// Protected route for the admin panel - uses isAuthenticated middleware
app.get('/admin', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'Admin', 'admin.html')); // Corrected path to 'Admin'
});

// API endpoint to get full menu data
app.get('/api/menu', async (req, res) => {
    try {
        const data = await fs.readFile(MENU_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading menu file:', error);
        res.status(500).send('Error fetching menu data.');
    }
});

// API endpoint to get currently available items
app.get('/api/available-items', async (req, res) => {
    try {
        const data = await fs.readFile(AVAILABILITY_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading available items file:', error);
        res.status(500).send('Error fetching available items.');
    }
});

// API endpoint to update available items - protected by authentication
app.post('/api/update-availability', isAuthenticated, async (req, res) => {
    const { availableItems } = req.body;
    try {
        // Write the updated available items to the JSON file
        await fs.writeFile(AVAILABILITY_FILE, JSON.stringify({ availableItems }, null, 2), 'utf8');
        res.send('Availability updated successfully!');
    } catch (error) {
        console.error('Error writing available items file:', error);
        res.status(500).send('Error updating availability.');
    }
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Public display: http://localhost:${PORT}/`);
    console.log(`Admin login: http://localhost:${PORT}/login`);
});