import { CURRENCY_POSITION, CURRENCY_SYMBOL } from "./config.js";

const PLAIN_NUMBER = /^\d+(?:[.,]\d+)?$/;

export function parsePrice(value)
{
    const normalized = String(value ?? "")
        .replace(/[^\d.,-]/g, "")
        .replace(/\.(?=\d{3}\b)/g, "")
        .replace(",", ".");
    const parsed = Number.parseFloat(normalized);

    return Number.isFinite(parsed) ? parsed : null;
}

export function formatPrice(rawValue, fractionDigits = 2)
{
    const text = String(rawValue ?? "").trim();

    if (text === "")
    {
        return "-";
    }

    if (PLAIN_NUMBER.test(text) === false)
    {
        return text;
    }

    const parsed = parsePrice(text);

    if (parsed === null)
    {
        return text;
    }

    const amount = fractionDigits === null ? String(parsed) : parsed.toFixed(fractionDigits);

    if (CURRENCY_SYMBOL === "")
    {
        return amount;
    }

    return CURRENCY_POSITION === "prefix" ? `${CURRENCY_SYMBOL}${amount}` : `${amount} ${CURRENCY_SYMBOL}`;
}
