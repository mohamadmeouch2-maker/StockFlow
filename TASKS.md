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

## To do

### Monday, Nov 9: Database
- [ ] Create the Node.js API project with Prisma
- [ ] Database tables: users, categories, products, orders, order items
- [ ] Sample data (seed)

### Tuesday, Nov 10: API: users and products
- [ ] Register and log in with a JWT token (FR-01, FR-02)
- [ ] Protect admin endpoints: 401 without a token, 403 for the wrong role (FR-03)
- [ ] Products and categories endpoints with Zod validation (FR-04, FR-05, FR-11)

### Wednesday, Nov 11: API: orders
- [ ] Place an order: check and deduct stock in one transaction, 409 if stock is short (FR-07, FR-08)
- [ ] My orders, newest first (FR-09) and cancel a pending order (FR-10)
- [ ] Admin: list orders, filter by status, change status (FR-12)
- [ ] API tests with Jest + Supertest

### Thursday, Nov 12: Connect the website to the API
- [ ] Login and register pages, admin-only pages
- [ ] Replace the mock data with the real API
- [ ] Cart and checkout (FR-06, FR-07), My orders page
- [ ] Admin orders page

### Friday, Nov 13: Finish
- [ ] Fix remaining bugs
- [ ] README: how to install and run the project
- [ ] Prepare the demo

## Not in scope (not enough time in one week)

- .NET Reporting API with MySQL and data sync (FR-13 to FR-16)
- Reports dashboard with charts
- Docker and GitHub Actions CI
