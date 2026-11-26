import { escapeHtml, mailer } from "../../lib/mailer";
import { prisma } from "../../lib/prisma";

// "Tell me when it's back": these products may be in stock again (an admin restocked one, or a
// cancelled order gave pieces back). Every customer waiting for one that is now in stock gets a
// notification (the bell) and an email, and stops waiting. Called after any change that adds stock.
export async function tellWaitingCustomers(productIds: number[]) {
  const alerts = await prisma.stockAlert.findMany({
    where: { productId: { in: productIds }, product: { stock: { gt: 0 } } },
    include: { user: { select: { name: true, email: true } }, product: { select: { name: true } } },
  });
  for (const alert of alerts) {
    // Removed first: if two restocks happen at the same moment, only one of them tells this customer
    const { count } = await prisma.stockAlert.deleteMany({ where: { userId: alert.userId, productId: alert.productId } });
    if (count === 0) continue;
    await prisma.notification.create({
      data: { type: "BACK_IN_STOCK", message: `${alert.product.name} is back in stock`, userId: alert.userId, productId: alert.productId },
    });
    void emailCustomer(alert.user, alert.product.name, alert.productId); // the answer doesn't wait for Gmail
  }
}

async function emailCustomer(user: { name: string; email: string }, productName: string, productId: number) {
  const page = `${process.env.CORS_ORIGIN ?? "http://localhost:5173"}/products/${productId}`;
  const text = [`Hi ${user.name},`, "", `Good news: ${productName} is back in stock.`, "", `Get it before it sells out again: ${page}`, "", "StockFlow"].join(
    "\n",
  );
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a">
  <h2 style="color:#2563eb;margin-bottom:4px">StockFlow</h2>
  <p>Hi ${escapeHtml(user.name)},</p>
  <p>Good news: <b>${escapeHtml(productName)}</b> is back in stock.</p>
  <p><a href="${page}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">See the product</a></p>
  <p style="color:#64748b;font-size:13px">You asked us to tell you. This was the only email about it.</p>
</div>`;
  try {
    await mailer.send({ to: user.email, subject: `${productName} is back in stock`, text, html });
  } catch (err) {
    console.error("Could not email the back-in-stock news:", err); // the bell still tells them
  }
}
