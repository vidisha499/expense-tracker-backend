
import express from 'express';
import db from '../config/db.mjs';

const router = express.Router();

// --------------------
// REGISTER USER
// POST /api/users/register
// --------------------
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const sql =
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';

  db.query(sql, [name, email, password], (err, result) => {
    if (err) {
      console.error('❌ SQL ERROR:', err);
      return res.status(500).json(err);
    }

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId
    });
  });
});

// --------------------
// LOGIN USER
// POST /api/users/login
// --------------------
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql =
    'SELECT * FROM users WHERE email = ? AND password = ?';

  db.query(sql, [email, password], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Login failed' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      user: results[0]
    });
  });
});

export default router;
