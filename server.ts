import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import { createServer as createViteServer } from "vite";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use DATABASE_URL from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://user:password@localhost:5432/trip_expense",
  ssl: true // Neon requires SSL
});

// --- Database Setup ---
const initDb = async () => {
  // In a real production app, you might use a migration tool.
  // For this example, we'll try to connect and create tables if they don't exist.
  // Note: We catch connection errors to allow the app to start (and fail gracefully or retry) 
  // if the DB isn't ready immediately, though typically we want to wait.
  
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name TEXT,
        totalBudget INTEGER DEFAULT 0,
        platinumTicket INTEGER DEFAULT 0,
        pendingPlatinum INTEGER DEFAULT 0,
        flightTotal INTEGER DEFAULT 0,
        myFlightShare INTEGER DEFAULT 0,
        stay INTEGER DEFAULT 0,
        expectedIncoming INTEGER DEFAULT 0,
        baseSavings INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
        title TEXT,
        amount INTEGER,
        category TEXT,
        accountId TEXT,
        date TEXT,
        time TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS incomes (
        id TEXT PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
        title TEXT,
        amount INTEGER,
        category TEXT,
        accountId TEXT,
        date TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS places (
        id TEXT PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
        title TEXT,
        category TEXT
      );
    `);
  } catch (err) {
    console.error("Error initializing database:", err);
  } finally {
    if (client) client.release();
  }
};

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

async function startServer() {
  await initDb();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

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
  app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body;
    try {
      const hash = bcrypt.hashSync(password, 10);
      const result = await pool.query(
        "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
        [username, hash]
      );
      const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET);
      res.json({ token, username });
    } catch (err: any) {
      if (err.code === "23505") { // Unique violation in PG
        res.status(400).json({ error: "Username already exists" });
      } else {
        console.error(err);
        res.status(500).json({ error: "Server error" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
      const user = result.rows[0];

      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      res.json({ token, username });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // --- Data Routes ---
  app.get("/api/trips", authenticate, async (req: any, res) => {
    try {
      const result = await pool.query("SELECT * FROM trips WHERE user_id = $1", [req.userId]);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  app.post("/api/trips", authenticate, async (req: any, res) => {
    const { id, name, totalBudget } = req.body;
    try {
      await pool.query(
        "INSERT INTO trips (id, user_id, name, totalBudget) VALUES ($1, $2, $3, $4)",
        [id, req.userId, name, totalBudget || 0]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create trip" });
    }
  });

  app.delete("/api/trips/:id", authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM trips WHERE id = $1 AND user_id = $2", [id, req.userId]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete trip" });
    }
  });

  app.get("/api/trips/:id/data", authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
      const tripResult = await pool.query("SELECT * FROM trips WHERE id = $1 AND user_id = $2", [id, req.userId]);
      const trip = tripResult.rows[0];
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      const expenses = await pool.query("SELECT * FROM expenses WHERE trip_id = $1 ORDER BY id DESC", [id]);
      const incomes = await pool.query("SELECT * FROM incomes WHERE trip_id = $1 ORDER BY id DESC", [id]);
      const places = await pool.query("SELECT * FROM places WHERE trip_id = $1 ORDER BY id DESC", [id]);

      res.json({ trip, expenses: expenses.rows, incomes: incomes.rows, places: places.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch trip data" });
    }
  });

  app.post("/api/trips/:id/finances", authenticate, async (req: any, res) => {
    const { id } = req.params;
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

    try {
      await pool.query(`
        UPDATE trips SET 
          totalBudget = $1, platinumTicket = $2, pendingPlatinum = $3, 
          flightTotal = $4, myFlightShare = $5, stay = $6, 
          expectedIncoming = $7, baseSavings = $8
        WHERE id = $9 AND user_id = $10
      `, [
        totalBudget,
        platinumTicket,
        pendingPlatinum,
        flightTotal,
        myFlightShare,
        stay,
        expectedIncoming,
        baseSavings,
        id,
        req.userId,
      ]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update finances" });
    }
  });

  app.post("/api/expenses", authenticate, async (req: any, res) => {
    const { id, trip_id, title, amount, category, accountId, date, time } = req.body;
    try {
      await pool.query(
        "INSERT INTO expenses (id, user_id, trip_id, title, amount, category, accountId, date, time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [id, req.userId, trip_id, title, amount, category, accountId, date, time]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to add expense" });
    }
  });

  app.post("/api/incomes", authenticate, async (req: any, res) => {
    const { id, trip_id, title, amount, category, accountId, date } = req.body;
    try {
      await pool.query(
        "INSERT INTO incomes (id, user_id, trip_id, title, amount, category, accountId, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [id, req.userId, trip_id, title, amount, category, accountId, date]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to add income" });
    }
  });

  app.post("/api/places", authenticate, async (req: any, res) => {
    const { id, trip_id, title, category } = req.body;
    try {
      await pool.query(
        "INSERT INTO places (id, user_id, trip_id, title, category) VALUES ($1, $2, $3, $4, $5)",
        [id, req.userId, trip_id, title, category]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to add place" });
    }
  });

  app.delete("/api/places/:id", authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query("DELETE FROM places WHERE id = $1 AND user_id = $2", [id, req.userId]);
      if (result.rowCount && result.rowCount > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Place not found" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete place" });
    }
  });

  app.post("/api/reset", authenticate, async (req: any, res) => {
    try {
      await pool.query("DELETE FROM expenses WHERE user_id = $1", [req.userId]);
      await pool.query("DELETE FROM incomes WHERE user_id = $1", [req.userId]);
      await pool.query("DELETE FROM places WHERE user_id = $1", [req.userId]);
      await pool.query("DELETE FROM trips WHERE user_id = $1", [req.userId]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to reset data" });
    }
  });

  // --- Vite Middleware (Development) ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

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
}

startServer();
