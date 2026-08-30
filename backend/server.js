// Force IPv4 DNS resolution globally (prevents ENETUNREACH on IPv6)
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const connectDB = require('./config/db');
const dbCheck = require('./middleware/dbCheck');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check route (available even while MongoDB is connecting)
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'PCCOE Campus Interview Platform API is running',
        timestamp: new Date().toISOString()
    });
});

// Fail fast on API routes while the database is disconnected
app.use('/api', dbCheck);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/experiences', require('./routes/experiences'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/bookmarks', require('./routes/bookmarks'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/calendar', require('./routes/calendar'));

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/admin.html'));
});

app.get('/submit', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/submit.html'));
});

app.get('/experience/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/experience.html'));
});

app.get('/experiences', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/experiences.html'));
});

app.get('/questions', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/questions.html'));
});

app.get('/calendar', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/calendar.html'));
});

app.get('/company/:name', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/company.html'));
});

// 404 handler
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ success: false, message: 'API endpoint not found' });
    } else {
        res.sendFile(path.join(__dirname, '../frontend/html/404.html'));
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
});
