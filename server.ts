import "dotenv/config";
import express from "express";

console.log("DATABASE_URL:", process.env.DATABASE_URL);
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

let pool: pg.Pool | null = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is required. Please set it in the environment variables.");
    }
    pool = new Pool({
      connectionString,
      ssl: true // Neon requires SSL
    });
  }
  return pool;
}

// --- Database Setup ---
const initDb = async () => {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Skipping database initialization.");
    return;
  }
  
  let client;
  try {
    client = await getPool().connect();
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
        category TEXT,
        lat FLOAT,
        lng FLOAT,
        rating FLOAT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule (
        id TEXT PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
        place_id TEXT REFERENCES places(id) ON DELETE CASCADE,
        date TEXT,
        time TEXT,
        notes TEXT
      );
    `);

    // Migrations
    await client.query(`
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 3;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS custom_costs JSONB DEFAULT '[]';
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS image_seed TEXT;
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS cover_image TEXT;
      ALTER TABLE places ADD COLUMN IF NOT EXISTS lat FLOAT;
      ALTER TABLE places ADD COLUMN IF NOT EXISTS lng FLOAT;
      ALTER TABLE places ADD COLUMN IF NOT EXISTS rating FLOAT;
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
  app.use(express.json({ limit: '10mb' }));

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
      const result = await getPool().query(
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
      const result = await getPool().query("SELECT * FROM users WHERE username = $1", [username]);
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
      const result = await getPool().query(`
        SELECT t.id, t.user_id, t.name, 
          t.totalBudget as "totalBudget", 
          t.platinumTicket as "platinumTicket", 
          t.pendingPlatinum as "pendingPlatinum", 
          t.flightTotal as "flightTotal", 
          t.myFlightShare as "myFlightShare", 
          t.stay, 
          t.expectedIncoming as "expectedIncoming", 
          t.baseSavings as "baseSavings",
          t.duration,
          t.image_seed as "imageSeed",
          t.cover_image as "coverImage",
          t.custom_costs as "customCosts",
          COALESCE((SELECT SUM(amount) FROM expenses WHERE trip_id = t.id AND accountId = 'trip'), 0) as "tripDynamicSpent",
          COALESCE((SELECT SUM(amount) FROM incomes WHERE trip_id = t.id AND accountId = 'trip'), 0) as "tripDynamicIncome"
        FROM trips t WHERE t.user_id = $1
      `, [req.userId]);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  app.post("/api/trips", authenticate, async (req: any, res) => {
    const { id, name, totalBudget, duration } = req.body;
    try {
      await getPool().query(
        "INSERT INTO trips (id, user_id, name, totalBudget, duration) VALUES ($1, $2, $3, $4, $5)",
        [id, req.userId, name, totalBudget || 0, duration || 3]
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
      await getPool().query("DELETE FROM trips WHERE id = $1 AND user_id = $2", [id, req.userId]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete trip" });
    }
  });

  app.get("/api/trips/:id/data", authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
      const tripResult = await getPool().query(`
        SELECT id, user_id, name, 
          totalBudget as "totalBudget", 
          platinumTicket as "platinumTicket", 
          pendingPlatinum as "pendingPlatinum", 
          flightTotal as "flightTotal", 
          myFlightShare as "myFlightShare", 
          stay, 
          expectedIncoming as "expectedIncoming", 
          baseSavings as "baseSavings",
          duration,
          image_seed as "imageSeed",
          cover_image as "coverImage",
          custom_costs as "customCosts"
        FROM trips WHERE id = $1 AND user_id = $2
      `, [id, req.userId]);
      const trip = tripResult.rows[0];
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      const expenses = await getPool().query(`
        SELECT id, user_id, trip_id, title, amount, category, accountId as "accountId", date, time 
        FROM expenses WHERE trip_id = $1 ORDER BY id DESC
      `, [id]);
      const incomes = await getPool().query(`
        SELECT id, user_id, trip_id, title, amount, category, accountId as "accountId", date 
        FROM incomes WHERE trip_id = $1 ORDER BY id DESC
      `, [id]);
      const places = await getPool().query("SELECT * FROM places WHERE trip_id = $1 ORDER BY id DESC", [id]);
      const schedule = await getPool().query(`
        SELECT s.id, s.user_id, s.trip_id, s.place_id, s.date, s.time, s.notes, 
               p.title as place_title, p.category as place_category,
               p.lat as place_lat, p.lng as place_lng, p.rating as place_rating
        FROM schedule s
        JOIN places p ON s.place_id = p.id
        WHERE s.trip_id = $1
        ORDER BY s.date ASC, s.time ASC
      `, [id]);

      res.json({ trip, expenses: expenses.rows, incomes: incomes.rows, places: places.rows, schedule: schedule.rows });
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
      customCosts,
      imageSeed,
      coverImage,
    } = req.body;

    try {
      await getPool().query(`
        UPDATE trips SET 
          totalBudget = $1, platinumTicket = $2, pendingPlatinum = $3, 
          flightTotal = $4, myFlightShare = $5, stay = $6, 
          expectedIncoming = $7, baseSavings = $8, custom_costs = $9,
          image_seed = $10, cover_image = $11
        WHERE id = $12 AND user_id = $13
      `, [
        totalBudget,
        platinumTicket,
        pendingPlatinum,
        flightTotal,
        myFlightShare,
        stay,
        expectedIncoming,
        baseSavings,
        JSON.stringify(customCosts || []),
        imageSeed || null,
        coverImage || null,
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
      await getPool().query(
        "INSERT INTO expenses (id, user_id, trip_id, title, amount, category, accountId, date, time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [id, req.userId, trip_id, title, amount, category, accountId, date, time]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to add expense" });
    }
  });

  app.delete("/api/expenses/:id", authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
      const result = await getPool().query("DELETE FROM expenses WHERE id = $1 AND user_id = $2", [id, req.userId]);
      if (result.rowCount && result.rowCount > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Expense not found" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  app.post("/api/incomes", authenticate, async (req: any, res) => {
    const { id, trip_id, title, amount, category, accountId, date } = req.body;
    try {
      await getPool().query(
        "INSERT INTO incomes (id, user_id, trip_id, title, amount, category, accountId, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [id, req.userId, trip_id, title, amount, category, accountId, date]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to add income" });
    }
  });

  app.delete("/api/incomes/:id", authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
      const result = await getPool().query("DELETE FROM incomes WHERE id = $1 AND user_id = $2", [id, req.userId]);
      if (result.rowCount && result.rowCount > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Income not found" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete income" });
    }
  });

  app.post("/api/places", authenticate, async (req: any, res) => {
    const { id, trip_id, title, category, lat, lng, rating } = req.body;
    
    let finalLat = lat;
    let finalLng = lng;

    // If lat/lng are missing, try to geocode the title
    if (!finalLat || !finalLng) {
      try {
        const query = encodeURIComponent(title);
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
          headers: {
            "User-Agent": "AI-Studio-Travel-App/1.0"
          }
        });
        const data: any = await geoRes.json();
        if (data && data.length > 0) {
          finalLat = parseFloat(data[0].lat);
          finalLng = parseFloat(data[0].lon);
        }
      } catch (geoErr) {
        console.error("Geocoding failed:", geoErr);
        // Continue without coordinates if geocoding fails
      }
    }

    try {
      await getPool().query(
        "INSERT INTO places (id, user_id, trip_id, title, category, lat, lng, rating) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [id, req.userId, trip_id, title, category, finalLat, finalLng, rating]
      );
      
      // Return the created place object so the frontend can update state with the new lat/lng
      res.json({ 
        success: true, 
        place: { id, trip_id, title, category, lat: finalLat, lng: finalLng, rating } 
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to add place" });
    }
  });

  app.delete("/api/places/:id", authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
      const result = await getPool().query("DELETE FROM places WHERE id = $1 AND user_id = $2", [id, req.userId]);
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

  app.post("/api/schedule", authenticate, async (req: any, res) => {
    const { id, trip_id, place_id, date, time, notes } = req.body;
    try {
      await getPool().query(
        "INSERT INTO schedule (id, user_id, trip_id, place_id, date, time, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [id, req.userId, trip_id, place_id, date, time, notes]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to add schedule item" });
    }
  });

  app.delete("/api/schedule/:id", authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
      const result = await getPool().query("DELETE FROM schedule WHERE id = $1 AND user_id = $2", [id, req.userId]);
      if (result.rowCount && result.rowCount > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Schedule item not found" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete schedule item" });
    }
  });

  app.post("/api/reset", authenticate, async (req: any, res) => {
    try {
      await getPool().query("DELETE FROM expenses WHERE user_id = $1", [req.userId]);
      await getPool().query("DELETE FROM incomes WHERE user_id = $1", [req.userId]);
      await getPool().query("DELETE FROM schedule WHERE user_id = $1", [req.userId]);
      await getPool().query("DELETE FROM places WHERE user_id = $1", [req.userId]);
      await getPool().query("DELETE FROM trips WHERE user_id = $1", [req.userId]);
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
