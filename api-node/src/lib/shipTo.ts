import { z } from "zod";

// Where to deliver: the same rules for an order (the cart) and for the address saved in My account.
// The website checks the same rules before sending.

// A phone number like "+961 70 123 456", "03-123456" or "70123456": digits, spaces, dashes and
// an optional "+" at the start, with 7 to 15 digits in all.
const digits = (v: string) => v.replace(/\D/g, "").length;
const isPhone = (v: string) => /^\+?[\d\s-]+$/.test(v) && digits(v) >= 7 && digits(v) <= 15;

export const shipToFields = {
  phone: z.string({ error: "Enter a phone number" }).trim().refine(isPhone, { message: "Enter a valid phone number, for example +961 70 123 456" }),
  city: z.string({ error: "Enter the city" }).trim().min(2, "Enter the city").max(60, "At most 60 characters"),
  address: z.string({ error: "Enter the address" }).trim().min(5, "Enter the street, building and floor").max(300, "At most 300 characters"),
};

export type ShipTo = { phone: string; city: string; address: string };
