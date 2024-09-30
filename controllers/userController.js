const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middlewares/authMiddleware');
const fs = require('fs');
const path = require('path');

const otpGenerator = require('otp-generator');
const { broadcastMessage } = require('./soketController');

const nodemailer = require('nodemailer');
const { error } = require('console');
const QRCode = require('qrcode');
const axios = require('axios');
const multer = require('multer');
// Set up storage with multer to store images in the 'uploads' directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
const uploadMiddleware = upload.single('image');

// Create the 'uploads' directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const saveBase64File = (base64String, folderPath) => {
  // Check if the base64 string includes the prefix
  let matches = base64String.match(/^data:(.+);base64,(.+)$/);
  
  if (!matches) {
    // If the prefix is missing, assume the entire string is base64 without the metadata
    matches = [null, 'application/octet-stream', base64String];
  }

  if (matches.length !== 3) {
      throw new Error('Invalid base64 string');
  }

  const ext = matches[1].split('/')[1]; // get the file extension
  const buffer = Buffer.from(matches[2], 'base64'); // decode base64 string

  const fileName = `${Date.now()}.${ext}`;
  const filePath = path.join(folderPath, fileName);

  fs.writeFileSync(filePath, buffer); // save the file to the uploads folder

  return filePath; // return the file path for saving in the database
};



const generateToken = (user) => {
  const payload = {
    email: user.email,
    password: user.password,
    id: user.id,
  };
  return jwt.sign(payload, 'crud', { expiresIn: '24h' });
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sponda.netclues@gmail.com',
    pass: 'qzfm wlmf ukeq rvvb'
  }
});

function AddMinutesToDate(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}
const otpganrate = Math.floor(100000 + Math.random() * 900000);
const now = new Date();
const expiration_time = AddMinutesToDate(now, 10);

const genrateOTP = () => {
  const payload = {
    otpganrate,
    now,
    expiration_time,
  };
  return (payload);

}
const otpPassword = Math.floor(1000 + Math.random() * 9000);

function generateOTPS() {
  const payload = {
    otpPassword,
    now,
    expiration_time,
  };
  return (payload);
}

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'sponda.netclues@gmail.com',
      pass: 'qzfm wlmf ukeq rvvb'
    }
  });

  const mailOptions = {
    from: 'sponda.netclues@gmail.com',
    to: options.to,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};

const sendPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const otp = generateOTPS();
    console.log(otp);



    // Send OTP via email
    await sendEmail({
      to: email,
      subject: 'Your OTP',
      message: `<p>Your OTP is: <strong>${otp}</strong></p>`,
    });

    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

//apis
const checkMobileExist = async (req, res) => {
  try {
    const { mobile } = req.body;

    // Validate mobile
    const mobileNumberRegex = /^[6-9]\d{9}$/;

    if (!mobileNumberRegex.test(mobile)) {
      console.log("Invalid mobile number");
      return res.status(400).json({ error: true, message: 'Invalid mobile number' });
    }

    // Check for existing user by mobile
    const existingUserMobile = await sequelize.query(
      'SELECT * FROM users WHERE mobile = ?',
      {
        replacements: [mobile],
        type: QueryTypes.SELECT
      }
    );
    
    if (existingUserMobile.length === 0) {
      res.status(200).json({ error: false, message: 'Mobile number not exist', userId: 0,userType: "1", userName: ""});
    } else {
      const userId = existingUserMobile[0].id;
      const userType = existingUserMobile[0].type;
      const name = existingUserMobile[0].name;
      res.status(200).json({ error: true, message: 'Mobile number is exist', userId: userId,userType: userType,userName: name });
    }
  } catch (error) {
    console.error('Error registering user:', error); // Log the error
    res.status(500).json({ error: 'Internal server error' });
  }
};


const registerUser = async (req, res) => {
  try {
    const { name, mobile,email, type,rMobile } = req.body;

    const result = await sequelize.query(
      'INSERT INTO users (name, mobile, email, type) VALUES (?, ?, ?, ?)',
      {
        replacements: [name, mobile,email, type],
        type: QueryTypes.INSERT
      }
    );

    if(rMobile){
      const referralData = await sequelize.query(
        'INSERT INTO referal_data (user_mobile, referral_mobile, amount) VALUES (?, ?, ?)',
        {
          replacements: [mobile, rMobile,'100'],
          type: QueryTypes.INSERT
        }
      );
    }
    const userId = result[0];
    res.status(200).json({ error: false, message: 'Registered successfully', userId: userId,userType: type ,userName: name });
  } catch (error) {
    console.error('Error registering user:', error); // Log the error
    res.status(500).json({error: true, message: 'Internal server error' });
  }
};

