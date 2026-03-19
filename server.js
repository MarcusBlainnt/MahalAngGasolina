const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./models/database');

const app = express();
const PORT = 3000;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Session middleware
app.use(session({
  secret: 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set to true if using https
}));

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

// Login GET
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login', error: null, oldEmail: '' });
});

// Login POST - MySQL async
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const dbConn = db.getDB();
    
    const [rows] = await dbConn.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    
    if (!user) {
      return res.render('login', { title: 'Login', error: 'Invalid credentials', oldEmail: email });
    }
    
    // Handle PHP's '$2y$' bcrypt prefix by replacing it with '$2a$' for compatibility with Node's bcryptjs
    const userPassword = user.password.replace(/^\$2y\$/, '$2a$');

    const isMatch = await bcrypt.compare(password, userPassword);
    if (!isMatch) {
      return res.render('login', { title: 'Login', error: 'Invalid credentials', oldEmail: email });
    }
    
    req.session.userId = user.id;
    req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    res.redirect('/');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { title: 'Login', error: 'Server error', oldEmail: req.body.email || '' });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Logout error');
    }
    res.redirect('/login');
  });
});

// Protected routes
app.get('/', isAuthenticated, (req, res) => {
  res.redirect('/dashboard');
});

app.get('/tickets', isAuthenticated, (req, res) => {
  res.render('tickets', { title: 'Fuel Tickets List', user: req.session.user });
});

const fuelRoutes = require('./routes/fuel');
app.use('/', fuelRoutes);

// Init DB on start (async)
db.init().catch(console.error);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
