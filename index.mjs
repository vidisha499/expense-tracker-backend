// index.mjs


import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './config/db.mjs'; // Using your updated Postgres connection
import nodemailer from 'nodemailer';

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'eshikapakhale@gmail.com',
    pass: process.env.EMAIL_PASS || 'aufnnbtxkyjydvsj'
  }
});

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8008;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors()); // Simplified CORS for maximum compatibility

// --- DATABASE INITIALIZATION ---
const initDb = async () => {
  try {
    console.log('--- Initializing Database ---');
    // Ensure users table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        profile_image TEXT, -- Base64 image string
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Ensure expenses table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expense_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        expense_done_by VARCHAR(100),
        category VARCHAR(100),
        expense_date DATE,
        payment_mode VARCHAR(50),
        remark TEXT,
        bills TEXT, -- Stored as JSON string
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Individual column checks to be 100% safe
    const columns = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(10)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expiry TIMESTAMP',
      'ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_done_by VARCHAR(100)',
      'ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(100)',
      'ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date DATE',
      'ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50)',
      'ALTER TABLE expenses ADD COLUMN IF NOT EXISTS remark TEXT',
      'ALTER TABLE expenses ADD COLUMN IF NOT EXISTS bills TEXT'
    ];

    for (const sql of columns) {
      await db.query(sql).catch(() => {});
    }
    
    console.log('✅ Database schema verified (Users & Expenses)');
  } catch (err) {
    console.error('❌ Database Initialization Error:', err);
  }
};
initDb();

// --------------------
// Debug /test POST
// --------------------
app.post('/test', (req, res) => {
  console.log('POST /test body:', req.body);
  res.json({ message: 'POST received', body: req.body });
});

