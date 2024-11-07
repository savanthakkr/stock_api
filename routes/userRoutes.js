const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require("../middlewares/roleMiddleware");

const {checkMobileExist,registerUser,addStock,fetchAllStocks,fetchActiveStocks,buyPlan,checkUserPlan,fetchUserWallet,fetchAllUserPlan,
    fetchHomeStocks,upstockLogin,upstockCallback,updateUserPlanStatus,fetchUpStocksData,phonepeCallback,fetchHomeData,adminlogin,fetchAllUsers,
    fetchStockByName,fetchStockbyID,fetchAllUserPlanActiveAndInactive,updateStock,deleteStock } = userController; 

router.post('/checkMobileExist', checkMobileExist);
router.post('/registerUser', registerUser);
router.post('/addStock', addStock);
router.post('/updateUserPlanStatus', updateUserPlanStatus);
router.get('/fetchAllStocks', fetchAllStocks);
router.get('/fetchActiveStocks', fetchActiveStocks);
router.get('/fetchAllUserPlanActiveAndInactive', fetchAllUserPlanActiveAndInactive);
router.post('/buyPlan', buyPlan);
router.post('/checkUserPlan', checkUserPlan);
router.post('/fetchUserWallet', fetchUserWallet);
router.post('/fetchAllUserPlan', fetchAllUserPlan);
router.get('/fetchHomeStocks', fetchHomeStocks);

router.get('/fetchUpStocksData', fetchUpStocksData);
router.get('/upstockLogin',upstockLogin);
router.get('/callback',upstockCallback);
router.post('/phonepeCallback', phonepeCallback);
router.get('/fetchHomeData',fetchHomeData);
router.post('/adminlogin', adminlogin);
router.get('/fetchAllUsers',fetchAllUsers);
router.post('/fetchStockByName', fetchStockByName);
router.post('/fetchStockbyID', fetchStockbyID);
router.post('/updateStock', updateStock);
router.post('/deleteStock', deleteStock);

module.exports = router;
