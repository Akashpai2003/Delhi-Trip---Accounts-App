import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use persistent disk path on Render
const db = new Database("./app.db");

// --- Database Setup ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS finances (
    user_id INTEGER PRIMARY KEY,
    totalBudget INTEGER DEFAULT 0,
    platinumTicket INTEGER DEFAULT 0,
    pendingPlatinum INTEGER DEFAULT 0,
    flightTotal INTEGER DEFAULT 0,
    myFlightShare INTEGER DEFAULT 0,
    stay INTEGER DEFAULT 0,
    expectedIncoming INTEGER DEFAULT 0,
    baseSavings INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    title TEXT,
    amount INTEGER,
    category TEXT,
    accountId TEXT,
    date TEXT,
    time TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS incomes (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    title TEXT,
    amount INTEGER,
    category TEXT,
    accountId TEXT,
    date TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    title TEXT,
    category TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- Middleware ---
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- Auth Routes ---
app.post("/api/auth/register", (req, res) => {
  const { username, password } = req.body;
  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare("INSERT INTO users (username, password) VALUES (?, ?)")
      .run(username, hash);

    db.prepare("INSERT INTO finances (user_id) VALUES (?)").run(
      info.lastInsertRowid,
    );

    const token = jwt.sign({ userId: info.lastInsertRowid }, JWT_SECRET);
    res.json({ token, username });
  } catch (err: any) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.status(400).json({ error: "Username already exists" });
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as any;

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  res.json({ token, username });
});

// --- Data Routes ---
app.get("/api/data", authenticate, (req: any, res) => {
  const finances =
    db.prepare("SELECT * FROM finances WHERE user_id = ?").get(req.userId) ||
    {};
  const expenses = db
    .prepare("SELECT * FROM expenses WHERE user_id = ? ORDER BY id DESC")
    .all(req.userId);
  const incomes = db
    .prepare("SELECT * FROM incomes WHERE user_id = ? ORDER BY id DESC")
    .all(req.userId);
  const places = db
    .prepare("SELECT * FROM places WHERE user_id = ? ORDER BY id DESC")
    .all(req.userId);

  res.json({ finances, expenses, incomes, places });
});

app.post("/api/finances", authenticate, (req: any, res) => {
  const {
    totalBudget,
    platinumTicket,
    pendingPlatinum,
    flightTotal,
    myFlightShare,
    stay,
    expectedIncoming,
    baseSavings,
  } = req.body;

  db.prepare(`
    UPDATE finances SET 
      totalBudget = ?, platinumTicket = ?, pendingPlatinum = ?, 
      flightTotal = ?, myFlightShare = ?, stay = ?, 
      expectedIncoming = ?, baseSavings = ?
    WHERE user_id = ?
  `).run(
    totalBudget,
    platinumTicket,
    pendingPlatinum,
    flightTotal,
    myFlightShare,
    stay,
    expectedIncoming,
    baseSavings,
    req.userId,
  );

  res.json({ success: true });
});

// --- Serve frontend in production ---
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist")));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});