// --------------------
// LOGIN
// --------------------
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('--- Login Attempt ---');
  
  const sql = 'SELECT * FROM users WHERE email ILIKE $1'; // Case-insensitive match with ILIKE

  try {
    const results = await db.query(sql, [email]);
    
    if (results.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = results.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --------------------
// GET EXPENSES
// --------------------
app.get('/api/expenses', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ message: 'user_id is required' });

  const sql = 'SELECT * FROM expenses WHERE user_id = $1 ORDER BY id DESC';
  try {
    const results = await db.query(sql, [userId]);
    res.json(results.rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

// --------------------
// ADD EXPENSE
// --------------------
app.post('/api/expenses', async (req, res) => {
  const {
    user_id,
    expense_name,
    amount,
    expense_done_by,
    category,
    expense_date,
    payment_mode,
    remark,
    bills
  } = req.body;

  if (!user_id) return res.status(400).json({ message: 'user_id is required' });

  const sql = `
    INSERT INTO expenses
    (user_id, expense_name, amount, expense_done_by, category, expense_date, payment_mode, remark, bills)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `;

  try {
    console.log('Adding Expense with bills:', bills ? bills.length : 0);
    const result = await db.query(sql, [
      user_id, 
      expense_name, 
      amount, 
      expense_done_by, 
      category, 
      expense_date, 
      payment_mode, 
      remark,
      bills ? JSON.stringify(bills) : '[]' // Ensure it's never null/empty
    ]);
    res.status(201).json({
      message: 'Expense added successfully',
      id: result.rows[0].id 
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// --------------------
// UPDATE EXPENSE
// --------------------
app.put('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  const {
    expense_name,
    amount,
    expense_done_by,
    category,
    expense_date,
    payment_mode,
    remark,
    bills
  } = req.body;

  const sql = `
    UPDATE expenses
    SET expense_name = $1, amount = $2, expense_done_by = $3, category = $4, 
        expense_date = $5, payment_mode = $6, remark = $7, bills = $8
    WHERE id = $9
  `;

  try {
    await db.query(sql, [
      expense_name, 
      amount, 
      expense_done_by, 
      category, 
      expense_date, 
      payment_mode, 
      remark, 
      bills ? JSON.stringify(bills) : null,
      id
    ]);
    res.json({ message: 'Expense updated successfully' });
  } catch (err) {
    res.status(500).json(err);
  }
});

// --------------------
// DELETE EXPENSE
// --------------------
app.delete('/api/expenses/:id', async (req, res) => {
  const sql = 'DELETE FROM expenses WHERE id = $1';
  try {
    await db.query(sql, [req.params.id]);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json(err);
  }
});

// --------------------
// REGISTER
// --------------------
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, email, mobileNumber, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const sql = `
    INSERT INTO users (first_name, last_name, email, phone, password) 
    VALUES ($1, $2, $3, $4, $5) 
    RETURNING id
  `;

  try {
    const result = await db.query(sql, [firstName || null, lastName || null, email, mobileNumber || null, password]);
    res.status(201).json({
      message: 'User registered successfully',
      userId: result.rows[0].id
    });
  } catch (err) {
    console.error('❌ Registration Error:', err);
    if (err.code === '23505') { // PostgreSQL unique violation code
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// --------------------
// UPDATE PROFILE
// --------------------
app.put('/api/profile/:id', async (req, res) => {
  const userId = req.params.id;
  const { email, phone, first_name, last_name, profile_image } = req.body;
  
  console.log(`🚀 Updating Profile for User ${userId}:`, { email, phone, first_name, last_name, hasImage: !!profile_image });

  const sql = 'UPDATE users SET email = $1, phone = $2, first_name = $3, last_name = $4, profile_image = $5 WHERE id = $6';

  try {
    const result = await db.query(sql, [email || null, phone || null, first_name || null, last_name || null, profile_image || null, userId]);
    console.log(`✅ Profile updated. Rows affected: ${result.rowCount}`);
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('❌ SQL Update Error:', err.message);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// --------------------
// GET PROFILE
// --------------------
app.get('/api/profile/:id', async (req, res) => {
  const userId = req.params.id;
  const sql = 'SELECT email, phone, first_name, last_name, profile_image FROM users WHERE id = $1';

  try {
    const results = await db.query(sql, [userId]);
    if (results.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    
    console.log(`📥 DB Profile Result for User ${userId}:`, results.rows[0]);
    res.json(results.rows[0]);
  } catch (err) {
    console.error('❌ SQL Fetch Error:', err.message);
    res.status(500).json(err);
  }
});

// --------------------
// CHANGE PASSWORD
// --------------------
app.put('/api/profile/:id/change-password', async (req, res) => {
  const userId = req.params.id;
  const { oldPassword, newPassword } = req.body;

  try {
    const checkSql = 'SELECT password FROM users WHERE id = $1';
    const results = await db.query(checkSql, [userId]);

    if (results.rows.length === 0 || results.rows[0].password !== oldPassword) {
      return res.status(401).json({ message: 'Current password incorrect' });
    }

    const updateSql = 'UPDATE users SET password = $1 WHERE id = $2';
    await db.query(updateSql, [newPassword, userId]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Update failed' });
  }
});

// --------------------
// FORGOT PASSWORD
// --------------------
app.post('/api/forgot-password/request', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone number is required' });

  try {
    const userResult = await db.query('SELECT id, email, first_name FROM users WHERE phone = $1', [phone]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'No account found with this mobile number' });
    }

    const user = userResult.rows[0];
    if (!user.email) {
      return res.status(400).json({ message: 'No email associated with this account' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60000); // 10 minutes from now

    await db.query('UPDATE users SET reset_otp = $1, reset_otp_expiry = $2 WHERE id = $3', [otp, expiry, user.id]);

    const mailOptions = {
      from: 'Expense Tracker <eshikapakhale@gmail.com>',
      to: user.email,
      subject: 'Password Reset OTP - Expense Tracker',
      html: `<h3>Hello ${user.first_name || 'User'},</h3><p>Your OTP for password reset is <strong>${otp}</strong>.</p><p>This OTP is valid for 10 minutes. Do not share this with anyone.</p>`
    };

    await transporter.sendMail(mailOptions);
    
    // Mask email for security (e.g., e***@gmail.com)
    const [name, domain] = user.email.split('@');
    const maskedEmail = name[0] + '*'.repeat(name.length > 1 ? name.length - 1 : 1) + '@' + domain;
    
    res.json({ message: 'OTP sent successfully', maskedEmail, email: user.email }); 
  } catch (err) {
    console.error('Forgot Password Request Error:', err);
    res.status(500).json({ message: 'Failed to process request. Check email configuration.' });
  }
});

app.post('/api/forgot-password/verify', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

  try {
    const result = await db.query('SELECT reset_otp, reset_otp_expiry FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = result.rows[0];
    if (user.reset_otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    if (new Date() > new Date(user.reset_otp_expiry)) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

app.post('/api/forgot-password/reset', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ message: 'Missing required fields' });

  try {
    const result = await db.query('SELECT reset_otp, reset_otp_expiry FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = result.rows[0];
    if (user.reset_otp !== otp || new Date() > new Date(user.reset_otp_expiry)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await db.query('UPDATE users SET password = $1, reset_otp = NULL, reset_otp_expiry = NULL WHERE email = $2', [newPassword, email]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

app.get('/', (req, res) => {
  res.send('✅ Backend is running with NeonDB!');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});