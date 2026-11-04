import express from "express";
import { products } from "./products";
const app = express();
app.use(express.json());
const PORT = 4000;

app.get("/", (req, res) => {
  res.send("Welcome to StockFlow API!");
});


app.get("/products", (req, res) => {
  

  res.json(products);
});
app.get("/products/:id", (req, res) => {
  const id = Number(req.params.id);

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
    id: Math.max(0, ...products.map(p => p.id)) + 1,
    name: name.trim(),
    price,
    stock
  };

  products.push(newProduct);

  res.status(201).json(newProduct);
});
app.patch("/products/:id/stock", (req, res) => {
  const id = Number(req.params.id);
  const { stock } = req.body ?? {};

  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({
      message: "Product not found"
    });
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({
      message: "Invalid stock"
    });
  }

  product.stock = stock;

  return res.json(product);
});
app.delete("/products/:id", (req, res) => {
  const id = Number(req.params.id);

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
  const id = Number(req.params.id);
  const product = products.find((p) => p.id === id);

  if (!product) {
    return res.status(404).json({
      message: "Product not found"
    });
  }
  const { name, price, stock } = req.body;

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
  product.name = req.body.name;
  product.price = req.body.price;
  product.stock = req.body.stock;
  return res.json({
  message: "Product updated successfully",
  product: product
});
})
app.patch("/products/:id/stock", (req, res) => {
  const id = Number(req.params.id);
  const product = products.find((p) => p.id === id);

  if (!product) {
    return res.status(404).json({
      message: "Product not found"
    });
  }

  const { stock } = req.body;

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

app.listen(PORT, () => {
  console.log(`StockFlow API running on port ${PORT}`);});