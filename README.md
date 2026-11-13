# StockFlow

StockFlow is an inventory and order management web application. Customers browse products, place orders and track them. Admins manage products, categories and orders.

It is built from the *StockFlow: Requirements and Build Guide*. For the plan and what is done, see [TASKS.md](TASKS.md).

## Features

| Area | What works | Requirement |
|---|---|---|
| Accounts | Register, log in, log out, stay logged in after a refresh (JWT valid for 1 hour) | FR-01, FR-02 |
| Email check | After Register, a 6-digit code is emailed (Gmail). The account can log in only after the code is typed on the "Check your email" page. A code works for 15 minutes and 5 tries; "Send a new code" once a minute | extra |
| Forgot password | "Forgot password?" on the login page emails a 6-digit code. Type it with a new password on the "Reset your password" page: the password changes and you are logged in. The answer is the same for every email, so nobody can find out who has an account | extra |
| Security | Admin pages and endpoints are admin-only: 401 without login, 403 for the wrong role. After 5 wrong passwords, that login waits 15 minutes (protection against password guessing) | FR-03 |
| Products | List with search, category filter and 12 per page; sort by price, rating or newest, and "In stock only"; detail page with stock status | FR-04, FR-05 |
| Cart and orders | Cart capped by stock; ordering checks and deducts stock in one transaction | FR-06, FR-07, FR-08 |
| Delivery address | The cart asks for a phone number, a city and an address (street, building, floor), checked on the website and on the server; the next order fills them in from My account or else from the last order. Customers see them in My orders, admins in Manage orders (tap the number to call) | extra |
| My account | Click your name (top right): change your name, save a delivery address for the cart (customers), and change your password (the current one first; 5 wrong tries = wait 15 minutes) | extra |
| Delivery options | In the cart the customer chooses Standard delivery (free, 3–5 days) or Express (+$4.50, next day); the server adds the fee and saves the arrival date, shown in My orders and Manage orders | extra |
| My orders | Own orders, newest first, each with a tracking timeline (placed → shipped → delivered, with dates); cancel a Pending order, which gives the stock back; "Buy again" puts an order's products back in the cart | FR-09, FR-10 |
| Favourites | Customers save products with a heart and find them on a "My favourites" page, ready to add to the cart | extra |
| Christmas sale | Admins start a sale (for example 30% off until Dec 31) on the products in stock that sold fewer than N pieces in the last days; customers see a festive pop-up with falling snow, a sale banner, red sale prices with the old price crossed out, and a "Christmas deals" filter; orders pay the sale price (calculated on the server) | extra |
| Admin | Create, edit and delete products; a Categories page to add, rename and delete categories (not while they still have products); ship and deliver orders (20 per page, newest first, with a status filter) | FR-11, FR-12 |
| Low stock | Admin list of products at or below their reorder level (6 for every product, so "Low stock" = fewer than 7 left; the admin can change one product) | FR-16 |
| Dashboard | The admin's home page: sales and orders of the last 7 days against the week before, restock and open-problem counts, and for the last 7, 14 or 30 days a sales-per-day chart, orders by status and the top 5 products | FR-14, FR-15 |
| Product photos | Admins upload a photo (JPG, PNG, WebP or GIF, up to 2 MB); it shows next to the product everywhere | FR-17 |
| Ratings, reviews and views | Customers who bought a product rate it from 1 to 10 with an optional comment; every product shows its average rating and how many times it was viewed | extra |
| Problem reports | Customers report a problem with an order (wrong item, damaged, missing, late); admins reply and resolve it on the Support page | extra |
| Stock alerts | When an order takes a product down to its reorder level or sells it out, admins get an automatic alert: a bell with the unread count, a pop-up message, and a Restock link | extra |
| Look and feel | Grey placeholders while pages load, short pop-up messages after each action (added to cart, order placed, product saved, ...), pages fade in | extra |

Uploaded photos are saved in `api-node/uploads/`. Like the database data, they are not stored in git. The 25 sample products get free photos from Wikimedia Commons, some views, sample reviews and 30 days of sample orders (from three sample customers) when you run `npm run seed` (see the [photo credits](api-node/prisma/seed-images/CREDITS.md)).

