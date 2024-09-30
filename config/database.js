const { Sequelize } = require('sequelize');
require('dotenv').config();


// Replace these values with your actual database credentials
// const DB_NAME = 'sbo_new';
// const DB_USER = 'admin';
// const DB_PASSWORD = 'Savanponda1122';
// const DB_HOST = 'sbo.cpaqskmk40f1.ap-south-1.rds.amazonaws.com';

// // Set up the Sequelize instance
// const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
//   host: DB_HOST,
//   dialect: 'mysql',
// });


const DB_NAME = 'stock_market';
const DB_USER = 'root';
const DB_PASSWORD = '';
const DB_HOST = 'localhost';

// Set up the Sequelize instance
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  dialect: 'mysql',
});

// Replace these values with your actual database credentials
// const DB_NAME = 'bmgf5jemd29cumrpew82';
// const DB_USER = 'ucd1axin7gxhirzt';
// const DB_PASSWORD = 'SA2APblDmP4CKP6MZRU5';
// const DB_HOST = 'bmgf5jemd29cumrpew82-mysql.services.clever-cloud.com';

// // Set up the Sequelize instance
// const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
//   host: DB_HOST,
//   dialect: 'mysql',
// });

// const sequelize = new Sequelize(
//   process.env.DB_NAME, 
//   process.env.DB_USER, 
//   process.env.DB_PASSWORD, 
//   {
//   host: process.env.DB_HOST,
//   dialect: 'mysql',
// });

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('database connected!.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

module.exports = { sequelize, testConnection };
