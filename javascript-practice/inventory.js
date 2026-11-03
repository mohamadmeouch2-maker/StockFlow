const product = {
  id: 1,
  name: "Laptop",
  price: 800,
  stock: 10
};

const calculateInventoryValue = (price, stock) => {
  return price * stock;
};

const total = calculateInventoryValue(
  product.price,
  product.stock
);

console.log("Product:", product.name);
console.log("Inventory Value:", total);
const products = [
  { id: 1, name: "Laptop", price: 800, stock: 10 },
  { id: 2, name: "Mouse", price: 20, stock: 50 },
  { id: 3, name: "Keyboard", price: 40, stock: 25 },
  { id: 4, name: "Monitor", price: 200, stock: 15 }
];

const totalInventory = products.reduce((sum, item) => {
  return sum + item.price * item.stock;
}, 0);

console.log("Total Inventory:", totalInventory);
function findProduct(name) {
  return products.find(product => product.name === name);
}

const result = findProduct("Mouse");

console.log("Search Result:", result);function addProduct(id, name, price, stock) {
  const newProduct = {
    id: id,
    name: name,
    price: price,
    stock: stock
  };

  products.push(newProduct);

  console.log("Product Added:", newProduct);
}

addProduct(5, "Phone", 500, 8);

console.log("Updated Products:", products);
function updateStock(id, newStock) {
  const product = products.find(p => p.id === id);

  if (product) {
    product.stock = newStock;
    console.log("Stock Updated:", product);
  } else {
    console.log("Product Not Found");
  }
}

updateStock(1, 7);
