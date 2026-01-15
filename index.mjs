// index.mjs
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';

// --------------------
// MySQL Connection
// --------------------
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Vidhi@9689',
  database: 'expense_tracker'
});

db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err);
  } else {
    console.log('✅ MySQL Connected to database:', 'expense_tracker');
  }
});

// --------------------
// Express App
// --------------------
const app = express();
const PORT = 8008;

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:8100', // your Ionic frontend
  methods: ['GET', 'POST', 'DELETE', 'PUT']
}));

// --------------------
// Debug /test POST
// --------------------
app.post('/test', (req, res) => {
  console.log('POST /test body:', req.body);
  res.json({ message: 'POST received', body: req.body });
});

// --------------------
// Auth Login
// --------------------
// app.post('/auth/login', (req, res) => {
//   const { email, password } = req.body;
//   const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';

//   db.query(sql, [email, password], (err, results) => {
//     if (err) {
//       console.error(err);
//       return res.status(500).json({ message: 'Login failed' });
//     }

//     if (results.length === 0) {
//       return res.status(401).json({ message: 'Invalid email or password' });
//     }

//     res.json({
//       message: 'Login successful',
//       user: results[0]
//     });
//   });
// });

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';

  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (result.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: result[0].id,
        email: result[0].email
      }
    });
  });
});


// --------------------
// GET all expenses
// --------------------
// app.get('/expenses', (req, res) => {
//   const sql = 'SELECT * FROM expenses';
//   db.query(sql, (err, results) => {
//     if (err) return res.status(500).json(err);
//     res.json(results);
//   });
// });

// app.get('/expenses', (req, res) => {

//   const userId = req.query.user_id; // 🔑 from frontend

//   if (!userId) {
//     return res.status(400).json({ message: 'user_id is required' });
//   }

//   const sql = 'SELECT * FROM expenses WHERE user_id = ? ORDER BY id DESC';

//   db.query(sql, [userId], (err, results) => {
//     if (err) return res.status(500).json(err);
//     res.json(results);
//   });
// });

app.get('/expenses', (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ message: 'user_id is required' });

  const sql = 'SELECT * FROM expenses WHERE user_id = ? ORDER BY id DESC';
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results); // Results will now include the 'remark' column
  });
});


// --------------------
// ADD new expense
// --------------------
// app.post('/expenses', (req, res) => {
//   const { expense_name, amount, expense_done_by, category, expense_date, payment_mode } = req.body;
//   const sql = `
//     INSERT INTO expenses
//     (expense_name, amount, expense_done_by, category, expense_date, payment_mode)
//     VALUES (?, ?, ?, ?, ?, ?)
//   `;

//   db.query(sql, [expense_name, amount, expense_done_by, category, expense_date, payment_mode], (err, result) => {
//     if (err) return res.status(500).json(err);
//     res.status(201).json({
//       message: 'Expense added successfully',
//       expenseId: result.insertId
//     });
//   });
// });

// app.post('/expenses', (req, res) => {

//   const {
//     user_id,              // 🔑 GET USER ID
//     expense_name,
//     amount,
//     expense_done_by,
//     category,
//     expense_date,
//     payment_mode
//   } = req.body;

//   if (!user_id) {
//     return res.status(400).json({ message: 'user_id is required' });
//   }

//   const sql = `
//     INSERT INTO expenses
//     (user_id, expense_name, amount, expense_done_by, category, expense_date, payment_mode)
//     VALUES (?, ?, ?, ?, ?, ?, ?)
//   `;

//   db.query(
//     sql,
//     [
//       user_id,
//       expense_name,
//       amount,
//       expense_done_by,
//       category,
//       expense_date,
//       payment_mode
//     ],
//     (err, result) => {
//       if (err) return res.status(500).json(err);

//       res.status(201).json({
//         message: 'Expense added successfully',
//         id: result.insertId   // frontend expects this
//       });
//     }
//   );
// });

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

app.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';

  db.query(sql, [name, email, password], (err, result) => {
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

// --------------------
// UPDATE USER PROFILE
// PUT /api/profile/:id
// --------------------
// app.post('/api/profile/:id', (req, res) => {
//   const userId = req.params.id;
//   const { email, phone, bio, darkMode, notifications } = req.body;

//   const sql = `
//     UPDATE users 
//     SET email = ?, phone = ?, bio = ?, darkMode = ?, notifications = ? 
//     WHERE id = ?
//   `;


//   db.query(
//   sql, 
//   [email, phone, bio, darkMode ? 1 : 0, notifications ? 1 : 0, userId], 
//   (err, result) => {
//     if (err) {
//       console.error(err);
//       // Check for Duplicate Entry error code
//       if (err.code === 'ER_DUP_ENTRY') {
//         return res.status(400).json({ message: 'This email is already taken by another account.' });
//       }
//       return res.status(500).json({ message: 'Failed to update profile' });
//     }
//     res.json({ message: 'Profile updated successfully' });
//   }
// );
  
// });

// --------------------
// UPDATE USER PROFILE
// Matches Frontend: this.http.put(`${this.API_URL}/${userId}`, data)
// --------------------
app.put('/api/profile/:id', (req, res) => {
  const userId = req.params.id;
  const { email, phone, bio, darkMode, notifications } = req.body;

  const sql = `
    UPDATE users 
    SET email = ?, phone = ?, bio = ?, darkMode = ?, notifications = ? 
    WHERE id = ?
  `;

  db.query(
    sql, 
    [email, phone, bio, darkMode ? 1 : 0, notifications ? 1 : 0, userId], 
    (err, result) => {
      if (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Email already in use.' });
        }
        return res.status(500).json({ message: 'Failed to update profile' });
      }
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// --------------------
// GET USER PROFILE
// GET /api/profile/:id
// --------------------
app.get('/api/profile/:id', (req, res) => {
  const userId = req.params.id;
  const sql = 'SELECT email, phone, bio, darkMode, notifications FROM users WHERE id = ?';

  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });
    
    // Convert 0/1 from MySQL back to true/false for Ionic Toggles
    const user = results[0];
    user.darkMode = !!user.darkMode;
    user.notifications = !!user.notifications;
    
    res.json(user);
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
