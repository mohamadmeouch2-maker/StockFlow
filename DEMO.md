# StockFlow demo script

About 11 minutes. Each step says what to **do**, what to **say**, and which requirement it shows.

## Before the demo (5 minutes)

1. Start both servers in two terminals:
   - `cd api-node` → `npm run dev` (✅ `Core API on http://localhost:4000`)
   - `cd frontend` → `npm run dev` (✅ `Local: http://localhost:5173/`)
2. *(Optional: start from clean sample data.)* This **deletes all orders and registered users** and restores the 25 sample products. Stop the API with **Ctrl+C** first, then run in `api-node`:
   ```
   npx prisma migrate reset --force
   npm run seed
   npm run dev
   ```
3. Open **http://localhost:5173** and make sure you are **logged out**.
4. Have a third terminal ready in the `api-node` folder for the tests.

Accounts: admin `admin@stockflow.test` / `Password1`. You create the customer during the demo.

## The demo

### 1. Introduction (30 seconds)
**Say:** "StockFlow is an inventory and order system. Customers browse products and order them. Admins manage products, orders and stock. The website is React with TypeScript, the API is Node.js with Express, and the data is in PostgreSQL through Prisma."

### 2. GitHub (30 seconds)
**Do:** open the GitHub page and show the **README** and **TASKS.md**.
**Say:** "The README explains how to install and run the project. TASKS.md shows the plan and what is done."

### 3. Browse products as a guest (1 minute): FR-04, FR-05
**Do:** on **Products**, type `desk` in the search, then clear it. Choose **Furniture**, then **All categories**. Click **Next**. Open one product.
**Say:** "Search ignores capital letters, and there are 12 products per page. The product page shows the stock status: In stock, Low stock or Out of stock."

### 4. Register and stay logged in (1 minute): FR-01, FR-02
**Do:** click **Register** and create a customer (for example `demo@test.com` / `Password1`). Then press **F5**.
**Say:** "The password needs 8 characters with a letter and a number, and it is stored hashed with bcrypt, never as plain text. After a refresh I'm still logged in: the browser keeps a token that is valid for 1 hour."

### 5. Order, and the stock goes down (1 minute): FR-06, FR-07, FR-08
**Do:** open a product with stock (for example **Ballpoint Pens**), note the stock, and click **Add to cart** twice. Open **Cart**, choose **⚡ Express delivery** (the total goes up by $4.50), then **Place order**. Open the product again.
**Say:** "A short message in the corner confirms each action. The cart never allows more than the stock. The customer chooses Standard delivery, which is free and takes 3 to 5 days, or Express for $4.50, next day. The delivery price comes from the server, not the browser, and the order saves the arrival date. The server calculates the total from the current prices; it never trusts the browser. The stock went down by 2."

### 6. Cancel, and the stock comes back (30 seconds): FR-09, FR-10
**Do:** on **My orders**, click **Cancel order** → **OK**. Open the product again.
**Say:** "Customers can cancel only Pending orders, and the stock is restored. Even a double click restores it only once."

### 7. Not enough stock (1.5 minutes): FR-07
**Do:**
1. As the customer, add **3 × USB Keyboard** to the cart (or another product with a small stock) and **don't order yet**.
2. Open a **new tab**, type `localhost:5173`, and log in as **admin** (each tab has its own login). The admin lands on the **Dashboard**; we come back to it in step 13.
3. Admin: **Manage products** → **Edit** USB Keyboard → set **Stock** to `1` → **Save**.
4. Go back to the customer tab → **Cart** → **Place order**.

**Say:** "The admin changed the stock while the item was in my cart. The order is refused with a clear message and nothing changes. The stock check and the deduction happen in one database transaction, so even two customers buying the last item at the same moment can't both get it. An automatic test proves that."

### 8. Customers can't open admin pages (30 seconds): FR-03
**Do:** in the customer tab, type `localhost:5173/admin/orders` in the address bar.
**Say:** "I'm sent back to the home page. The API also refuses: 401 without a login, 403 for the wrong role."

### 9. Admin: products with validation (1 minute): FR-11
**Do:** in the admin tab, **Manage products** → **New product** → type price `-5` → **Save**. Then fill it in correctly and save.
**Say:** "Every field is checked in the browser and again on the server with Zod. The server's messages appear next to the right field."
**Then:** click **Categories** → add `Kitchen` → try to add `kitchen` again → rename it → delete it. Point at a faded **Delete** button.
**Say:** "Admins manage the categories here. A name can't be used twice, even with other capital letters. A category that still has products can't be deleted, so no product is ever left without a category."

