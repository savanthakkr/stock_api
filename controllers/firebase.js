const admin = require('firebase-admin');
const serviceAccount = require('../firabse_service_account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;