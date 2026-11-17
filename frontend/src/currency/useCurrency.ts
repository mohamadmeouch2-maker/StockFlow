import { useContext } from "react";
import { CurrencyContext } from "./currencyContext";

// const { money } = useCurrency();   money(product.price) -> "$12.50" or "LBP 1,118,750" or "10,88 €"
// Prices are always in US dollars; money() shows them in the currency the visitor picked.
export const useCurrency = () => useContext(CurrencyContext);