### 10. Admin: orders (1 minute): FR-12
**Do:** first place one order as the customer and keep it Pending. Then as admin: **Manage orders** → **Mark shipped** → **Mark delivered**. Use the status filter.
**Say:** "Only valid changes are offered: Pending → Shipped → Delivered, or Pending → Cancelled. The server blocks anything else."

### 11. Rate a product (1 minute): extra feature
**Do:** in the customer tab, open a product you ordered (for example the one shipped in step 10) → under **Ratings & reviews** click a score from **1 to 10**, write a short comment → **Submit review**. Show the new average on the page and in the product list, and the **👁 views** count.
**Say:** "Only customers who bought a product can rate it, once each, and they can change their review later. Every product shows its average out of 10 and how many times it was viewed."

### 12. Report a problem with an order (1 minute): extra feature
**Do:** in the customer tab, open **My orders** → under an order click **Report a problem** → choose **Damaged item**, type a message → **Send report**. In the admin tab, open **Support** (the menu shows how many are open) → type a reply → **Send reply & resolve**. Back in the customer tab, refresh **My orders**.
**Say:** "If something is wrong with an order, the customer can tell us right from the order. The admin answers on the Support page, and the customer sees the reply under the order. Only the owner of an order can report on it, and only one open report per order at a time."

### 13. Dashboard (1 minute): FR-14, FR-15
**Do:** admin → **Dashboard**. Point at the tallest column in the chart. Click **Last 7 days**, then **Last 30 days**. Open **Show as a table**.
**Say:** "This is the admin's home page. The top boxes compare this week with the week before and show what needs attention: products to restock and open problems. Below, for the chosen period: sales per day, orders by status and the 5 best sellers. Cancelled orders are not counted as sales. It all comes from one API call, which asks the database 7 questions at the same time. The chart is drawn with Recharts, and the same numbers are available as a table."

### 14. Low stock (30 seconds): FR-16
**Do:** admin → **Low stock** (or click the **Need restocking** box on the Dashboard).
**Say:** "These products are at or below their reorder level, the most urgent first. **Restock** opens the edit form."
**Then:** click the 🔔 **bell** in the admin menu.
**Say:** "Admins don't have to check this list: when an order takes a product down to its reorder level or sells it out, the server creates an alert automatically, in the same transaction as the order. The bell shows how many are unread, and a new alert also pops up by itself."

### 15. Automatic tests (1 minute): NFR-07
**Do:** in the third terminal, run `npm test` in `api-node`, then `npm test` in `frontend`.
**Say:** "61 API tests run against a separate test database, so real data is never touched. 35 website tests check the forms, the product list, page protection, the cart limit, photos, the welcome screen, problem reports, reviews, the dashboard, the pop-up messages, the stock alerts, the delivery choice and the categories page. The guide asks for at least 10 and 5."

### 16. Wrap-up (30 seconds)
**Say:** "Not built yet, because of the one-week deadline: the separate .NET reporting API with MySQL, and Docker. The reports and the dashboard are served by the Node API for now. A GitHub Actions workflow is ready; it needs Actions to be enabled in the repository settings."
**Ask the supervisor:** help with two GitHub settings that need the owner's login: making `master` the default branch, and enabling Actions.

## Questions you may be asked

| Question | Short answer |
|---|---|
| How do you stop two people buying the last item? | The stock is reduced with one conditional update (`stock >= quantity`) inside a transaction. The database runs the two updates one after the other, so the second one finds no stock and the order fails with 409. |
| How are passwords stored? | Hashed with bcrypt. The database never contains the real password. |
| What's the difference between 401 and 403? | 401: not logged in (no token or a bad one). 403: logged in, but not allowed, such as a customer calling an admin endpoint. |
| Why is the total calculated on the server? | Anything sent from the browser can be changed by the user, so the server uses the prices in the database. |
| Why a separate test database? | The tests delete and create data. A separate database keeps the real data safe. |
| Why TypeScript? | Types catch many mistakes before the code runs, and the editor can suggest and check field names. |
| How does the dashboard get its numbers? | One admin endpoint, `GET /api/reports/summary?days=30`. It runs 7 database queries at the same time with `Promise.all`: counts, a group-by on order status, the orders of the period (added up per day with Decimal, so no cents are lost) and a group-by on order items for the top 5. Cancelled orders are left out. |
| What would you build next? | The separate .NET reporting API with MySQL and the data sync (FR-13), so heavy reports don't slow down the shop, and Docker, so the whole project starts with one command. |
