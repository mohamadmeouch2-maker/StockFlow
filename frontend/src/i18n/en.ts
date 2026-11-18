import type { Dictionary } from "./core";

// English needs no translations: the text in the code is already English.
// Only texts with a number need their "one" form here ("1 item", not "1 items").
export const english: Dictionary = {
  "{count} items in the cart": { one: "{count} item in the cart", other: "{count} items in the cart" },
  "{count} new replies from customer service": { one: "{count} new reply from customer service", other: "{count} new replies from customer service" },
  "{count} messages waiting for an answer": { one: "{count} message waiting for an answer", other: "{count} messages waiting for an answer" },
  "You have {count} unread notifications": { one: "You have {count} unread notification", other: "You have {count} unread notifications" },
  "The code is not correct. {count} tries left.": { one: "The code is not correct. {count} try left.", other: "The code is not correct. {count} tries left." },
  "Please wait {count} seconds before asking for a new code.": {
    one: "Please wait {count} second before asking for a new code.",
    other: "Please wait {count} seconds before asking for a new code.",
  },
  "Too many wrong passwords. Please try again in {count} minutes.": {
    one: "Too many wrong passwords. Please try again in {count} minute.",
    other: "Too many wrong passwords. Please try again in {count} minutes.",
  },
  "You sent many messages in a short time. Please try again in {count} minutes, or log in.": {
    one: "You sent many messages in a short time. Please try again in {count} minute, or log in.",
    other: "You sent many messages in a short time. Please try again in {count} minutes, or log in.",
  },
  "This category still has {count} products. Move or delete them first.": {
    one: "This category still has {count} product. Move or delete it first.",
    other: "This category still has {count} products. Move or delete them first.",
  },
  "You asked many questions in a short time. Please try again in {count} minutes.": {
    one: "You asked many questions in a short time. Please try again in {count} minute.",
    other: "You asked many questions in a short time. Please try again in {count} minutes.",
  },
  "({count} ratings)": { one: "({count} rating)", other: "({count} ratings)" },
  "Rated {average} out of 10 by {count} customers": {
    one: "Rated {average} out of 10 by {count} customer",
    other: "Rated {average} out of 10 by {count} customers",
  },
  "{count} products": { one: "{count} product", other: "{count} products" },
  "{count} orders": { one: "{count} order", other: "{count} orders" },
  "{count} days": { one: "{count} day", other: "{count} days" },
  "Showing {from}–{to} of {count} products": { one: "Showing {from}–{to} of {count} product", other: "Showing {from}–{to} of {count} products" },
  "Showing {from}–{to} of {count} orders": { one: "Showing {from}–{to} of {count} order", other: "Showing {from}–{to} of {count} orders" },
  "of {count} products": { one: "of {count} product", other: "of {count} products" },
  "on {count} selected products": { one: "on {count} selected product", other: "on {count} selected products" },
  "{name}: {percent}% off {count} products": { one: "{name}: {percent}% off {count} product", other: "{name}: {percent}% off {count} products" },
  "{name} started: {count} products are {percent}% off": {
    one: "{name} started: {count} product is {percent}% off",
    other: "{name} started: {count} products are {percent}% off",
  },
  "is on: -{percent}% on {count} products until {date}. Customers see a festive message when they open the shop.": {
    one: "is on: -{percent}% on {count} product until {date}. Customers see a festive message when they open the shop.",
    other: "is on: -{percent}% on {count} products until {date}. Customers see a festive message when they open the shop.",
  },
  "{count} orders in the last {days} days": { one: "{count} order in the last {days} days", other: "{count} orders in the last {days} days" },
  "{count} products added to your cart": { one: "{count} product added to your cart", other: "{count} products added to your cart" },
  "Every product in stock sold at least {count} pieces in {days} days": {
    one: "Every product in stock sold at least {count} piece in {days} days",
    other: "Every product in stock sold at least {count} pieces in {days} days",
  },
};