const addStock = async (req, res) => {
  try {
    const { cname, posting_date,type, cmp_type,point_cmp,down_upto,traget1,target2,target3,cmp,realtime_return,today_date } = req.body;

    const result = await sequelize.query(
      'INSERT INTO stocks (cname, posting_date,type, cmp_type,point_cmp,down_upto,traget1,target2,target3,cmp,realtime_return,today_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      {
        replacements: [cname, posting_date,type, cmp_type,point_cmp,down_upto,traget1,target2,target3,cmp,realtime_return,today_date],
        type: QueryTypes.INSERT
      }
    );
    res.status(200).json({ error: false, message: 'Data added successfully' });
  } catch (error) {
    console.error('Error registering user:', error); // Log the error
    res.status(500).json({error: true, message: 'Internal server error' });
  }
};


const fetchAllStocks = async (req, res) => {
  try {
    // Fetch stocks from your database
    const stocksList = await sequelize.query('SELECT * FROM stocks', 
      { replacements: [], type: QueryTypes.SELECT });

    // Iterate over the stocksList and fetch market price and market time for each stock from Yahoo Finance
    const enrichedStocks = await Promise.all(stocksList.map(async (stock) => {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.cname}`; // Assuming stock.symbol holds the stock symbol like RELIANCE.BO
      try {
        const response = await axios.get(yahooUrl);
        const result = response.data.chart.result[0];
        const regularMarketPrice = result.meta.regularMarketPrice;
        const regularMarketTime = result.meta.regularMarketTime;

        // Convert regularMarketTime (timestamp) to dd-MM-yyyy format
        const marketDate = new Date(regularMarketTime * 1000); // Convert from seconds to milliseconds
        const formattedMarketDate = `${marketDate.getDate().toString().padStart(2, '0')}-${(marketDate.getMonth() + 1).toString().padStart(2, '0')}-${marketDate.getFullYear()}`;

        // Return stock data along with market price and formatted market time
        return { 
          ...stock, 
          regularMarketPrice,
          regularMarketTime: formattedMarketDate
        };
      } catch (error) {
        console.error(`Failed to fetch market data for ${stock.symbol}`, error);
        return { 
          ...stock, 
          regularMarketPrice: null, 
          regularMarketTime: null // Return null if the API request fails
        };
      }
    }));

    return res.status(200).send({ 
      error: false, 
      message: 'Fetch Successfully', 
      StockList: enrichedStocks 
    });

  } catch (error) {
    console.log(error);
    return res.status(500).send({
      message: 'Data not found',
      error: true
    });
  }
};

const fetchActiveStocks = async (req, res) => {
  try {
    // Fetch stocks from your database
    const stocksList = await sequelize.query('SELECT * FROM stocks WHERE status = ?', 
      { replacements: ['0'], type: QueryTypes.SELECT });

    // Iterate over the stocksList and fetch market price and market time for each stock from Yahoo Finance
    const enrichedStocks = await Promise.all(stocksList.map(async (stock) => {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.cname}`; // Assuming stock.symbol holds the stock symbol like RELIANCE.BO
      try {
        const response = await axios.get(yahooUrl);
        const result = response.data.chart.result[0];
        const regularMarketPrice = result.meta.regularMarketPrice;
        const regularMarketTime = result.meta.regularMarketTime;

        // Convert regularMarketTime (timestamp) to dd-MM-yyyy format
        const marketDate = new Date(regularMarketTime * 1000); // Convert from seconds to milliseconds
        const formattedMarketDate = `${marketDate.getDate().toString().padStart(2, '0')}-${(marketDate.getMonth() + 1).toString().padStart(2, '0')}-${marketDate.getFullYear()}`;

        // Return stock data along with market price and formatted market time
        return { 
          ...stock, 
          regularMarketPrice,
          regularMarketTime: formattedMarketDate
        };
      } catch (error) {
        console.error(`Failed to fetch market data for ${stock.symbol}`, error);
        return { 
          ...stock, 
          regularMarketPrice: null, 
          regularMarketTime: null // Return null if the API request fails
        };
      }
    }));

    return res.status(200).send({ 
      error: false, 
      message: 'Fetch Successfully', 
      StockList: enrichedStocks 
    });

  } catch (error) {
    console.log(error);
    return res.status(500).send({
      message: 'Data not found',
      error: true
    });
  }
};

