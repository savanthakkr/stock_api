const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require("../middlewares/roleMiddleware");

const {checkMobileExist,registerUser,addStock,fetchAllStocks,fetchActiveStocks,buyPlan,checkUserPlan,fetchUserWallet,fetchAllUserPlan,
    fetchHomeStocks,upstockLogin,upstockCallback,fetchUpStocksData } = userController; 

router.post('/checkMobileExist', checkMobileExist);
router.post('/registerUser', registerUser);
router.post('/addStock', addStock);
router.get('/fetchAllStocks', fetchAllStocks);
router.get('/fetchActiveStocks', fetchActiveStocks);
router.post('/buyPlan', buyPlan);
router.post('/checkUserPlan', checkUserPlan);
router.post('/fetchUserWallet', fetchUserWallet);
router.post('/fetchAllUserPlan', fetchAllUserPlan);
router.get('/fetchHomeStocks', fetchHomeStocks);

router.get('/fetchUpStocksData', fetchUpStocksData);
router.get('/upstockLogin',upstockLogin);
router.get('/callback',upstockCallback);

module.exports = router;
