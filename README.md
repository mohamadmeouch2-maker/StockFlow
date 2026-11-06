# StockFlow

StockFlow is an inventory and order management web application. Customers browse products, place orders and track them. Admins manage products, categories and orders.

It is built from the *StockFlow: Requirements and Build Guide*. For the plan and what is done, see [TASKS.md](TASKS.md).

## Features

| Area | What works | Requirement |
|---|---|---|
| Accounts | Register, log in, log out, stay logged in after a refresh (JWT valid for 1 hour) | FR-01, FR-02 |
| Security | Admin pages and endpoints are admin-only: 401 without login, 403 for the wrong role | FR-03 |
| Products | List with search, category filter and 12 per page; detail page with stock status | FR-04, FR-05 |
| Cart and orders | Cart capped by stock; ordering checks and deducts stock in one transaction | FR-06, FR-07, FR-08 |
| My orders | Own orders, newest first; cancel a Pending order, which gives the stock back | FR-09, FR-10 |
| Admin | Create, edit and delete products and categories; ship and deliver orders | FR-11, FR-12 |
| Low stock | Admin list of products at or below their reorder level | FR-16 |
| Product photos | Admins upload a photo (JPG, PNG, WebP or GIF, up to 2 MB); it shows next to the product everywhere | FR-17 |

Uploaded photos are saved in `api-node/uploads/`. Like the database data, they are not stored in git.

Not built (out of scope for the one-week plan): the .NET reporting API with MySQL, data sync and the sales charts (FR-13 to FR-15), and Docker.

## Technologies

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod
- **Backend (Core API):** Node.js, Express 5, TypeScript, Prisma 6, Zod, JWT, bcrypt
- **Database:** PostgreSQL 16
- **Tests:** Jest + Supertest (31 API tests), Vitest + Testing Library (11 website tests), GitHub Actions CI

## Project structure

```
StockFlow/
├── frontend/            React website (http://localhost:5173)
├── api-node/            Core API (http://localhost:4000)
│   ├── prisma/          Database schema, migrations and sample data (seed)
│   ├── src/             Routes, middleware and business rules
│   └── tests/           Automatic API tests
├── backend/             Early practice API from Days 2–3 (replaced by api-node)
├── javascript-practice/ Early JavaScript practice
└── TASKS.md             Plan and progress
```

## How to run it

### 1. Install the tools

- [Node.js](https://nodejs.org) 22 or newer
- [PostgreSQL 16](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads), installed with the default port **5432**
- [Git](https://git-scm.com)

### 2. Create the database user and databases

Open **SQL Shell (psql)** or **pgAdmin** as the `postgres` user and run:

```sql
CREATE ROLE stockflow LOGIN PASSWORD 'stockflow' CREATEDB;
CREATE DATABASE stockflow OWNER stockflow;
CREATE DATABASE stockflow_test OWNER stockflow;
```

`stockflow` holds the app's data, and `stockflow_test` is used only by the automatic tests.

### 3. Get the code

```bash
git clone https://github.com/mohamadmeouch2-maker/StockFlow.git
cd StockFlow
```

### 4. Start the API (terminal 1)

```bash
cd api-node
cp .env.example .env        # Windows PowerShell: copy .env.example .env
npm install
npx prisma migrate deploy   # creates the tables
npm run seed                # adds the sample users, categories and products
npm run dev
```

✅ You should see `Core API on http://localhost:4000`. Check it at http://localhost:4000/health.

### 5. Start the website (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

✅ Open http://localhost:5173.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@stockflow.test` | `Password1` |
| Customer | `customer@stockflow.test` | `Password1` |

These are for local use only. You can also register a new customer on the website.

## Run the tests

```bash
cd api-node
npm test        # ✅ Tests: 31 passed (uses the stockflow_test database, never your app data)

cd ../frontend
npm test        # ✅ Tests: 11 passed (no backend needed)
```

A GitHub Actions workflow ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs the same checks and tests on every push to `master`, once Actions is enabled in the repository settings (**Settings → Actions → General → Allow all actions**). It can also be started by hand from the **Actions** tab.

## API overview

All endpoints use JSON. "Admin" and "Customer" need the header `Authorization: Bearer <token>` from the login response.

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | anyone | Create a customer account |
| POST | `/api/auth/login` | anyone | Get a token |
| GET | `/api/auth/me` | logged in | Current user |
| GET | `/api/products?page=&pageSize=&search=&categoryId=` | anyone | Paged product list |
| GET | `/api/products/:id` | anyone | One product |
| POST / PUT / DELETE | `/api/products[/:id]` | Admin | Manage products |
| GET | `/api/categories` | anyone | List categories |
| POST / PUT / DELETE | `/api/categories[/:id]` | Admin | Manage categories |
| POST | `/api/orders` | Customer | Place an order: `{ "items": [{ "productId": 1, "quantity": 2 }] }` |
| GET | `/api/orders/mine` | logged in | My orders, newest first |
| POST | `/api/orders/:id/cancel` | owner or Admin | Cancel a Pending order |
| GET | `/api/orders?status=` | Admin | All orders |
| PATCH | `/api/orders/:id/status` | Admin | `{ "status": "SHIPPED" }`, then `DELIVERED`, or `CANCELLED` |
| GET | `/api/reports/low-stock` | Admin | Products at or below their reorder level |
| POST / DELETE | `/api/products/:id/image` | Admin | Upload a photo (form field `image`) or remove it |
| GET | `/uploads/products/<file>` | anyone | The uploaded photos |
| GET | `/health` | anyone | Liveness check |

Every error has the same shape: `{ "error": { "code", "message", "details": [{ "field", "message" }] } }`.
Status codes: 400 invalid input, 401 not logged in, 403 not allowed, 404 not found, 409 conflict (email taken, not enough stock, invalid status change).
