// index.mjs


import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './config/db.mjs'; // Using your updated Postgres connection

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
    // Ensure table exists and has all columns
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Also try adding columns individually just in case the table existed without them
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)').catch(() => {});
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)').catch(() => {});
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)').catch(() => {});
    
    console.log('✅ Database schema verified');
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
  const { email, phone, first_name, last_name } = req.body;
  
  console.log(`🚀 Updating Profile for User ${userId}:`, { email, phone, first_name, last_name });

  const sql = 'UPDATE users SET email = $1, phone = $2, first_name = $3, last_name = $4 WHERE id = $5';

  try {
    const result = await db.query(sql, [email || null, phone || null, first_name || null, last_name || null, userId]);
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
  const sql = 'SELECT email, phone, first_name, last_name FROM users WHERE id = $1';

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

app.get('/', (req, res) => {
  res.send('✅ Backend is running with NeonDB!');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});