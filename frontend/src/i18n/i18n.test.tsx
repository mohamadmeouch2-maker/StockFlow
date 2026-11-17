import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { LanguageSelect } from "../components/LanguageSelect";
import { arabic } from "./ar";
import { serverKeys, setDictionary, t, translateServer, tx, type Dictionary } from "./core";
import { french } from "./fr";
import { I18nProvider } from "./I18nProvider";
import { useT } from "./useT";

afterEach(() => {
  setDictionary("en", {});
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  localStorage.clear();
});

// Every text in the website code, read from the source files: t("..."), tx("..."), msg("...")...
const sources = import.meta.glob(["../**/*.{ts,tsx}", "!../**/*.test.{ts,tsx}", "!./ar.ts", "!./fr.ts", "!./en.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const CALL = /\b(?:t|tr|tx|msg|translate)\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
const keysInCode = new Set<string>(serverKeys());
for (const code of Object.values(sources)) for (const m of code.matchAll(CALL)) keysInCode.add((m[1] ?? m[2]).replace(/\\(["'\\])/g, "$1"));

const placeholders = (text: string) => new Set(text.match(/\{\w+\}/g) ?? []);
const forms = (value: Dictionary[string]) => (typeof value === "string" ? [value] : Object.values(value));

test.each([
  ["Arabic", arabic],
  ["French", french],
])("every text on the website has a %s translation, with the same {placeholders}", (_name, dict) => {
  expect(keysInCode.size).toBeGreaterThan(500);
  const missing = [...keysInCode].filter((key) => !(key in dict));
  expect(missing).toEqual([]);
  for (const key of keysInCode) {
    const need = placeholders(key);
    for (const text of forms(dict[key])) {
      for (const p of placeholders(text)) expect(need, `${text} (for "${key}")`).toContain(p);
      // a form may spell the number out ("قطعة واحدة"), so only {count} may be left out
      for (const p of need) if (p !== "{count}") expect(placeholders(text), `${text} (for "${key}")`).toContain(p);
    }
  }
});

test("t() fills in values and picks the right plural form", () => {
  expect(t("{count} items in the cart", { count: 1 })).toBe("1 item in the cart");
  expect(t("{count} items in the cart", { count: 3 })).toBe("3 items in the cart");

  setDictionary("ar", arabic); // Arabic has six forms: 0, 1, 2, 3-10, 11-99, 100+
  expect(t("{count} items in the cart", { count: 1 })).toBe("قطعة واحدة في السلة");
  expect(t("{count} items in the cart", { count: 2 })).toBe("قطعتان في السلة");
  expect(t("{count} items in the cart", { count: 5 })).toBe("5 قطع في السلة");
  expect(t("{count} items in the cart", { count: 12 })).toBe("12 قطعة في السلة");
  expect(t("Welcome back, {name}!", { name: "Sara" })).toBe("مرحبًا بعودتك يا Sara!");

  setDictionary("fr", french); // French: 0 and 1 are singular
  expect(t("{count} products", { count: 0 })).toBe("0 produit");
  expect(t("{count} products", { count: 2 })).toBe("2 produits");
  expect(t("Forgot password?")).toBe("Mot de passe oublié\u00a0?"); // no line break before "?"
});

test("texts from the API are translated, also with names and numbers inside", () => {
  expect(translateServer("Your order #12 is on its way")).toBe("Your order #12 is on its way"); // English: as it is
  setDictionary("ar", arabic);
  expect(translateServer("Email or password is wrong")).toBe("البريد الإلكتروني أو كلمة المرور غير صحيحة");
  expect(translateServer("Your order #12 is on its way")).toBe("طلبك رقم 12 في الطريق");
  expect(translateServer("The code is not correct. 1 try left.")).toBe("الرمز غير صحيح. بقيت محاولة واحدة.");
  expect(translateServer("New message from Omar: Payments and cards")).toBe("رسالة جديدة من Omar: الدفع والبطاقات"); // the topic too
  expect(translateServer("Order not found")).toBe("الطلب: غير موجود");
  expect(translateServer("Something nobody translated")).toBe("Something nobody translated"); // unknown: unchanged
});

test("tx() puts elements where the translation wants them", () => {
  setDictionary("fr", french);
  const parts = tx("We sent a new code to {email}", { email: <b key="e">sara@test.dev</b> });
  render(<p>{parts}</p>);
  expect(screen.getByText("sara@test.dev").tagName).toBe("B");
  expect(screen.getByText(/Nous avons envoyé un nouveau code à/)).toBeInTheDocument();
});

function Greeting() {
  const { t } = useT();
  return <h1>{t("Welcome back")}</h1>;
}

test("choosing a language translates the page, turns it right to left for Arabic, and is remembered", async () => {
  render(
    <I18nProvider>
      <LanguageSelect />
      <Greeting />
    </I18nProvider>,
  );
  expect(screen.getByRole("heading")).toHaveTextContent("Welcome back");

  await userEvent.selectOptions(screen.getByLabelText("Language"), "العربية");
  expect(await screen.findByRole("heading", { name: "مرحبًا بعودتك" })).toBeInTheDocument();
  expect(document.documentElement.dir).toBe("rtl");
  expect(document.documentElement.lang).toBe("ar");
  expect(localStorage.getItem("lang")).toBe("ar");

  await userEvent.selectOptions(screen.getByLabelText("اللغة"), "Français");
  expect(await screen.findByRole("heading", { name: "Bon retour" })).toBeInTheDocument();
  expect(document.documentElement.dir).toBe("ltr");
});

test("the language chosen last time comes back on the next visit", async () => {
  localStorage.setItem("lang", "fr");
  render(
    <I18nProvider>
      <Greeting />
    </I18nProvider>,
  );
  expect(await screen.findByRole("heading", { name: "Bon retour" })).toBeInTheDocument();
});
