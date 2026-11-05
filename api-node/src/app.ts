import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/error";
import { authRouter } from "./modules/auth/auth.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { productsRouter } from "./modules/products/products.routes";

// The app is separate from the server so tests can use it without opening a port (guide 2.10).
// Orders are added on Wednesday.
export const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN })); // NFR-04: only the frontend may call us
app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/products", productsRouter);
app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found", details: [] } });
});
app.use(errorHandler);
