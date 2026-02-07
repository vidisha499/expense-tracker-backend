// index.mjs
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config(); // This MUST be called before const db

const db = mysql.createPool({
  host: process.env.DB_HOST ,
  user: process.env.DB_USER ,
  password: process.env.DB_PASS ,
  database: process.env.DB_NAME ,
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,   // Allows up to 10 connections at once
  queueLimit: 0,
  enableKeepAlive: true, // Sends a ping to stop the "closed state" error
  keepAliveInitialDelay: 10000
});

// For Pools, we use .getConnection to test the link
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to Cloud Database Pool');
    connection.release(); // Release it back to the pool
  }
});


// --------------------
// Express App
// --------------------
const app = express();
const PORT = 8008;

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




app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Log exactly what is arriving from the frontend
  console.log('--- Login Attempt ---');
  console.log(`Email from Frontend: [${email}]`);
  console.log(`Password from Frontend: [${password}]`);

  const sql = 'SELECT * FROM users WHERE email = ?'; // Query by email first to see what we find

  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length === 0) {
      console.log('Result: No user found with that email.');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = results[0];
    console.log(`User found in DB. Stored Password: [${user.password}]`);

    // Compare strictly
    if (user.password !== password) {
      console.log('Result: Password mismatch!');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('Result: Login Successful!');
    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email }
    });
  });
});



app.get('/expenses', (req, res) => {
  console.log("hit expenses get api");
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ message: 'user_id is required' });

  const sql = 'SELECT * FROM expenses WHERE user_id = ? ORDER BY id DESC';
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results); // Results will now include the 'remark' column
  });
});







app.post('/expenses', (req, res) => {
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [user_id, expense_name, amount, expense_done_by, category, expense_date, payment_mode, remark],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.status(201).json({
        message: 'Expense added successfully',
        id: result.insertId 
      });
    }
  );
});


// --------------------
// DELETE expense by ID
// --------------------
app.delete('/expenses/:id', (req, res) => {
  const sql = 'DELETE FROM expenses WHERE id = ?';
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Expense deleted successfully' });
  });
});

// --------------------
// Test GET root
// --------------------
app.get('/', (req, res) => {
  res.send('✅ Backend is running!');
});

// app.post('/register', (req, res) => {
//   const { name, email, password } = req.body;

//   if (!name || !email || !password) {
//     return res.status(400).json({ message: 'All fields are required' });
//   }

//   const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';

//   db.query(sql, [name, email, password], (err, result) => {
//     if (err) {
//       console.error(err);
//       return res.status(500).json(err);
//     }

//     res.status(201).json({
//       message: 'User registered successfully',
//       userId: result.insertId
//     });
//   });
// });

app.post('/register', (req, res) => {
  // 1. Only pull email and password from the request
  const { email, password } = req.body;

  // 2. Only check if email and password exist
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // 3. Update the SQL to match your table columns (id is usually auto-increment)
  const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';

  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId
    });
  });
});


app.put('/api/profile/:id', (req, res) => {
  const userId = req.params.id;
  const { email, phone } = req.body;

  const sql = 'UPDATE users SET email = ?, phone = ? WHERE id = ?';

  db.query(sql, [email || null, phone || null, userId], (err, result) => {
    if (err) {
      console.error('❌ SQL Error:', err.sqlMessage);
      return res.status(500).json({ message: 'Failed to update profile' });
    }
    res.json({ message: 'Profile updated successfully' });
  });
});

// --------------------
// GET USER PROFILE
// --------------------
app.get('/api/profile/:id', (req, res) => {
  const userId = req.params.id;
  const sql = 'SELECT email, phone FROM users WHERE id = ?';

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(results[0]);
  });
});

// --------------------
// CHANGE PASSWORD
// POST /api/profile/:id/change-password
// --------------------
app.put('/api/profile/:id/change-password', (req, res) => {
  const userId = req.params.id;
  const { oldPassword, newPassword } = req.body;

  // First, verify the old password
  const checkSql = 'SELECT password FROM users WHERE id = ?';
  db.query(checkSql, [userId], (err, results) => {
    if (err || results.length === 0 || results[0].password !== oldPassword) {
      return res.status(401).json({ message: 'Current password incorrect' });
    }

    // If correct, update to new password
    const updateSql = 'UPDATE users SET password = ? WHERE id = ?';
    db.query(updateSql, [newPassword, userId], (err) => {
      if (err) return res.status(500).json({ message: 'Update failed' });
      res.json({ message: 'Password updated successfully' });
    });
  });
});


// --------------------
// Start Server
// --------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


