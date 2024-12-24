const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middlewares/authMiddleware');
const fs = require('fs');
const path = require('path');
const admin = require('./firebase');

const otpGenerator = require('otp-generator');
const { broadcastMessage } = require('./soketController');

const nodemailer = require('nodemailer');
const { error, log } = require('console');
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
      res.status(200).json({ error: false, message: 'Mobile number not exist', userId: 0, userType: "1", userName: "" });
    } else {
      const userId = existingUserMobile[0].id;
      const userType = existingUserMobile[0].type;
      const name = existingUserMobile[0].name;
      res.status(200).json({ error: true, message: 'Mobile number is exist', userId: userId, userType: userType, userName: name });
    }
  } catch (error) {
    console.error('Error registering user:', error); // Log the error
    res.status(500).json({ error: 'Internal server error' });
  }
};


const registerUser = async (req, res) => {
  try {
    const { name, mobile, email, type, rMobile } = req.body;

    const result = await sequelize.query(
      'INSERT INTO users (name, mobile, email, type) VALUES (?, ?, ?, ?)',
      {
        replacements: [name, mobile, email, type],
        type: QueryTypes.INSERT
      }
    );

    if (rMobile) {
      const referralData = await sequelize.query(
        'INSERT INTO referal_data (user_mobile, referral_mobile, amount) VALUES (?, ?, ?)',
        {
          replacements: [mobile, rMobile, '100'],
          type: QueryTypes.INSERT
        }
      );
    }
    const userId = result[0];
    res.status(200).json({ error: false, message: 'Registered successfully', userId: userId, userType: type, userName: name });
  } catch (error) {
    console.error('Error registering user:', error); // Log the error
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const updateUserToken = async (req, res) => {
  try {
    const { token, userId } = req.body;

    const result = await sequelize.query(
      'UPDATE users SET token = ? WHERE id = ?',
      {
        replacements: [token, userId],
        type: QueryTypes.UPDATE
      }
    );
    res.status(200).json({ error: false, message: 'Token updated successfully' });
  } catch (error) {
    console.error('Error registering user:', error); // Log the error
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const fetchStockByName = async (req, res) => {
  try {
    // Fetch stocks from your database
    const { stock_name } = req.body;

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${stock_name}`; // Assuming stock.symbol holds the stock symbol like RELIANCE.BO
    try {
      const response = await axios.get(yahooUrl);
      return res.status(200).send({
        error: false,
        message: 'Fetch Successfully',
        StockDetails: response.data.chart.result
      });
    } catch (error) {
      return res.status(200).send({
        error: true,
        message: 'Data not found',
        StockDetails: []
      });
    }

  } catch (error) {
    console.log(error);
    return res.status(500).send({
      message: 'Data not found',
      error: true,
      StockDetails: []
    });
  }
};

const addStock = async (req, res) => {
  try {
    let { cname, posting_date, type, cmp_type, point_cmp, down_upto, traget1, target2, target3, cmp, realtime_return, duration_t2, duration_t3, stop_loss, today_date, description } = req.body;

    // Transform cname from '.NS' to 'BO' if necessary
    if (cname && cname.endsWith('.NS')) {
      cname = cname.replace('.NS', 'BO');
    }

    const result = await sequelize.query(
      'INSERT INTO stocks (cname, posting_date, type, cmp_type, point_cmp, down_upto, traget1, target2, target3, cmp, duration_t1, duration_t2, duration_t3, stop_loss, today_date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      {
        replacements: [cname, posting_date, type, cmp_type, point_cmp, down_upto, traget1, target2, target3, cmp, realtime_return, duration_t2, duration_t3, stop_loss, today_date, description],
        type: QueryTypes.INSERT,
      }
    );

    res.status(200).json({ error: false, message: 'Data added successfully' });
  } catch (error) {
    console.error('Error registering user:', error); // Log the error
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};


const updateStock = async (req, res) => {
  try {
    const { sid, cname, posting_date, type, cmp_type, point_cmp, down_upto, traget1, target2, target3, cmp, stop_loss, duartiont1, duartiont2, durationt3, today_date, description } = req.body;

    const result = await sequelize.query(
      'UPDATE stocks SET cname = ?, posting_date = ?,type = ?, cmp_type = ?,point_cmp = ?,down_upto = ?,traget1 = ?,target2 = ?,target3 = ?,cmp = ?,stop_loss = ?,duration_t1 = ?,	duration_t2	 = ?,duration_t3 = ?,today_date = ?,description = ? WHERE id = ?',
      {
        replacements: [cname, posting_date, type, cmp_type, point_cmp, down_upto, traget1, target2, target3, cmp, stop_loss, duartiont1, duartiont2, durationt3, today_date, description, sid],
        type: QueryTypes.UPDATE
      }
    );
    res.status(200).json({ error: false, message: 'Data updated successfully' });
  } catch (error) {
    console.error('Error registering user:', error); // Log the error
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const fetchAllStocks = async (req, res) => {
  try {
    // Fetch stocks from your database
    const stocksList = await sequelize.query(
      `SELECT * FROM stocks ORDER BY STR_TO_DATE(posting_date, '%d-%m-%Y') DESC`,
      { replacements: [], type: QueryTypes.SELECT }
    );


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

const fetchStockbyID = async (req, res) => {
  try {
    // Fetch stocks from your database
    const { sid } = req.body;
    const stocksList = await sequelize.query('SELECT * FROM stocks WHERE id = ?',
      { replacements: [sid], type: QueryTypes.SELECT });

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
    // Fetch stocks from your database, ordered by the most recently added
    const stocksList = await sequelize.query(
      `SELECT * FROM stocks WHERE status = ? ORDER BY STR_TO_DATE(posting_date, '%d-%m-%Y') DESC`,
      { replacements: ['0'], type: QueryTypes.SELECT }
    );

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
    // Fetch stocks from your database, ordering by latest first (assuming created_at exists)
    const stocksList = await sequelize.query(
      'SELECT * FROM stocks ORDER BY updated_at DESC',
      { replacements: [], type: QueryTypes.SELECT }
    );

    const getAllUserTokens = async () => {
      const tokens = await sequelize.query(
        'SELECT token FROM users WHERE token IS NOT NULL',
        { type: QueryTypes.SELECT }
      );
      return tokens.map((row) => row.token); // Map to extract `token` values
    };

    // Iterate over the stocksList and fetch market price and market time for each stock from Yahoo Finance
    const enrichedStocks = await Promise.all(stocksList.map(async (stock) => {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.cname}`;
      try {
        const response = await axios.get(yahooUrl);
        const result = response.data.chart.result[0];
        const regularMarketPrice = result.meta.regularMarketPrice;
        const regularMarketTime = result.meta.regularMarketTime;

        // Convert regularMarketTime (timestamp) to dd-MM-yyyy format
        const marketDate = new Date(regularMarketTime * 1000);
        const formattedMarketDate = `${marketDate.getDate().toString().padStart(2, '0')}-${(marketDate.getMonth() + 1).toString().padStart(2, '0')}-${marketDate.getFullYear()}`;

        const currentDate = new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "Asia/Kolkata"
        }).format(new Date()).replace(/\//g, "-");

        const userTokens = await getAllUserTokens();

        if (stock.manual_exit === "1") {
          return {
            ...stock,
            regularMarketPrice,
            regularMarketTime: formattedMarketDate
          };
        } else {
          let updated = false;

          // Target 1 check
          if (regularMarketPrice >= stock.traget1 && !stock.traget1_date) {
            await sequelize.query(
              'UPDATE stocks SET traget1_date = ? WHERE id = ?',
              { replacements: [currentDate, stock.id], type: QueryTypes.UPDATE }
            );
            if (userTokens.length > 0) {
              for (const token of userTokens) {
                const message = {
                  notification: {
                    title: 'Short Term Target Reached',
                    body: `The target price for ${stock.cname} has been reached!`,
                  },
                  token, // Individual token
                };

                try {
                  await admin.messaging().send(message);
                  console.log(`Notification sent to token: ${token}`);
                } catch (error) {
                  console.error(`Error sending notification to token: ${token}`, error);
                }
              }
            }
            updated = true;
          }

          // Target 2 check
          if (regularMarketPrice >= stock.target2 && !stock.traget2_date) {
            await sequelize.query(
              'UPDATE stocks SET traget2_date = ? WHERE id = ?',
              { replacements: [currentDate, stock.id], type: QueryTypes.UPDATE }
            );
            if (userTokens.length > 0) {
              for (const token of userTokens) {
                const message = {
                  notification: {
                    title: 'Medium Term Target Reached',
                    body: `The target price for ${stock.cname} has been reached!`,
                  },
                  token, // Individual token
                };

                try {
                  await admin.messaging().send(message);
                  console.log(`Notification sent to token: ${token}`);
                } catch (error) {
                  console.error(`Error sending notification to token: ${token}`, error);
                }
              }
            }
            updated = true;
          }

          // Target 3 check
          if (regularMarketPrice >= stock.target3 && !stock.traget3_date) {
            await sequelize.query(
              'UPDATE stocks SET traget3_date = ?, status = ? WHERE id = ?',
              { replacements: [currentDate, '1', stock.id], type: QueryTypes.UPDATE }
            );
            if (userTokens.length > 0) {
              for (const token of userTokens) {
                const message = {
                  notification: {
                    title: 'Long Term Target Reached',
                    body: `The target price for ${stock.cname} has been reached!`,
                  },
                  token, // Individual token
                };

                try {
                  await admin.messaging().send(message);
                  console.log(`Notification sent to token: ${token}`);
                } catch (error) {
                  console.error(`Error sending notification to token: ${token}`, error);
                }
              }
            }
            updated = true;
          }

          // Stop loss check
          if (regularMarketPrice === stock.stop_loss && !stock.traget3_date) {
            await sequelize.query(
              'UPDATE stocks SET status = ? WHERE id = ?',
              { replacements: ['1', stock.id], type: QueryTypes.UPDATE }
            );
            if (userTokens.length > 0) {
              for (const token of userTokens) {
                const message = {
                  notification: {
                    title: 'Stop Loss Target Reached',
                    body: `The stop loss target price for ${stock.cname} has been reached!`,
                  },
                  token, // Individual token
                };

                try {
                  await admin.messaging().send(message);
                  console.log(`Notification sent to token: ${token}`);
                } catch (error) {
                  console.error(`Error sending notification to token: ${token}`, error);
                }
              }
            }
            updated = true;
          }

          // Return stock data if any target is hit
          if (stock.traget1_date || stock.traget2_date || stock.traget3_date) {
            return {
              ...stock,
              regularMarketPrice,
              regularMarketTime: formattedMarketDate
            };
          }
        }
      } catch (error) {
        console.error(`Failed to fetch market data for ${stock.cname}`, error);
        return null; // Return null if the API request fails
      }

      return null; // Return null if no conditions met
    }));

    // Filter out any null values (stocks that don't meet the condition or where API failed)
    const filteredStocks = enrichedStocks.filter(stock => stock !== null);

    // Return sorted filtered stocks
    return res.status(200).send({
      error: false,
      message: 'Fetch Successfully',
      StockList: filteredStocks
    });

  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: 'Data not found',
      error: true
    });
  }
};

