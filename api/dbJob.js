import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
dotenv.config()

const db = process.env.DBIP;
const user = process.env.DBUSER;
const pass = process.env.DBPASS;
const tab = process.env.TABLEJOB;
const pool = mysql.createPool({
  host: db,
  user: user,
  password: pass,
  database: tab,
  waitForConnections: true,
  connectionLimit: 1000,
  idleTimeout: 5000,
  queueLimit: 0,
});

export default pool;