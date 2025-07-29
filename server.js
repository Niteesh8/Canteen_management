const express = require('express');
const path = require('path');
const fs = require('fs').promises; // Use promises version of fs for async/await
const bodyParser = require('body-parser'); // For parsing form data
const session = require('express-session'); // For session management
require('dotenv').config(); // Load environment variables from .env file (for local testing)

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuration ---

// CORRECTED: Use process.env directly with fallbacks for local development.
// This ensures that on Render, the environment variables you set there are used,
// while locally, they come from .env or use a default.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'localadmin'; // Default for local dev if .env missing
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'localpass';   // Default for local dev if .env missing
const SESSION_SECRET = process.env.SESSION_SECRET || 'a_very_long_and_random_string_for_session_secret!';

// CORRECTED: Consistent lowercase folder names for cross-platform compatibility (Linux on Render is case-sensitive).
// CORRECTED: 'available.json' changed to 'available_items.json' to match common project setup.
const MENU_FILE = path.join(__dirname, 'Data', 'menu.json');
const AVAILABILITY_FILE = path.join(__dirname, 'Data', 'available.json');

// --- Middleware ---

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// CORRECTED: 'Admin' changed to 'admin' (lowercase)
app.use('/admin', express.static(path.join(__dirname, 'Admin')));

// Parse URL-encoded bodies (from HTML forms, like login)
app.use(bodyParser.urlencoded({ extended: true }));
// Parse JSON bodies (for API requests like updating availability)
app.use(bodyParser.json());

// Session middleware configuration - MUST come before routes that use sessions
app.use(session({
    secret: SESSION_SECRET, // The secret used to sign the session ID cookie
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 hours (cookie expiration in milliseconds)
        // 'secure: true' ensures cookies are only sent over HTTPS.
        // For local development (HTTP), process.env.NODE_ENV is usually undefined or 'development',
        // so 'secure' will be false. It will be true in production (Render uses HTTPS) because
        // you will set NODE_ENV=production on Render.
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true // Prevents client-side JavaScript from accessing the cookie
    }
}));

// Middleware to check if user is authenticated for admin routes
function isAuthenticated(req, res, next) {
    // Debugging logs for session state (Enhanced for Render diagnostics)
    console.log('\n--- isAuthenticated middleware hit ---');
    console.log('Request URL:', req.originalUrl);
    console.log('NODE_ENV (in isAuthenticated):', process.env.NODE_ENV); // Verify NODE_ENV on Render
    console.log('Secure cookie setting (derived):', process.env.NODE_ENV === 'production'); // Shows what the cookie secure flag evaluates to
    console.log('Session ID:', req.sessionID); // Unique ID for each session
    console.log('Is Authenticated (from session):', req.session.isAuthenticated); // CRITICAL: This needs to be 'true' after login
    console.log('--- End isAuthenticated check ---');

    if (req.session.isAuthenticated) {
        console.log('User IS authenticated. Proceeding to next.');
        next(); // User is authenticated, proceed to the next middleware or route handler
    } else {
        console.log('User NOT authenticated. Redirecting to /login.');
        res.redirect('/login'); // Redirect to login page if not authenticated
    }
}

// --- Routes ---

// Route for the public menu display page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for the login page
app.get('/login', (req, res) => {
    // If user is already authenticated, redirect them directly to the admin panel
    if (req.session.isAuthenticated) {
        console.log('Already authenticated, redirecting from /login to /admin.');
        return res.redirect('/admin');
    }
    // Otherwise, serve the login page
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle login form submission
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Debugging logs for login attempt
    console.log('\n--- Login attempt POST /login ---');
    console.log(`Attempted username: ${username}`);
    // IMPORTANT: DO NOT LOG SENSITIVE PASSWORDS IN PRODUCTION! This is for debugging only.
    console.log(`Configured username: ${ADMIN_USERNAME}`); // Only log username for security

    // Authenticate user against environment variables
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isAuthenticated = true; // Mark session as authenticated
        req.session.username = username; // Optionally store username in session for display or further checks
        console.log('Login successful! Session set to isAuthenticated:', req.session.isAuthenticated);
        // CORRECTED: Added log to see session content immediately after setting it
        console.log('req.session content (after setting):', JSON.stringify(req.session));
        console.log('Redirecting to /admin...');
        // Save session before redirecting to ensure it's persisted (important for some session stores)
        req.session.save(err => {
            if (err) {
                console.error('Error saving session after login:', err);
                return res.status(500).send('Login successful, but session could not be saved.');
            }
            // CORRECTED: Added log to confirm session save before redirect
            console.log('Session saved successfully. Issuing redirect to /admin.');
            res.redirect('/admin'); // Redirect to the protected admin panel on successful login
        });
    } else {
        console.log('Login failed: Invalid username or password.');
        // If authentication fails, send back a simple HTML response indicating failure
        res.status(401).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Login Failed</title>
                <link rel="stylesheet" href="/style.css"> <style>
                    /* Basic styling for the error message page/snippet */
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
    console.log('--- Logout GET /logout ---');
    req.session.destroy(err => { // Destroy the session associated with the request
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Could not log out.');
        }
        res.clearCookie('connect.sid'); // Clear the session cookie from the client's browser
        console.log('Session destroyed, cookie cleared. Redirecting to /login.');
        res.redirect('/login'); // Redirect to login page after successful logout
    });
});

// Protected route for the admin panel - uses isAuthenticated middleware
app.get('/admin', isAuthenticated, (req, res) => {
    console.log('--- Accessing /admin route (authenticated) ---');
    // CORRECTED: 'Admin' changed to 'admin' (lowercase)
    res.sendFile(path.join(__dirname, 'Admin', 'admin.html'));
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
    console.log('--- Update Availability API hit (authenticated) ---');
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
    console.log('--- Server Started ---');
});