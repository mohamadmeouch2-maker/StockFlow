import cors from "cors";
import express from "express";
import { uploadRoot } from "./lib/uploads";
import { errorHandler } from "./middleware/error";
import { authRouter } from "./modules/auth/auth.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { productsRouter } from "./modules/products/products.routes";
import { reportsRouter } from "./modules/reports/reports.routes";

// The app is separate from the server so tests can use it without opening a port (guide 2.10).
export const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN })); // NFR-04: only the frontend may call us
app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
// FR-17: product photos, e.g. GET /uploads/products/product-1-1762412345678.jpg
app.use(
  "/uploads",
  express.static(uploadRoot, {
    maxAge: "7d", // a new photo always gets a new file name, so browsers may keep old ones
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  }),
);
app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/reports", reportsRouter);
app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found", details: [] } });
});
app.use(errorHandler);
