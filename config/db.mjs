

import mysql from 'mysql2';

// const db = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: 'Vidhi@9689',
//   database: 'expense_tracker'
// });

const db = mysql.createConnection({
  host: 'sql12.freesqldatabase.com',
  user: 'sql12814504',
  password: 'I1ZlIJBQDa',
  database: 'sql12814504',
  port: 3306
});




db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err);
  } else {
    console.log('✅ MySQL Connected');
  }
});

export default db;



