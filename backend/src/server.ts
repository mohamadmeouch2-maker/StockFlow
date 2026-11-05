import express, { type ErrorRequestHandler } from "express";
import { products } from "./products";
const app = express();
app.use(express.json());
const PORT = Number(process.env.PORT) || 4000;

// Only ever counts up, so a deleted product's ID is never given to a new product.
let nextId = Math.max(0, ...products.map((p) => p.id)) + 1;

// IDs must be plain positive whole numbers: "7" is valid; "0x7", "7.0" and "abc" are not.
function parseId(value: string): number | null {
  const id = Number(value);
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(id) ? id : null;
}

app.get("/", (req, res) => {
  res.send("Welcome to StockFlow API!");
});


app.get("/products", (req, res) => {
  

  res.json(products);
});
app.get("/products/:id", (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({
      message: "Invalid product ID"
    });
  }

  const product = products.find(
    (p) => p.id === id
  );

  if (!product) {
    return res.status(404).json({
      message: "Product not found"
    });
  }

  res.json(product);
});
app.post("/products", (req, res) => {
  const { name, price, stock } = req.body ?? {};
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0 ||
    typeof stock !== "number" ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    return res.status(400).json({
      message: "Invalid product data"
    });
  }

  const newProduct = {
    id: nextId++,
    name: name.trim(),
    price,
    stock
  };

  products.push(newProduct);

  res.status(201).json(newProduct);
});
app.patch("/products/:id/stock", (req, res) => {
  const id = parseId(req.params.id);
  const { stock } = req.body ?? {};

  if (id === null) {
    return res.status(400).json({
      message: "Invalid product ID"
    });
  }

  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({
      message: "Product not found"
    });
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({
      message: "Invalid stock value"
    });
  }

  product.stock = stock;

  return res.json({
    message: "Stock updated successfully",
    product: product
  });
});
app.delete("/products/:id", (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({
      message: "Invalid product ID"
    });
  }

  const index = products.findIndex(
    (p) => p.id === id
  );

  if (index === -1) {
    return res.status(404).json({
      message: "Product not found"
    });
  }

  const deletedProduct = products.splice(index, 1)[0];

  return res.json({
    message: "Product deleted successfully",
    product: deletedProduct
  });
});

app.put("/products/:id", (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({
      message: "Invalid product ID"
    });
  }

  const product = products.find((p) => p.id === id);

  if (!product) {
    return res.status(404).json({
      message: "Product not found"
    });
  }
  const { name, price, stock } = req.body ?? {};

if (
  typeof name !== "string" ||
  name.trim() === "" ||
  typeof price !== "number" ||
  !Number.isFinite(price) ||
  price < 0 ||
  typeof stock !== "number" ||
  !Number.isInteger(stock) ||
  stock < 0
) {
  return res.status(400).json({
    message: "Invalid product data"
  });
}
  product.name = name.trim();
  product.price = price;
  product.stock = stock;
  return res.json({
  message: "Product updated successfully",
  product: product
});
})
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

const handleErrors: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Invalid JSON body"
    });
  }

  // Other client errors from express.json() (e.g. 413 body too large) keep their status code.
  if (err?.status >= 400 && err?.status < 500) {
    return res.status(err.status).json({
      message: err.message
    });
  }

  console.error(err);
  return res.status(500).json({
    message: "Internal server error"
  });
};

app.use(handleErrors);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`StockFlow API running on port ${PORT}`);
  });
}

export { app };