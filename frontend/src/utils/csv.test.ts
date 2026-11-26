import { expect, test } from "vitest";
import { excelDateTime, toCsv } from "./csv";

test("a CSV file for Excel: quotes where needed, formulas made harmless, the UTF-8 mark first", () => {
  const text = toCsv([
    ["Name", "Address", "Total"],
    ['Sara "S"', "Hamra, Beirut", 12.5],
    ["=HYPERLINK(1)", "+961 70 123 456", null], // typed by a customer: shown as text, never run
    ["سارة", "line\nbreak", 0],
  ]);
  expect(text.startsWith("\uFEFF")).toBe(true);
  expect(text.slice(1).split("\r\n")).toEqual([
    "Name,Address,Total",
    '"Sara ""S""","Hamra, Beirut",12.5',
    "'=HYPERLINK(1),'+961 70 123 456,",
    'سارة,"line\nbreak",0',
    "",
  ]);
});

test("dates and times the way Excel reads them in every language", () => {
  expect(excelDateTime(new Date(2026, 10, 7, 9, 5))).toBe("2026-11-07 09:05");
});