const fetchHomeStocks = async (req, res) => {
  try {
    // Fetch stocks from your database
    const stocksList = await sequelize.query('SELECT * FROM stocks WHERE status = ?', 
      { replacements: ['0'], type: QueryTypes.SELECT });

    // Iterate over the stocksList and fetch market price and market time for each stock from Yahoo Finance
    const enrichedStocks = await Promise.all(stocksList.map(async (stock) => {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.cname}`; // Assuming stock.cname holds the stock symbol like RELIANCE.BO
      try {
        const response = await axios.get(yahooUrl);
        const result = response.data.chart.result[0];
        const regularMarketPrice = result.meta.regularMarketPrice;
        const regularMarketTime = result.meta.regularMarketTime;

        // Convert regularMarketTime (timestamp) to dd-MM-yyyy format
        const marketDate = new Date(regularMarketTime * 1000); // Convert from seconds to milliseconds
        const formattedMarketDate = `${marketDate.getDate().toString().padStart(2, '0')}-${(marketDate.getMonth() + 1).toString().padStart(2, '0')}-${marketDate.getFullYear()}`;

        // Check if the regularMarketPrice is less than or equal to target1
        if (regularMarketPrice >= stock.traget1) {
          // Return stock data along with market price and formatted market time if the condition is met
          return { 
            ...stock, 
            regularMarketPrice,
            regularMarketTime: formattedMarketDate 
          };
        } else {
          // If the condition is not met, return null to exclude this stock
          return null;
        }
      } catch (error) {
        console.error(`Failed to fetch market data for ${stock.cname}`, error);
        return null; // Return null if the API request fails
      }
    }));

    // Filter out any null values (stocks that don't meet the condition or where API failed)
    const filteredStocks = enrichedStocks.filter(stock => stock !== null);

    return res.status(200).send({ 
      error: false, 
      message: 'Fetch Successfully', 
      StockList: filteredStocks 
    });

  } catch (error) {
    console.log(error);
    return res.status(500).send({
      message: 'Data not found',
      error: true
    });
  }
};

const buyPlan = async (req, res) => {
  try {
    const { user_id, plan_name, start_date, end_date, amount, transaction_id,uMobile } = req.body;

    // Convert 'dd-MM-yyyy' format into a comparable date format (MySQL 'yyyy-MM-dd')
    const existingPlan = await sequelize.query(
      `SELECT * FROM subscription 
       WHERE user_id = ? 
       AND STR_TO_DATE(end_date, '%d-%m-%Y') > CURDATE() 
       LIMIT 1`,
      {
        replacements: [user_id],
        type: QueryTypes.SELECT
      }
    );

    if (existingPlan.length > 0) {
      return res.status(400).json({ error: true, message: 'An active plan already exists for this user' });
    }

    // If no active plan exists, insert the new subscription
    const result = await sequelize.query(
      'INSERT INTO subscription (user_id, plan_name, start_date, end_date, amount, transaction_id) VALUES (?, ?, ?, ?, ?, ?)',
      {
        replacements: [user_id, plan_name, start_date, end_date, amount, transaction_id],
        type: QueryTypes.INSERT
      }
    );

    const resultReferral = await sequelize.query(
      'UPDATE referal_data SET status = ? WHERE user_mobile = ?',
      {
        replacements: ['0', uMobile],
        type: QueryTypes.UPDATE
      }
    );

    res.status(200).json({ error: false, message: 'Plan purchased successfully' });
  } catch (error) {
    console.error('Error adding subscription:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const checkUserPlan = async (req, res) => {
  try {
    const { user_id } = req.body;

    // Convert 'dd-MM-yyyy' format into a comparable date format (MySQL 'yyyy-MM-dd')
    const existingPlan = await sequelize.query(
      `SELECT * FROM subscription 
       WHERE user_id = ? 
       AND STR_TO_DATE(end_date, '%d-%m-%Y') > CURDATE() 
       LIMIT 1`,
      {
        replacements: [user_id],
        type: QueryTypes.SELECT
      }
    );

    if (existingPlan.length > 0) {
      return res.status(200).json({ error: false, message: 'Plan is active' });
    } else {
      return res.status(400).json({ error: true, message: 'Plan not active' });
    }
  } catch (error) {
    console.error('Error adding subscription:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const fetchAllUserPlan = async (req, res) => {
  try {
    const { user_id } = req.body;

    // Fetch the subscription plans for the user
    const existingPlan = await sequelize.query(
      `SELECT * FROM subscription WHERE user_id = ? ORDER BY created_at DESC`,
      {
        replacements: [user_id],
        type: QueryTypes.SELECT
      }
    );

    if (existingPlan.length > 0) {
      // Get the current date
      const currentDate = new Date();

      // Iterate over each plan and check if it's active or inactive based on the end_date
      const enrichedPlans = existingPlan.map((plan) => {
        const endDateParts = plan.end_date.split('-'); // Assuming end_date is in 'dd-MM-yyyy' format
        const formattedEndDate = new Date(`${endDateParts[2]}-${endDateParts[1]}-${endDateParts[0]}`);

        // Check if the plan is active or inactive
        const status = formattedEndDate >= currentDate ? 'active' : 'inactive';

        // Add status to each plan object
        return { 
          ...plan, 
          status 
        };
      });

      return res.status(200).json({ error: false, message: 'Data fetched successfully', UserPlan: enrichedPlans });
    } else {
      return res.status(400).json({ error: true, message: 'Data not found', UserPlan: [] });
    }
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const fetchUserWallet = async (req, res) => {
  try {
    const { user_phone } = req.body;

    // Convert 'dd-MM-yyyy' format into a comparable date format (MySQL 'yyyy-MM-dd')
    const existingPlan = await sequelize.query(
      `SELECT SUM(amount) as WALLET FROM referal_data WHERE referral_mobile = ? AND status = ?`,
      {
        replacements: [user_phone,'0'],
        type: QueryTypes.SELECT
      }
    );

    if (existingPlan.length > 0) {
      return res.status(200).json({ error: false, message: 'Data Fetch',WalletData: existingPlan});
    } else {
      return res.status(400).json({ error: true, message: 'Data not found',WalletData: [] });
    }
  } catch (error) {
    console.error('Error adding subscription:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const upstockLogin = async (req,res) => {
    const apiKey = 'dab9535d-e4e9-4a9d-8249-f8280fb01741'; // Your Upstox API Key
    const redirectUri = 'http://localhost:3304/api/callback'; // Ensure this matches the registered redirect URI
  
    // Construct the Upstox login URL
    const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?client_id=${apiKey}&redirect_uri=${redirectUri}&response_type=code`;
    
    // Redirect the user to the Upstox login page
    res.redirect(authUrl);
};

const upstockCallback = async (req,res) => {
  const apiKey = 'dab9535d-e4e9-4a9d-8249-f8280fb01741'; // Your Upstox API Key
    const apiSecret = '85pzm6zvpd'; // Your Upstox Secret Key
    const requestToken = 'vF5XA7'; // Extract the request token from the query
    const redirectUri = 'http://localhost:3304/api/callback'; // Your redirect URI
  
    if (!requestToken) {
      return res.status(400).send({
        error: true,
        message: 'Request token is missing'
      });
    }
  
    try {
      // Exchange the request token for access token
      const tokenUrl = 'https://api.upstox.com/v2/login/authorization/token';
      // const tokenData = {
      //   apiKey: apiKey,
      //   apiSecret: apiSecret,
      //   requestToken: requestToken,
      //   redirectUri: redirectUri,
      //   grant_type: 'authorization_code'
      // };

    //   const tokenData = {
    //     code: requestToken,
    //     client_id: apiKey,
    //     client_secret: apiSecret,
    //     redirect_uri: redirectUri,
    //     grant_type: 'authorization_code'
    // };

    const data = new URLSearchParams({
      code: requestToken,
      client_id: apiKey,
      client_secret: apiSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });
  
      const tokenResponse = await axios.post(tokenUrl, data, {
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
         }
      });
  
      if (tokenResponse.status !== 200) {
        return res.status(500).send({
          error: true,
          message: 'Failed to generate access token from Upstox'
        });
      }
  
      const accessToken = tokenResponse.data.access_token;
  
      // Store the access token securely (in session, database, etc.)
      // For now, just send it in the response
      res.send(`Access token received! Your access token is: ${accessToken}`);
      
    } catch (error) {
      console.error('Error exchanging request token:', error);
      res.status(500).send({
        error: true,
        message: 'Error exchanging request token for access token'
      });
    }
};

const fetchUpStocksData = async (req, res) => {
  try {
    const accessToken = req.query.access_token;  // Pass access token in the request query

    if (!accessToken) {
      return res.status(401).send({
        error: true,
        message: 'Access token is required to fetch stock data'
      });
    }

    // Fetch stock data from Upstox API
    const stockDataUrl = 'https://api.upstox.com/index/market_data';
    
    const stocksResponse = await axios.get(stockDataUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (stocksResponse.status !== 200) {
      return res.status(500).send({
        error: true,
        message: 'Failed to fetch stock data from Upstox'
      });
    }

    const stocksList = stocksResponse.data;

    // Send success response with stock list
    return res.status(200).send({
      error: false,
      message: 'Stock data fetched successfully',
      StockList: stocksList
    });

  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).send({
      message: 'An error occurred while fetching stock data',
      error: true
    });
  }
};

module.exports = {
  checkMobileExist,
  registerUser,
  addStock,
  uploadMiddleware,
  fetchAllStocks,
  fetchHomeStocks,
  fetchActiveStocks,
  buyPlan,
  checkUserPlan,
  fetchUserWallet,
  fetchAllUserPlan,
  upstockLogin,
  upstockCallback,
  fetchUpStocksData
};