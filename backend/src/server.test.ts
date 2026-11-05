import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { app } from "./server";
import { products } from "./products";
import type { Product } from "./types";

const seedProducts: Product[] = products.map((p) => ({ ...p }));

let server: Server;
let baseUrl: string;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(() => {
  server.close();
});

beforeEach(() => {
  products.splice(0, products.length, ...seedProducts.map((p) => ({ ...p })));
});

// Sends a request and checks that the API answered with JSON (never an HTML error page).
async function send(method: string, path: string, body?: unknown, contentType = "application/json") {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": contentType };
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${path}`, init);
  assert.match(res.headers.get("content-type") ?? "", /^application\/json/);
  return { status: res.status, body: await res.json() };
}

const validProduct = { name: "Tablet", price: 300, stock: 5 };

describe("GET", () => {
  test("GET / returns the welcome message", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "Welcome to StockFlow API!");
  });

  test("GET /products returns all products", async () => {
    const { status, body } = await send("GET", "/products");
    assert.equal(status, 200);
    assert.deepEqual(body, seedProducts);
  });

  test("GET /products/:id returns one product", async () => {
    const { status, body } = await send("GET", "/products/1");
    assert.equal(status, 200);
    assert.deepEqual(body, seedProducts[0]);
  });

  test("GET /products/:id returns 404 for a missing product", async () => {
    const { status, body } = await send("GET", "/products/999");
    assert.equal(status, 404);
    assert.equal(body.message, "Product not found");
  });
});

describe("product ID validation", () => {
  for (const badId of ["abc", "0", "-1", "1.0", "0x1", "1e0", "01"]) {
    test(`GET /products/${badId} returns 400`, async () => {
      const { status, body } = await send("GET", `/products/${badId}`);
      assert.equal(status, 400);
      assert.equal(body.message, "Invalid product ID");
    });
  }

  test("PUT, PATCH and DELETE also reject invalid IDs", async () => {
    assert.equal((await send("PUT", "/products/abc", validProduct)).status, 400);
    assert.equal((await send("PATCH", "/products/abc/stock", { stock: 1 })).status, 400);
    assert.equal((await send("DELETE", "/products/abc")).status, 400);
  });
});

describe("POST /products", () => {
  test("creates a product with a trimmed name", async () => {
    const { status, body } = await send("POST", "/products", { ...validProduct, name: "  Tablet  " });
    assert.equal(status, 201);
    assert.equal(body.name, "Tablet");
    assert.equal(body.price, 300);
    assert.equal(body.stock, 5);
    assert.ok(!seedProducts.some((p) => p.id === body.id));
    assert.deepEqual(products.at(-1), body);
  });

  const invalidBodies: Record<string, unknown> = {
    "missing name": { price: 1, stock: 1 },
    "blank name": { name: "   ", price: 1, stock: 1 },
    "price as a string": { name: "X", price: "1", stock: 1 },
    "negative price": { name: "X", price: -1, stock: 1 },
    "fractional stock": { name: "X", price: 1, stock: 1.5 },
    "negative stock": { name: "X", price: 1, stock: -1 }
  };
  for (const [label, body] of Object.entries(invalidBodies)) {
    test(`rejects ${label}`, async () => {
      const res = await send("POST", "/products", body);
      assert.equal(res.status, 400);
      assert.equal(res.body.message, "Invalid product data");
    });
  }

  test("rejects an infinite price (1e999)", async () => {
    const { status } = await send("POST", "/products", '{"name":"Inf","price":1e999,"stock":1}');
    assert.equal(status, 400);
  });

  test("rejects a request with no body", async () => {
    const { status } = await send("POST", "/products");
    assert.equal(status, 400);
  });

  test("does not reuse the ID of a deleted product", async () => {
    const created = await send("POST", "/products", validProduct);
    await send("DELETE", `/products/${created.body.id}`);
    const next = await send("POST", "/products", validProduct);
    assert.notEqual(next.body.id, created.body.id);
  });
});

describe("PUT /products/:id", () => {
  test("replaces a product and trims the name", async () => {
    const { status, body } = await send("PUT", "/products/1", { name: "  Laptop Pro  ", price: 900, stock: 3 });
    assert.equal(status, 200);
    assert.deepEqual(body, {
      message: "Product updated successfully",
      product: { id: 1, name: "Laptop Pro", price: 900, stock: 3 }
    });
  });

  test("ignores extra fields such as id", async () => {
    const { body } = await send("PUT", "/products/1", { ...validProduct, id: 999, isAdmin: true });
    assert.deepEqual(body.product, { id: 1, ...validProduct });
  });

  test("returns 400 (not 500) when the body is not JSON", async () => {
    const { status } = await send("PUT", "/products/1", "name=x", "text/plain");
    assert.equal(status, 400);
  });

  test("returns 400 for invalid data", async () => {
    assert.equal((await send("PUT", "/products/1", { ...validProduct, name: "" })).status, 400);
    assert.equal((await send("PUT", "/products/1", { ...validProduct, price: -1 })).status, 400);
    assert.equal((await send("PUT", "/products/1", '{"name":"X","price":1e999,"stock":1}')).status, 400);
  });

  test("returns 404 for a missing product", async () => {
    const { status } = await send("PUT", "/products/999", validProduct);
    assert.equal(status, 404);
  });
});

describe("PATCH /products/:id/stock", () => {
  test("updates stock and returns the Day 3 response shape", async () => {
    const { status, body } = await send("PATCH", "/products/2/stock", { stock: 7 });
    assert.equal(status, 200);
    assert.deepEqual(body, {
      message: "Stock updated successfully",
      product: { ...seedProducts[1], stock: 7 }
    });
  });

  for (const badStock of ["7", 7.5, -1, null]) {
    test(`rejects stock ${JSON.stringify(badStock)}`, async () => {
      const { status, body } = await send("PATCH", "/products/2/stock", { stock: badStock });
      assert.equal(status, 400);
      assert.equal(body.message, "Invalid stock value");
    });
  }

  test("returns 400 (not 500) when there is no body", async () => {
    const { status } = await send("PATCH", "/products/2/stock");
    assert.equal(status, 400);
  });

  test("returns 404 for a missing product", async () => {
    const { status } = await send("PATCH", "/products/999/stock", { stock: 1 });
    assert.equal(status, 404);
  });
});

describe("DELETE /products/:id", () => {
  test("deletes a product, then returns 404 on a second delete", async () => {
    const first = await send("DELETE", "/products/3");
    assert.equal(first.status, 200);
    assert.deepEqual(first.body, { message: "Product deleted successfully", product: seedProducts[2] });
    assert.ok(!products.some((p) => p.id === 3));

    const second = await send("DELETE", "/products/3");
    assert.equal(second.status, 404);
  });
});

describe("error handling", () => {
  test("malformed JSON returns a 400 JSON error", async () => {
    const { status, body } = await send("POST", "/products", '{"name":');
    assert.equal(status, 400);
    assert.deepEqual(body, { message: "Invalid JSON body" });
  });

  test("an oversized body keeps its 413 status", async () => {
    const { status } = await send("POST", "/products", { ...validProduct, name: "x".repeat(200_000) });
    assert.equal(status, 413);
  });

  test("unknown routes return a 404 JSON error", async () => {
    for (const [method, path] of [["GET", "/nope"], ["POST", "/products/1"]] as const) {
      const { status, body } = await send(method, path);
      assert.equal(status, 404);
      assert.deepEqual(body, { message: "Route not found" });
    }
  });
});