const buyPlan = async (req, res) => {
  try {
    const { user_id, plan_name, start_date, end_date, amount, transaction_id, uMobile } = req.body;

    // Convert 'dd-MM-yyyy' format into a comparable date format (MySQL 'yyyy-MM-dd')
    const existingPlan = await sequelize.query(
      `SELECT * FROM subscription 
       WHERE user_id = ? 
       AND STR_TO_DATE(end_date, '%d-%m-%Y') > CURDATE() 
       AND status = 0  -- Check if status is 0 (inactive)
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
       AND status = 0  -- Check if status is 0 (inactive)
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

const updateUserPlanStatus = async (req, res) => {
  try {
    const { user_id } = req.body;

    // Find the most recent active plan (where status is 0 and end_date is in the future)
    const existingPlan = await sequelize.query(
      `SELECT * FROM subscription 
       WHERE user_id = ? 
       AND STR_TO_DATE(end_date, '%d-%m-%Y') > CURDATE() 
       AND status = 0  -- Check if status is 0 (inactive)
       ORDER BY STR_TO_DATE(end_date, '%d-%m-%Y') DESC  -- Order by end_date to get the most recent active plan
       LIMIT 1`,
      {
        replacements: [user_id],
        type: QueryTypes.SELECT
      }
    );

    if (existingPlan.length > 0) {
      // Update the status of the most recent active plan to 1 (inactive)
      const planId = existingPlan[0].id;  // Assuming there's an 'id' field for the plan

      await sequelize.query(
        `UPDATE subscription 
         SET status = 1  -- Set status to 1 (inactive)
         WHERE id = ?`,
        {
          replacements: [planId],
          type: QueryTypes.UPDATE
        }
      );

      return res.status(200).json({ error: false, message: 'Plan status updated to inactive' });
    } else {
      return res.status(400).json({ error: true, message: 'No active plan found to update' });
    }
  } catch (error) {
    console.error('Error updating plan status:', error);
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
        // Split the 'end_date' assuming it's in 'dd-MM-yyyy' format
        const endDateParts = plan.end_date.split('-');

        // Check if the date is valid
        let formattedEndDate;
        try {
          formattedEndDate = new Date(`${endDateParts[2]}-${endDateParts[1]}-${endDateParts[0]}`);
        } catch (error) {
          formattedEndDate = null;  // If the date format is invalid, set it to null
        }

        // Initialize status
        let status = "";

        // Check if the plan status is '1' (inactive) or if the date is invalid
        if (plan.status === '1' || formattedEndDate === null || formattedEndDate < currentDate) {
          status = 'inactive';
        } else {
          status = 'active';
        }

        // Return the enriched plan with the updated status
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


const fetchAllUserPlanActiveAndInactive = async (req, res) => {
  try {
    // Fetch the subscription plans for the user along with the user details
    const existingPlan = await sequelize.query(
      `SELECT subscription.*, users.name as user_name, users.mobile as user_mobile, users.email as user_email
       FROM subscription
       JOIN users ON subscription.user_id = users.id
       ORDER BY subscription.created_at DESC`,
      {
        replacements: [],
        type: QueryTypes.SELECT
      }
    );

    if (existingPlan.length > 0) {
      // Get the current date
      const currentDate = new Date();

      // Iterate over each plan and check if it's active or inactive based on the end_date
      const enrichedPlans = existingPlan.map((plan) => {
        // Split the 'end_date' assuming it's in 'dd-MM-yyyy' format
        const endDateParts = plan.end_date.split('-');

        // Check if the date is valid
        let formattedEndDate;
        try {
          formattedEndDate = new Date(`${endDateParts[2]}-${endDateParts[1]}-${endDateParts[0]}`);
        } catch (error) {
          formattedEndDate = null;  // If the date format is invalid, set it to null
        }

        // Initialize status
        let status = "";

        // Check if the plan status is '1' (inactive) or if the date is invalid
        if (plan.status === '1' || formattedEndDate === null || formattedEndDate < currentDate) {
          status = 'inactive';
        } else {
          status = 'active';
        }

        // Return the enriched plan with the updated status
        return {
          ...plan,
          status
        };
      });


      return res.status(200).json({ error: false, message: 'Data fetched successfully', UserPlanDetails: enrichedPlans });
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
        replacements: [user_phone, '0'],
        type: QueryTypes.SELECT
      }
    );

    if (existingPlan.length > 0) {
      return res.status(200).json({ error: false, message: 'Data Fetch', WalletData: existingPlan });
    } else {
      return res.status(400).json({ error: true, message: 'Data not found', WalletData: [] });
    }
  } catch (error) {
    console.error('Error adding subscription:', error);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const phonepeCallback = async (req, res) => {
  const paymentResponse = req.body;

  console.log('Payment response received:', paymentResponse);

  // Check the status of the transaction
  const { status, transactionId, error } = paymentResponse;

  if (status === 'SUCCESS') {
    // Handle successful payment
    console.log(`Payment successful for transaction: ${transactionId}`);
    // You can update your database or notify the user here
  } else {
    // Handle failed payment
    console.error(`Payment failed with error: ${error}`);
    // You can update the status in your database or retry the payment
  }

  // Send a response back to PhonePe acknowledging the callback
  res.status(200).json({
    message: 'Payment callback received',
  });
};

const fetchHomeData1 = async (req, res) => {
  try {
    const homeData = await sequelize.query(
      `SELECT * FROM stocks ORDER BY id DESC`,
      {
        replacements: [],
        type: QueryTypes.SELECT
      }
    );

    if (homeData.length > 0) {
      let closedCount = 0;
      let profitcalls = 0;
      let profitcallsCount = 0;
      let totalDays = 0;
      let totalReturns = 0;
      let totalProfit = 0;

      await Promise.all(homeData.map(async (stock) => {
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.cname}`; // Assuming stock.cname holds the stock symbol like RELIANCE.BO
        try {
          const response = await axios.get(yahooUrl);
          const result = response.data.chart.result[0];
          const regularMarketPrice = result.meta.regularMarketPrice;
          const regularMarketTime = result.meta.regularMarketTime;

          // Convert regularMarketTime (timestamp) to dd-MM-yyyy format
          const marketDate = new Date(regularMarketTime * 1000); // Convert from seconds to milliseconds

          // Price calculations
          const stockPer = Number(stock.down_upto) * 0.0025;
          const sprice = Number(stock.down_upto) - stockPer;
          const eprice = Number(stock.down_upto) + stockPer;
          const avgPrice = (sprice + eprice) / 2;

          const postingDateParts = stock.traget1_date.split('-');
          const postingDate = new Date(postingDateParts[2], postingDateParts[1] - 1, postingDateParts[0]);
          console.log(postingDate);
          console.log("traget1_date");



          const differenceTarget = Number(stock.traget1) - avgPrice;

          const differperc = (differenceTarget / 100) * 100;

          console.log(differperc);

        } catch (error) {
          console.error(`Failed to fetch market data for ${stock.cname}`, error);
        }
      }));


      // Prepare the response data
      const allData = {
        totalStocks: homeData.length,
        exitStocks: closedCount,
        successRate: srate,
        avgDays: avgDays,
        annualReturn: annualReturn
      };

      return res.status(200).json({ error: false, message: 'Data Fetch', HomeData: allData });
    } else {
      const allData = {
        totalStocks: 0,
        exitStocks: 0,
        successRate: 0,
        avgDays: 0,
        annualReturn: 0
      };
      return res.status(400).json({ error: true, message: 'Data not found', HomeData: allData });
    }
  } catch (error) {
    console.error('Error fetching home data:', error);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

const fetchHomeData = async (req, res) => {
  try {
    const homeData = await sequelize.query(
      `SELECT * FROM stocks ORDER BY id DESC`,
      {
        replacements: [],
        type: QueryTypes.SELECT
      }
    );

    if (homeData.length > 0) {
      let closedCount = 0;
      let profitcalls = 0;
      let profitcallsCount = 0;
      let totalDays = 0;
      let totalReturns = 0;
      let totalProfit = 0;

      await Promise.all(homeData.map(async (stock) => {
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.cname}`; // Assuming stock.cname holds the stock symbol like RELIANCE.BO
        try {
          const response = await axios.get(yahooUrl);
          const result = response.data.chart.result[0];
          const regularMarketPrice = result.meta.regularMarketPrice;
          const regularMarketTime = result.meta.regularMarketTime;

          // Convert regularMarketTime (timestamp) to dd-MM-yyyy format
          const marketDate = new Date(regularMarketTime * 1000); // Convert from seconds to milliseconds

          // Price calculations
          const stockPer = Number(stock.down_upto) * 0.0025;
          const sprice = Number(stock.down_upto) - stockPer;
          const eprice = Number(stock.down_upto) + stockPer;
          const avgPrice = (sprice + eprice) / 2;

          // const postingDateParts = stock.traget1_date.split('-');
          // const postingDate = new Date(postingDateParts[2], postingDateParts[1] - 1, postingDateParts[0]);
          // console.log(postingDate);
          // console.log("traget1_date");



          const differenceTarget = Number(stock.traget1) - avgPrice;

          const differperc = (differenceTarget / 100) * 100;

          console.log(differperc);

          if (stock.manual_exit == "1") {
            closedCount += 1;
          }

          if (stock.traget1_date != null && stock.traget1_date != "") {
            profitcallsCount += 1;
          }

          // Check if the regularMarketPrice is greater than or equal to target1
          if (stock.traget3_date != null && stock.traget3_date != "") {
            closedCount += 1;

            // Convert posting_date to Date object
            const postingDateParts = stock.posting_date.split('-');
            const postingDate = new Date(postingDateParts[2], postingDateParts[1] - 1, postingDateParts[0]);



            if (stock.traget3_date != null && stock.traget3_date != "") {
              const target3Parts = stock.traget3_date.split('-');
              const target3Date = new Date(target3Parts[2], target3Parts[1] - 1, target3Parts[0]);

              // Calculate days difference
              const daysDifference = Math.ceil((target3Date - postingDate) / (1000 * 60 * 60 * 24));
              totalDays += daysDifference;

              const annualReturn = (differperc / daysDifference) * 365;
              totalReturns += annualReturn;

              const downPrice = Number(stock.down_upto);
              const marketPrice = Number(stock.target3);

              const differenceTotal = marketPrice - downPrice;
              const differenceProfit = (differenceTotal / downPrice) * 100;

              totalProfit += differenceProfit;

              //average return formula
              console.log("target3 " + totalProfit);
            }

          } else if (stock.traget2_date != null && stock.traget2_date != "") {
            closedCount += 1;

            // Convert posting_date to Date object
            const postingDateParts = stock.posting_date.split('-');
            const postingDate = new Date(postingDateParts[2], postingDateParts[1] - 1, postingDateParts[0]);
            if (stock.traget2_date != null && stock.traget2_date != "") {
              const target2Parts = stock.traget2_date.split('-');
              const target2Date = new Date(target2Parts[2], target2Parts[1] - 1, target2Parts[0]);

              // Calculate days difference
              const daysDifference = Math.ceil((target2Date - postingDate) / (1000 * 60 * 60 * 24));
              totalDays += daysDifference;

              const annualReturn = (differperc / daysDifference) * 365;
              totalReturns += annualReturn;

              const downPrice = Number(stock.down_upto);
              const marketPrice = Number(stock.target2);

              const differenceTotal = marketPrice - downPrice;
              const differenceProfit = (differenceTotal / downPrice) * 100;
              //average return formula
              totalProfit += differenceProfit;
              console.log("target2 " + totalProfit);
            }

          } else if (stock.traget1_date != null && stock.traget1_date != "") {
            closedCount += 1;

            const postingDateParts = stock.posting_date.split('-');
            const postingDate = new Date(postingDateParts[2], postingDateParts[1] - 1, postingDateParts[0]);
            console.log(postingDate);
            console.log("postingDate");

            if (stock.traget1_date != null && stock.traget1_date != "") {
              const target1Parts = stock.traget1_date.split('-');
              const target1Date = new Date(target1Parts[2], target1Parts[1] - 1, target1Parts[0]);

              // Calculate days difference
              const daysDifference = Math.ceil((target1Date - postingDate) / (1000 * 60 * 60 * 24));
              totalDays += daysDifference;

              const annualReturn = (differperc / daysDifference) * 365;
              totalReturns += annualReturn;

              const downPrice = Number(stock.down_upto);
              const marketPrice = Number(stock.traget1);

              const differenceTotal = marketPrice - downPrice;
              const differenceProfit = (differenceTotal / downPrice) * 100;
              totalProfit += differenceProfit;
              //average return formula
              console.log("traget1 " + totalProfit);
            }

          }
        } catch (error) {
          console.error(`Failed to fetch market data for ${stock.cname}`, error);
        }
      }));

      // Avoid division by zero and calculate average days
      const srate = (profitcallsCount / closedCount) * 100;
      const tDays = closedCount > 0 ? (totalDays / closedCount) : 0;
      const tReturn = totalReturns / closedCount;

      console.log(closedCount);
      console.log("closedCount");
      console.log(srate);
      console.log("srate");


      console.log(profitcallsCount);
      console.log("profitcallsCount");


      const avgTotalProfit = totalProfit / closedCount;
      const avgDays = totalDays / closedCount;
      const annualReturn = (avgTotalProfit / avgDays) * 365;
      console.log("avgTotalProfit " + avgTotalProfit + " Days " + avgDays + " Annual Return " + annualReturn);
      // Prepare the response data
      const allData = {
        totalStocks: homeData.length,
        exitStocks: closedCount,
        successRate: srate,
        avgDays: avgDays,
        annualReturn: annualReturn
      };

      return res.status(200).json({ error: false, message: 'Data Fetch', HomeData: allData });
    } else {
      const allData = {
        totalStocks: 0,
        exitStocks: 0,
        successRate: 0,
        avgDays: 0,
        annualReturn: 0
      };
      return res.status(400).json({ error: true, message: 'Data not found', HomeData: allData });
    }
  } catch (error) {
    console.error('Error fetching home data:', error);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
};


const adminlogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [existingUser] = await sequelize.query('SELECT * FROM admin WHERE email = ? AND password = ? AND status = ?',
      { replacements: [email, password, '0'], type: QueryTypes.SELECT });
    if (existingUser) {
      return res.status(200).send({ error: false, message: 'Login success!', Login: existingUser });
    } else {
      return res.status(404).send({ error: true, message: 'Email or Password is wrong!' });
    }


  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: 'Error in login check api!',
      error
    });
  }
};

const fetchAllUsers = async (req, res) => {
  try {

    const productList = await sequelize.query('SELECT * FROM users WHERE type = ? ORDER BY id DESC',
      { replacements: ['1'], type: QueryTypes.SELECT });

    if (productList.length > 0) {
      return res.status(200).send({ error: false, message: 'Data Fetch Successfully', Users: productList });
    } else {
      return res.status(404).send({ error: true, message: 'Data not found', Users: [] });
    }

  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: 'Data not found',
      error: true
    });
  }
};

const upstockLogin = async (req, res) => {
  const apiKey = 'dab9535d-e4e9-4a9d-8249-f8280fb01741'; // Your Upstox API Key
  const redirectUri = 'http://localhost:3304/api/callback'; // Ensure this matches the registered redirect URI

  // Construct the Upstox login URL
  const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?client_id=${apiKey}&redirect_uri=${redirectUri}&response_type=code`;

  // Redirect the user to the Upstox login page
  res.redirect(authUrl);
};

const upstockCallback = async (req, res) => {
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

const deleteStock = async (req, res) => {
  try {
    const { sId } = req.body;

    const result = await sequelize.query('DELETE FROM stocks WHERE id = ?',
      { replacements: [sId], type: QueryTypes.DELETE });

    return res.status(200).send({ error: false, message: 'Stock Deleted Successfully' });

  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: 'Stock not found',
      error: true
    });
  }
};

const getUserToken = async (req, res) => {
  try {
    // const userId = req.user.id;
    const { userId } = req.body;
    const users = await sequelize.query(
      'SELECT token FROM users WHERE id = ?',
      {
        replacements: [userId],
        type: QueryTypes.SELECT
      }
    );
    res.status(200).json({ error: false, message: "User Token Fetch", UserToken: users });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ messsage: 'Internal server error', error: true });
  }
};

const getAllUserToken = async (req, res) => {
  try {
    const users = await sequelize.query(
      `
      SELECT users.token, 
             CASE 
               WHEN subscription.status = 0 THEN true
               ELSE false
             END AS isPlanActive
      FROM users
      LEFT JOIN subscription 
      ON users.id = subscription.user_id
      `,
      {
        replacements: [],
        type: QueryTypes.SELECT,
      }
    );

    res.status(200).json({
      error: false,
      message: "User Token Fetch",
      UserToken: users,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      message: "Internal server error",
      error: true,
    });
  }
};


module.exports = {
  checkMobileExist,
  registerUser,
  addStock,
  updateStock,
  uploadMiddleware,
  fetchAllStocks,
  fetchHomeStocks,
  fetchActiveStocks,
  buyPlan,
  checkUserPlan,
  fetchUserWallet,
  updateUserPlanStatus,
  fetchAllUserPlan,
  fetchAllUserPlanActiveAndInactive,
  upstockLogin,
  upstockCallback,
  fetchUpStocksData,
  phonepeCallback,
  fetchHomeData,
  adminlogin,
  fetchAllUsers,
  fetchStockByName,
  fetchStockbyID,
  deleteStock,
  updateUserToken,
  getUserToken,
  getAllUserToken
};