# StockFlow: Tasks and Progress

**Deadline:** Friday, 13 November 2026
**Based on:** *StockFlow: Requirements and Build Guide*. FR numbers refer to its functional requirements.

The full guide is a 21-day program. With one week left, the plan below covers the core of the project: the website, the Node.js API and the PostgreSQL database. The parts listed under "Not in scope" are left out.

## Done

- [x] **Day 1 (Nov 2):** Create the GitHub repository and README
- [x] **Day 2 (Nov 3):** First backend practice API with Express + TypeScript (products: list, create, delete)
- [x] **Day 3 (Nov 4–5):** Backend improvements: update product, stock validation, error handling, tests
- [x] **Day 4 (Nov 5):** Frontend setup: React + Vite + TypeScript + Tailwind
- [x] **Day 4 (Nov 5):** Shared types, mock data, page routes and layout
- [x] **Days 4–5 (Nov 5):** Product pages on mock data
  - [x] Product list with search, category filter and pagination (FR-04)
  - [x] Product detail with stock status: In stock / Low / Out (FR-05)
  - [x] Admin product table, plus a create/edit form with validation (FR-11)

- [x] **Database setup (Nov 5, one day early):**
  - [x] Install PostgreSQL 16
  - [x] Create the database user `stockflow` and the databases `stockflow` and `stockflow_test`
- [x] **Database tables (Nov 5, planned for Nov 9):**
  - [x] Create the Node.js API project (`api-node/`) with Prisma
  - [x] Database tables: users, categories, products, orders, order items, plus CHECK rules (price > 0, stock ≥ 0, quantity > 0)
  - [x] Sample data (seed): 1 admin, 1 customer, 4 categories, 15 products
- [x] **API: users and products (Nov 5, planned for Nov 10):**
  - [x] Register and log in with a JWT token valid for 1 hour (FR-01, FR-02)
  - [x] Protect admin endpoints: 401 without a token, 403 for the wrong role (FR-03)
  - [x] Products and categories endpoints with Zod validation (FR-04, FR-05, FR-11)
  - [x] Standard error format `{ error: { code, message, details } }` (NFR-06)
  - [x] Checked by hand: 36 requests, all with the expected result
- [x] **API: orders and tests (Nov 5, planned for Nov 11):**
  - [x] Place an order: check and deduct stock in one transaction, 409 if stock is short (FR-07, FR-08)
  - [x] My orders, newest first (FR-09) and cancel a pending order, which restores the stock (FR-10)
  - [x] Admin: list orders, filter by status, change status Pending → Shipped → Delivered (FR-12)
  - [x] Automatic API tests with Jest + Supertest on a separate test database (NFR-07 asks for at least 10). Run with `npm test` in `api-node/`

- [x] **Website connected to the API (Nov 5, planned for Nov 12):**
  - [x] Replace the mock data with the real API
  - [x] Login, register and logout. You stay logged in after a refresh (FR-01, FR-02)
  - [x] Admin-only and customer-only pages (FR-03)
  - [x] Add to cart (never more than the stock), cart page and checkout (FR-06, FR-07)
  - [x] My orders with Cancel (FR-09, FR-10) and the admin orders page: ship, deliver, filter (FR-12)
  - [x] Checked in the browser: register, refresh, order, cancel, admin page protection, ship/deliver, form errors
- [x] **Finishing and extras (Nov 5, planned for Nov 13):**
  - [x] README: features, how to install and run, demo accounts, API overview
  - [x] Tested the README steps on a fresh copy from GitHub and fixed 3 install problems found that way
  - [x] Low-stock list for the admin (FR-16), served by the Node API
  - [x] 9 website component tests with Vitest + Testing Library (NFR-07 asks for 5); API tests now 26
  - [x] GitHub Actions CI workflow added (API and website checks and tests). It starts running once the repository owner enables Actions in Settings → Actions
- [x] **Product photos (Nov 6), FR-17:**
  - [x] Admins upload a photo in the product form (JPG, PNG, WebP or GIF, up to 2 MB), with a preview and Remove photo
  - [x] The photo shows next to the product in the list, product page, cart, admin table and low-stock list; a placeholder when there is none
  - [x] Tests: API 31, website 11
  - [x] Free photos from Wikimedia Commons for all 15 sample products, added by `npm run seed`, with an author/license credits file
- [x] **Welcome screen (Nov 6):** the StockFlow logo shows for 2 seconds whenever the website opens; the logo is also in the top bar and the browser tab (12 website tests)

## To do

### Friday, Nov 13: Demo
- [x] Demo script with talking points and likely questions: [DEMO.md](DEMO.md) (Nov 6)
- [ ] Rehearse the demo once
- [ ] Present to the supervisor
- [ ] Fix anything found during the rehearsal or the supervisor's review

## Not in scope (not enough time in one week)

- .NET Reporting API with MySQL and data sync (FR-13 to FR-15)
- Reports dashboard with charts (daily sales, top products)
- Docker