Not built (out of scope for the one-week plan): the separate .NET reporting API with MySQL and the data sync to it (FR-13), and Docker. The reports and the dashboard (FR-14 to FR-16) are served by the Node API instead.

## Technologies

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod, Recharts (dashboard chart)
- **Backend (Core API):** Node.js, Express 5, TypeScript, Prisma 6, Zod, JWT, bcrypt
- **Database:** PostgreSQL 16
- **Tests:** Jest + Supertest (105 API tests), Vitest + Testing Library (69 website tests), GitHub Actions CI
- **Code style:** Prettier (one shared style, checked in CI) and ESLint

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

Emails: without Gmail settings in `.env`, the Register and Forgot password codes are printed in this terminal (`📧 Email to ...`). To send real emails, see [Emails](#emails).

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

### Emails

After Register and for "Forgot password?", the API emails a 6-digit code. To send it through Gmail:

1. Your Google account needs **2-Step Verification** (Google Account → Security).
2. Open https://myaccount.google.com/apppasswords, type a name like `StockFlow` and click **Create**. Google shows a 16-letter **app password**.
3. Add two lines to `api-node/.env` (never to `.env.example`, and never commit them):

   ```
   SMTP_USER="your.address@gmail.com"
   SMTP_PASS="abcd efgh ijkl mnop"
   ```

4. Restart the API (**Ctrl+C**, then `npm run dev`).

✅ Register with your own email: the code arrives in a few seconds (look in Spam or Junk too).

Without these two lines nothing is sent: the code is printed in the API terminal instead.

## Run the tests

```bash
cd api-node
npm test        # ✅ Tests: 105 passed (uses the stockflow_test database, never your app data)

cd ../frontend
npm test        # ✅ Tests: 69 passed (no backend needed)
```

A GitHub Actions workflow ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs the same checks and tests on every push to `master`, once Actions is enabled in the repository settings (**Settings → Actions → General → Allow all actions**). It can also be started by hand from the **Actions** tab.

## Code style

Prettier formats the code the same way for everyone. The settings are in [.prettierrc.json](.prettierrc.json) (lines up to 160 characters). Run it in `api-node` or `frontend`:

```bash
npm run format        # formats the code
npm run format:check  # ✅ All matched files use Prettier code style!
```

The CI workflow runs `format:check` too. VS Code suggests the Prettier extension when you open the project.

## API overview

All endpoints use JSON. "Admin" and "Customer" need the header `Authorization: Bearer <token>` from the login response.

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | anyone | Create a customer account and email a 6-digit code (an email that was never verified can register again) |
| POST | `/api/auth/verify-email` | anyone | `{ "email", "code" }`: the right code verifies the email and returns a token, like login; 5 wrong tries or 15 minutes = ask for a new code |
| POST | `/api/auth/resend-code` | anyone | `{ "email" }`: a new code (once a minute, else 429) |
| POST | `/api/auth/forgot-password` | anyone | `{ "email" }`: emails a 6-digit code to choose a new password. Always 204, also for an email nobody uses (and no new email within a minute) |
| POST | `/api/auth/reset-password` | anyone | `{ "email", "code", "password" }`: the right code changes the password and returns a token, like login (same code rules as `verify-email`) |
| POST | `/api/auth/login` | anyone | Get a token (403 `EMAIL_NOT_VERIFIED` before the email is verified; 429 for 15 minutes after 5 wrong passwords) |
| GET | `/api/auth/me` | logged in | Current user |
| GET | `/api/products?page=&pageSize=&search=&categoryId=&sort=&inStock=` | anyone | Paged product list; `sort` = `name` (default), `price_asc`, `price_desc`, `rating` or `newest`; `inStock=true` hides sold-out products; `onSale=true` shows only the products in the current sale |
| GET | `/api/products/:id` | anyone | One product |
| POST / PUT / DELETE | `/api/products[/:id]` | Admin | Manage products |
| GET | `/api/categories` | anyone | List categories A-Z, with how many products each has |
| POST / PUT / DELETE | `/api/categories[/:id]` | Admin | Add, rename or delete a category `{ "name": "Kitchen" }` (names are unique, ignoring capital letters) |
| POST | `/api/orders` | Customer | Place an order: `{ "items": [{ "productId": 1, "quantity": 2 }], "delivery": "EXPRESS", "phone": "+961 70 123 456", "city": "Beirut", "address": "Hamra Street, Building 12, 3rd floor" }` (delivery is optional, default `STANDARD`; phone, city and address are required) |
| GET | `/api/orders/delivery-options` | logged in | The delivery choices with their price and days |
| GET | `/api/orders/saved-address` | Customer | The address the cart fills in: the one saved in My account, or else my last order's, with `from: "account"` or `"last-order"`; `null` if none |
| GET / PATCH | `/api/account` | logged in | My account (name, email, role, saved address); PATCH `{ "name": "Sara Khoury" }` changes the name |
| PUT / DELETE | `/api/account/address` | Customer | Save `{ "phone", "city", "address" }` as my delivery address, or remove it |
| POST | `/api/account/password` | logged in | `{ "currentPassword": "...", "newPassword": "..." }` (same rules as registering) |
| GET | `/api/orders/mine` | logged in | My orders, newest first |
| POST | `/api/orders/:id/cancel` | owner or Admin | Cancel a Pending order |
| GET | `/api/orders?status=&page=&pageSize=` | Admin | All orders, newest first, one page at a time: `{ items, page, pageSize, total }` (20 per page by default, at most 100) |
| PATCH | `/api/orders/:id/status` | Admin | `{ "status": "SHIPPED" }`, then `DELIVERED`, or `CANCELLED` |
| POST | `/api/products/:id/view` | anyone | Count one view of the product page |
| GET | `/api/favorites` | Customer | My favourite products, the last saved first |
| PUT / DELETE | `/api/favorites/:productId` | Customer | Save a product as a favourite, or remove it |
| GET | `/api/promotions/current` | anyone | The sale that is on now (name, percent, end date, number of products), or `null` |
| POST | `/api/promotions` | Admin | Start a sale: `{ "name": "Christmas Sale", "percent": 30, "endsAt": "2026-12-31", "maxSold": 5, "days": 30 }` |
| DELETE | `/api/promotions/:id` | Admin | End the sale now (normal prices come back) |
| GET | `/api/products/:id/reviews` | anyone | Average rating, count and all reviews |
| GET | `/api/products/:id/reviews/me` | Customer | May I rate it (did I buy it?) and my review |
| PUT / DELETE | `/api/products/:id/reviews` | Customer (buyer) | Add or change my review `{ "rating": 9, "comment": "..." }`, or delete it |
| GET | `/api/reports/low-stock` | Admin | Products at or below their reorder level |
| GET | `/api/reports/summary?days=30` | Admin | Dashboard numbers: sales and orders per day, orders by status, top 5 products (7 to 90 days, default 30) |
| POST | `/api/orders/:id/issues` | Customer (owner) | Report a problem: `{ "type": "DAMAGED", "message": "..." }` |
| GET | `/api/issues/mine` | logged in | My problem reports and the replies |
| GET | `/api/issues?status=` | Admin | All problem reports, open ones first |
| PATCH | `/api/issues/:id` | Admin | `{ "reply": "...", "status": "RESOLVED" }` |
| GET | `/api/notifications` | Admin | The 20 newest stock alerts and the unread count |
| POST | `/api/notifications/:id/read`, `/api/notifications/read-all` | Admin | Mark one alert, or all, as read |
| POST / DELETE | `/api/products/:id/image` | Admin | Upload a photo (form field `image`) or remove it |
| GET | `/uploads/products/<file>` | anyone | The uploaded photos |
| GET | `/health` | anyone | Liveness check |

Every error has the same shape: `{ "error": { "code", "message", "details": [{ "field", "message" }] } }`.
Status codes: 400 invalid input, 401 not logged in, 403 not allowed, 404 not found, 409 conflict (email taken, not enough stock, invalid status change).
