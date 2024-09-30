const express = require('express');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/userRoutes');
const { QueryTypes } = require('sequelize');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const { sequelize, testConnection } = require('./config/database');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const http = require('http');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const { googleLogin } = require('./controllers/userController');
const { broadcastMessage, socketFunction } = require('./controllers/soketController');

const sessionConfig = {
  secret: 'secret',
  resave: false,
  saveUninitialized: true
};

const app = express();
const PORT = 3304;

app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors());
app.use(fileUpload());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Test the database connection
testConnection()
  .then(() => {
    // Routes
    app.use('/api', userRoutes);

    app.get('/api/auth/google', passport.authenticate('google', {
      scope: ['profile', 'email']
    }));

    const server = http.createServer(app);
    socketFunction(server);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to start server:', err);
  });

module.exports = { broadcastMessage };
