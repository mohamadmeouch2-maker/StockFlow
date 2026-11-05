import dotenv from "dotenv";

// Loads the values from .env into process.env.
dotenv.config({ quiet: true });

if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
  throw new Error("Missing JWT_SECRET or DATABASE_URL. Copy .env.example to .env first.");
}
