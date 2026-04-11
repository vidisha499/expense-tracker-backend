// index.mjs


import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './config/db.mjs'; // Using your updated Postgres connection

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8008;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
  
  const sql = 'SELECT * FROM users WHERE email = $1'; // Postgres uses $1 instead of ?

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
    remark 
  } = req.body;

  if (!user_id) return res.status(400).json({ message: 'user_id is required' });

  const sql = `
    INSERT INTO expenses
    (user_id, expense_name, amount, expense_done_by, category, expense_date, payment_mode, remark)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `;

  try {
    const result = await db.query(sql, [user_id, expense_name, amount, expense_done_by, category, expense_date, payment_mode, remark]);
    res.status(201).json({
      message: 'Expense added successfully',
      id: result.rows[0].id 
    });
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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const sql = 'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id';

  try {
    const result = await db.query(sql, [email, password]);
    res.status(201).json({
      message: 'User registered successfully',
      userId: result.rows[0].id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

// --------------------
// UPDATE PROFILE
// --------------------
app.put('/api/profile/:id', async (req, res) => {
  const userId = req.params.id;
  const { email, phone } = req.body;

  const sql = 'UPDATE users SET email = $1, phone = $2 WHERE id = $3';

  try {
    await db.query(sql, [email || null, phone || null, userId]);
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('❌ SQL Error:', err.message);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// --------------------
// GET PROFILE
// --------------------
app.get('/api/profile/:id', async (req, res) => {
  const userId = req.params.id;
  const sql = 'SELECT email, phone FROM users WHERE id = $1';

  try {
    const results = await db.query(sql, [userId]);
    if (results.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(results.rows[0]);
  } catch (err) {
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