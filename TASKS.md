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
- [x] **Delivery options (Nov 11):** in the cart the customer chooses Standard delivery (free, 3–5 days) or Express (+$4.50, next day). The prices live on the server, which adds the fee to the total and saves the delivery, the fee and the arrival date with the order (new columns, older orders became Standard). My orders and Manage orders show a Standard or ⚡ Express badge with the arrival date. Tests: API 56, website 32
- [x] **Categories page for admins (Nov 11), completes FR-11 on the website:** add, rename and delete categories, with the number of products in each. A category that still has products can't be deleted (the button is disabled and the API refuses with a clear message). Names are unique ignoring capital letters. Linked from Manage products and the Dashboard. Tests: API 61, website 35
- [x] **More for customers (Nov 11):**
  - [x] Sort products by price (both ways), best rating or newest, and an "In stock only" filter
  - [x] Favourites: a heart on every product, a "My favourites" page and a count in the menu (new `favorites` table)
  - [x] "Buy again" in My orders: the same products go back in the cart at today's price; sold-out ones are skipped
  - [x] Order tracking: a timeline Placed → Shipped → Delivered (or Cancelled) with the date of each step (new `shipped_at`, `delivered_at`, `cancelled_at` columns)
  - [x] Tests: API 72, website 42
- [x] **Christmas sale (Nov 11):** admins start a sale from the Dashboard: a percentage off (30%) until a date (Dec 31) for the products in stock that sold fewer than N pieces (5) in the last days (30). New `promotions` table; each product can belong to a sale; after the end date prices go back by themselves. Customers see a festive pop-up with falling snow (once per visit), a sale banner and a "Christmas deals" filter, and red sale prices with the old price crossed out on the list, product page, favourites and cart. Orders pay the sale price, calculated on the server. Tests: API 78, website 45
- [x] **Consistent colours (Nov 11):** every colour has one meaning, named in one place (`frontend/src/index.css`): brand = blue (buttons, links, Shipped, Express, counts), success = green (In stock, Delivered, Resolved), warning = amber (Low stock, Pending, Open problem), danger = red (errors, Delete, Late, things that need action), sale = red (sale prices only), grey = neutral (Sold out, Cancelled, Standard). One badge shape for every status label, one calm rating style, and the admin pages load on demand so the website stays small
- [x] **Low stock = fewer than 7 left (Nov 11):** every product's reorder level is now 6 (and new products start at 6), so the Low stock badge, the Low stock page, the stock alerts and the Dashboard all use the same rule
- [x] **Delivery address and phone number (Nov 11):** the cart asks where to deliver: phone number, city and address (street, building, floor). The same rules on the website and the server (a phone number has 7 to 15 digits). They are saved with the order (new `phone`, `city`, `address` columns; a database rule keeps all three or none, and older orders have none). The next order fills them in from the last one. My orders shows "Deliver to ...", and Manage orders shows the customer's phone number (tap to call) and address. The sample customers' orders got sample addresses. Tests: API 80, website 48
- [x] **Weak points fixed (Nov 12):**
  - [x] Login attempts are limited: after 5 wrong passwords for the same email from the same computer, that login is blocked for 15 minutes (429 with a clear message, even with the right password). A successful login starts the count again. Tests: API 83
  - [x] Manage orders shows 20 orders per page (newest first) with Previous / Next, instead of loading every order at once. The status filter starts again on page 1. The API returns `{ items, page, pageSize, total }`, like the product list. Tests: API 84, website 49
  - [x] My account page (click your name, top right): change the name (the email stays, it is the login), save a delivery address that the cart fills in (customers; new `phone`, `city`, `address` columns on users, all three or none), and change the password (the current one first, the same rules as registering, wrong tries limited like logins). The form rules are shared in `frontend/src/utils/validation.ts` and `api-node/src/lib/shipTo.ts`. Tests: API 89, website 54
  - [x] Prettier (NFR-08): one shared code style in `.prettierrc.json` (lines up to 160 characters), `npm run format` and `npm run format:check` in both `api-node` and `frontend`, a format check in the CI workflow, and VS Code suggests the Prettier extension. All the code was formatted once
- [x] **Email check on Register (Nov 13):** after Register, the API emails a 6-digit code through Gmail (nodemailer, settings in `.env`; without them the code is printed in the API window). The account can log in only after the code is typed on the new "Check your email" page (`/verify-email`), which then logs the user in. A code is stored hashed, works for 15 minutes and 5 tries, and "Send a new code" works once a minute. An email that was never verified can register again (a typo, or someone else used it). New `email_verified_at` column on users (the accounts that already existed count as verified) and an `email_codes` table. Tests: API 96, website 60
## To do

### Friday, Nov 13: Demo
- [x] Demo script with talking points and likely questions: [DEMO.md](DEMO.md) (Nov 6)
- [ ] Rehearse the demo once
- [ ] Present to the supervisor
- [ ] Fix anything found during the rehearsal or the supervisor's review

## Not in scope (not enough time in one week)

- .NET Reporting API with MySQL and data sync (FR-13). The reports and the dashboard (FR-14 to FR-16) are in the Node API instead
- Docker
