import { z } from "zod";
import { msg } from "../i18n/core";

// Form rules shared by several pages. They are the same as the API's,
// so most mistakes are shown before anything is sent.

export const nameRule = z.string().trim().min(2, msg("At least 2 characters")).max(100, msg("At most 100 characters"));

// FR-01: at least 8 characters, with a letter and a number
export const passwordRule = z
  .string()
  .min(8, msg("At least 8 characters"))
  .regex(/[A-Za-z]/, msg("Needs a letter"))
  .regex(/\d/, msg("Needs a number"));

// Where to deliver (the cart and My account).
// A phone number like "+961 70 123 456", "03-123456" or "70123456" (7 to 15 digits).
const digits = (v: string) => v.replace(/\D/g, "").length;
export const shipToSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine((v) => /^\+?[\d\s-]+$/.test(v) && digits(v) >= 7 && digits(v) <= 15, { message: msg("Enter a valid phone number, for example +961 70 123 456") }),
  city: z.string().trim().min(2, msg("Enter the city")).max(60, msg("At most 60 characters")),
  address: z.string().trim().min(5, msg("Enter the street, building and floor")).max(300, msg("At most 300 characters")),
});
