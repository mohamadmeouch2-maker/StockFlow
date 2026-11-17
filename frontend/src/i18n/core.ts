import type { ReactNode } from "react";
import { english } from "./en";

// A small translation system (no library). The English text in the code is the key:
//   t("Log in")                          English: "Log in"   Arabic: "تسجيل الدخول"   French: "Se connecter"
//   t("Welcome back, {name}!", { name }) fills in {name}
//   t("{count} items in the cart", { count: 3 })  picks the right plural form (Arabic has six, see Intl.PluralRules)
// English needs no dictionary (only en.ts for plural forms). The Arabic and French dictionaries
// (ar.ts, fr.ts) are downloaded only when someone chooses that language.
// A test (i18n.test.ts) checks that every text in the code has an Arabic and a French translation.

export type Lang = "en" | "ar" | "fr";
export type Plural = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
export type Dictionary = Record<string, string | Plural>;
export type Vars = Record<string, string | number>;

export const LANGUAGES: { code: Lang; name: string; dir: "ltr" | "rtl"; locale: string }[] = [
  { code: "en", name: "English", dir: "ltr", locale: "en-US" },
  // Arabic as written in Lebanon, with the digits 0-9 (like prices and order numbers)
  { code: "ar", name: "العربية", dir: "rtl", locale: "ar-LB-u-nu-latn" },
  { code: "fr", name: "Français", dir: "ltr", locale: "fr-FR" },
];
export const languageOf = (lang: Lang) => LANGUAGES.find((l) => l.code === lang)!;

// Marks a text to translate where it is shown (in lists, form rules...). It returns the text unchanged;
// the dictionary test finds it, and t() translates it on the page.
export const msg = (text: string) => text;

// The language in use right now (set by I18nProvider). Plain functions (t, dates, API messages) read it.
let current: { lang: Lang; dict: Dictionary } = { lang: "en", dict: english };
export const currentLang = () => current.lang;
export const currentLocale = () => languageOf(current.lang).locale;
export function setDictionary(lang: Lang, dict: Dictionary) {
  current = { lang, dict: lang === "en" ? english : dict };
}

const fill = (text: string, vars: Vars) => text.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));

// The text in the language in use. A missing translation shows the English text (the test catches it).
export function t(key: string, vars: Vars = {}): string {
  const entry = current.dict[key] ?? english[key] ?? key;
  if (typeof entry === "string") return fill(entry, vars);
  const form = new Intl.PluralRules(currentLocale()).select(Number(vars.count ?? 0));
  return fill(entry[form] ?? entry.other, vars);
}

