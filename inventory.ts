export {} ;
interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

const product: Product = {
  id: 1,
  name: "Laptop",
  price: 800,
  stock: 10
};

console.log("Product:", product);
const products: Product[] = [
  { id: 1, name: "Laptop", price: 800, stock: 10 },
  { id: 2, name: "Mouse", price: 20, stock: 50 },
  { id: 3, name: "Keyboard", price: 40, stock: 25 },
  { id: 4, name: "Monitor", price: 200, stock: 15 }
];

console.log("All Products:", products);
const calculateInventoryValue = (
  price: number,
  stock: number
): number => {
  return price * stock;
};

const total = calculateInventoryValue(800, 10);

console.log("Inventory Value:", total);
function findProduct(name: string): Product | undefined {
  return products.find(
    (product) => product.name === name
  );
}

const result = findProduct("Mouse");

console.log("Search Result:", result);