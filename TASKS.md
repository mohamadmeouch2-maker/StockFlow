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
- [x] **New design (Nov 6):** shared styles (cards, buttons, inputs, tables), a welcome banner and info boxes on the products page, category buttons, a richer product page, cart summary, footer; checked on desktop and phone widths

- [x] **Problem reports (Nov 6):** customers report a problem with an order (wrong item, damaged, missing, late delivery, other) from My orders; admins reply and resolve on a new Support page, with an open-count badge in the menu. Tests: API 37, website 14
- [x] **Ratings, reviews and views (Nov 6):** buyers rate products from 1 to 10 with a comment (one review each, editable); the average rating and view count show in the list, on the product page and in the admin table; sample views and reviews for every product. Tests: API 45, website 18
- [x] **10 new products (Nov 6):** notebook, scissors, paper clips, USB flash drive, webcam, calculator, bookshelf, whiteboard, glass cleaner, microfiber cloths, each with a free photo, views and sample reviews (25 products in total)
- [x] **Admin dashboard and finishing touches (Nov 6):**
  - [x] Dashboard as the admin's home page: sales and orders of the last 7 days against the week before, restock and open-problem counts, a sales-per-day chart (Recharts), orders by status and the top 5 products, for the last 7, 14 or 30 days (FR-14, FR-15, served by the Node API)
  - [x] 30 days of sample orders from the sample customers, so the dashboard has data
  - [x] Grey loading placeholders instead of "Loading...", pop-up messages after actions, pages fade in, buttons press in
  - [x] Checked on desktop and phone widths. Tests: API 47, website 25
- [x] **Automatic stock alerts for admins (Nov 11):** when an order takes a product down to its reorder level or to 0, an alert is saved in a new `notifications` table (in the same transaction as the order). Admins see a bell with the unread count, a list with Restock links and "Mark all as read", and new alerts pop up by themselves (checked every 20 seconds). One alert per crossing, not per order. Tests: API 53, website 27
- [x] **Delivery options (Nov 11):** in the cart the customer chooses Standard delivery (free, 3–5 days) or Express (+$9.99, next day). The prices live on the server, which adds the fee to the total and saves the delivery, the fee and the arrival date with the order (new columns, older orders became Standard). My orders and Manage orders show a Standard or ⚡ Express badge with the arrival date. Tests: API 56, website 29
## To do

### Friday, Nov 13: Demo
- [x] Demo script with talking points and likely questions: [DEMO.md](DEMO.md) (Nov 6)
- [ ] Rehearse the demo once
- [ ] Present to the supervisor
- [ ] Fix anything found during the rehearsal or the supervisor's review

## Not in scope (not enough time in one week)

- .NET Reporting API with MySQL and data sync (FR-13). The reports and the dashboard (FR-14 to FR-16) are in the Node API instead
- Docker