// Texts that come from the API with names or numbers inside, e.g. "Your order #12 is on its way".
// Each one is turned back into its key and values, so it can be translated like any other text.
// topic / status values are translated too ("Delivery" -> "التوصيل").
const SERVER_TEXTS: { pattern: RegExp; key: string; names: string[] }[] = [
  { pattern: /^The code is not correct\. (\d+) tr(?:y|ies) left\.$/, key: "The code is not correct. {count} tries left.", names: ["count"] },
  { pattern: /^Please wait (\d+) seconds before asking for a new code\.$/, key: "Please wait {count} seconds before asking for a new code.", names: ["count"] },
  {
    pattern: /^Too many wrong passwords\. Please try again in (\d+) minutes?\.$/,
    key: "Too many wrong passwords. Please try again in {count} minutes.",
    names: ["count"],
  },
  {
    pattern: /^You sent many messages in a short time\. Please try again in (\d+) minutes, or log in\.$/,
    key: "You sent many messages in a short time. Please try again in {count} minutes, or log in.",
    names: ["count"],
  },
  { pattern: /^Not enough stock for (.+) \((\d+) left\)$/, key: "Not enough stock for {name} ({count} left)", names: ["name", "count"] },
  { pattern: /^Product (\d+) does not exist$/, key: "Product {id} does not exist", names: ["id"] },
  { pattern: /^(.+) not found$/, key: "{what} not found", names: ["what"] },
  { pattern: /^Cannot go from ([A-Z]+) to ([A-Z]+)$/, key: "Cannot go from {from} to {to}", names: ["from", "to"] },
  { pattern: /^"(.+)" already exists$/, key: '"{name}" already exists', names: ["name"] },
  {
    pattern: /^This category still has (\d+) products?\. Move or delete them first\.$/,
    key: "This category still has {count} products. Move or delete them first.",
    names: ["count"],
  },
  {
    pattern: /^Every product in stock sold at least (\d+) pieces in (\d+) days$/,
    key: "Every product in stock sold at least {count} pieces in {days} days",
    names: ["count", "days"],
  },
  // Notifications (the bell)
  {
    pattern: /^(.+) is low on stock: (\d+) left \(reorder level (\d+)\)$/,
    key: "{name} is low on stock: {count} left (reorder level {level})",
    names: ["name", "count", "level"],
  },
  { pattern: /^(.+) is sold out$/, key: "{name} is sold out", names: ["name"] },
  { pattern: /^New message from (.+): (.+)$/, key: "New message from {name}: {topic}", names: ["name", "topic"] },
  { pattern: /^(.+) wrote again: (.+)$/, key: "{name} wrote again: {topic}", names: ["name", "topic"] },
  { pattern: /^Your order #(\d+) is on its way$/, key: "Your order #{id} is on its way", names: ["id"] },
  { pattern: /^Your order #(\d+) was delivered$/, key: "Your order #{id} was delivered", names: ["id"] },
  {
    pattern: /^The store cancelled your order #(\d+)\. Questions\? Write to customer service\.$/,
    key: "The store cancelled your order #{id}. Questions? Write to customer service.",
    names: ["id"],
  },
  { pattern: /^Customer service answered your message about (.+)$/, key: "Customer service answered your message about {topic}", names: ["topic"] },
];
// Values inside API texts that are words, not names: translate them too
const TRANSLATED_VALUES = new Set(["topic", "what"]);

// An English text from the API, in the language in use (unknown texts stay as they are).
export function translateServer(text: string): string {
  if (current.lang === "en" || text in current.dict) return t(text);
  for (const { pattern, key, names } of SERVER_TEXTS) {
    const match = text.match(pattern);
    if (!match) continue;
    const vars: Vars = {};
    names.forEach((name, i) => {
      const value = match[i + 1];
      vars[name] = TRANSLATED_VALUES.has(name) ? t(value) : /^\d+$/.test(value) ? Number(value) : value;
    });
    return t(key, vars);
  }
  return text;
}

// The keys above, for the dictionary test
export const serverKeys = () => SERVER_TEXTS.map((s) => s.key);

// A translated sentence with elements inside it, e.g. a highlighted email or a link:
//   tx("We sent a new code to {email}", { email: <b key="e">{email}</b> })
// The translation decides where {email} goes, which can differ from English.
export function tx(key: string, parts: Record<string, ReactNode>, vars: Vars = {}): ReactNode[] {
  return t(key, vars)
    .split(/(\{\w+\})/)
    .filter((piece) => piece !== "")
    .map((piece) => {
      const name = piece.match(/^\{(\w+)\}$/)?.[1];
      return name && name in parts ? parts[name] : piece;
    });
}

// Fixed texts the API can send (errors, field messages, delivery names). Listed here so the
// dictionaries have them: translateServer() then shows them in the language in use.
export const SERVER_MESSAGES = [
  msg("Email or password is wrong"),
  msg("Please verify your email first. Type the 6-digit code we sent you."),
  msg("This email is already registered"),
  msg("This email is already verified. Please log in."),
  msg("No account uses this email. Please register first."),
  msg("We could not send the email right now. Please try again in a minute."),
  msg("This code does not work any more. Please ask for a new one."),
  msg("Your password was changed. Please log in again."),
  msg("The current password is not correct"),
  msg("Login required"),
  msg("Invalid or expired token"),
  msg("User no longer exists"),
  msg("Not allowed"),
  msg("Not found"),
  msg("Route not found"),
  msg("Invalid input"),
  msg("Request body is not valid JSON"),
  msg("Something went wrong"),
  msg("It is used by other records"),
  msg("Already exists"),
  msg("The order was changed by someone else, please reload"),
  msg("You can rate a product after you buy it"),
  msg("A sale is already on. End it first."),
  msg("Choose one of your orders"),
  msg("Log in to choose an order, or write its number in the message"),
  msg("Enter your name"),
  msg("Enter your email, so we can answer you"),
  msg("Admins answer the messages on the Customer service admin page"),
  msg("Write a message"),
  msg("Choose an image file"),
  msg("Category does not exist"),
  msg("Pick a day in the future"),
  msg("Use the format 2026-12-31"),
  msg("From 1 to 10"),
  msg("From 1 to 90"),
  msg("At least 7 days"),
  msg("At most 90 days"),
  msg("At most 1,000,000"),
  msg("Standard delivery"),
  msg("Express delivery"),
  // what "{what} not found" can be about
  msg("Order"),
  msg("Product"),
  msg("Category"),
  msg("Conversation"),
  msg("Notification"),
  msg("Review"),
  msg("Promotion"),
  msg("Active sale"),
  msg("Currency"),
];
