// Files for Excel: CSV (one row per line, the values separated by commas). Excel opens them with a double-click.

type Cell = string | number | null | undefined;

// One value. Text with a comma, a quote or a new line goes in quotes ("" inside stands for one quote).
// Text that starts with = + - or @ gets a ' in front: Excel then shows it as text, instead of running
// it as a formula (a customer could type one into their name or address).
function cell(value: Cell) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// Rows -> the text of the file. The invisible mark at the start (BOM) tells Excel the file is UTF-8,
// so Arabic, French accents and "×" show correctly.
export const toCsv = (rows: Cell[][]) => "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";

// "2026-11-17 15:11" in the computer's time: a date and time Excel understands in every language
export function excelDateTime(d: Date | string) {
  const date = new Date(d);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}`;
}

// Today as "2026-11-26", for file names
export const today = () => excelDateTime(new Date()).slice(0, 10);

// The browser saves the file (in Downloads), as if a download link was clicked.
export function downloadFile(name: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // free the memory once the download started
}
