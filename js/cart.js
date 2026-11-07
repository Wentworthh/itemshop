import { findAttachmentProduct } from "./mods.js";
import { parsePrice } from "./money.js";
import { state } from "./state.js";

const CART_STORAGE_KEY = "arc-raiders-cart";

let changeHandler = () => {};

export function onCartChange(handler)
{
    changeHandler = handler;
}

function notifyChange()
{
    changeHandler();
}

function buildLineKey(productId, mods)
{
    const modsKey = mods
        .map((mod) => `${mod.slot}:${mod.id ?? mod.name}`)
        .sort()
        .join("|");

    return `${productId}||${modsKey}`;
}

export function addToCart(product, quantity, mods = [])
{
    if (product.isSoldOut)
    {
        return;
    }

    const key = buildLineKey(product.id, mods);
    const existingLine = state.cart.find((line) => line.key === key);
    const lineMax = getLineMaxQuantity(product.id, key);

    if (existingLine !== undefined)
    {
        existingLine.quantity = Math.min(existingLine.quantity + quantity, lineMax);
    }
    else
    {
        if (lineMax <= 0)
        {
            return;
        }

        state.cart.push({
            key: key,
            id: product.id,
            quantity: Math.min(Math.max(quantity, 1), lineMax),
            mods: mods.map((mod) => ({ slot: mod.slot, id: mod.id ?? "", name: mod.name }))
        });
    }

    saveCart();
    notifyChange();
}

export function setLineQuantity(key, quantity)
{
    const line = state.cart.find((cartLine) => cartLine.key === key);

    if (line === undefined)
    {
        return;
    }

    const lineMax = getLineMaxQuantity(line.id, line.key);
    line.quantity = Math.min(Math.max(quantity, 1), Math.max(lineMax, 1));
    saveCart();
    notifyChange();
}

export function removeLine(key)
{
    state.cart = state.cart.filter((line) => line.key !== key);
    saveCart();
    notifyChange();
}

function getQuantityInCart(productId)
{
    return state.cart
        .filter((line) => line.id === productId)
        .reduce((total, line) => total + line.quantity, 0);
}

function getLineMaxQuantity(productId, lineKey)
{
    const stock = getMaxQuantity(productId);
    const takenByOtherLines = state.cart
        .filter((line) => line.id === productId && line.key !== lineKey)
        .reduce((total, line) => total + line.quantity, 0);

    return Math.max(stock - takenByOtherLines, 0);
}

function getMaxQuantity(productId)
{
    const product = state.products.find((item) => item.id === productId);

    if (product === undefined)
    {
        return 1;
    }

    return Math.max(product.quantity, 0);
}

export function getCartLines()
{
    return state.cart
        .map((line) =>
        {
            const product = state.products.find((item) => item.id === line.id);

            if (product === undefined)
            {
                return null;
            }

            const maxQuantity = Math.max(product.quantity, 0);
            const quantity = Math.min(line.quantity, maxQuantity);
            const mods = line.mods.map((mod) =>
            {
                const attachmentProduct = findAttachmentProduct(mod.id ?? "");

                return {
                    slot: mod.slot,
                    id: mod.id ?? "",
                    name: mod.name,
                    price: attachmentProduct?.price ?? "",
                    priceValue: attachmentProduct === undefined ? null : parsePrice(attachmentProduct.price)
                };
            });

            const modsPrice = sumModsPrice(mods);
            const weaponPrice = parsePrice(product.price);
            const unitPrice = weaponPrice === null || modsPrice === null ? null : weaponPrice + modsPrice;

            return {
                key: line.key,
                product: product,
                quantity: quantity,
                maxQuantity: maxQuantity,
                mods: mods,
                modsPrice: modsPrice,
                unitPrice: unitPrice,
                lineTotal: unitPrice === null ? null : unitPrice * quantity
            };
        })
        .filter((line) => line !== null && line.maxQuantity > 0);
}

function sumModsPrice(mods)
{
    if (mods.length === 0)
    {
        return 0;
    }

    if (mods.some((mod) => mod.priceValue === null))
    {
        return null;
    }

    return mods.reduce((total, mod) => total + mod.priceValue, 0);
}

export function getSubtotal()
{
    const lines = getCartLines();
    const pricedLines = lines.filter((line) => line.lineTotal !== null);
    const unknownCount = lines.length - pricedLines.length;

    if (lines.length === 0)
    {
        return { value: null, complete: false, unknownCount: 0 };
    }

    return {
        value: pricedLines.reduce((total, line) => total + line.lineTotal, 0),
        complete: unknownCount === 0,
        unknownCount: unknownCount
    };
}

function saveCart()
{
    try
    {
        const stored = state.cart.map((line) => ({
            id: line.id,
            quantity: line.quantity,
            mods: line.mods
        }));

        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stored));
    }
    catch (error)
    {

    }
}

export function loadCart()
{
    try
    {
        const raw = window.localStorage.getItem(CART_STORAGE_KEY);

        if (raw === null)
        {
            state.cart = [];
            return;
        }

        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed) === false)
        {
            state.cart = [];
            return;
        }

        state.cart = parsed
            .filter((line) => typeof line?.id === "string" && Number.isFinite(line?.quantity))
            .map((line) =>
            {
                const mods = Array.isArray(line.mods) ? line.mods : [];

                return {
                    key: buildLineKey(line.id, mods),
                    id: line.id,
                    quantity: Math.max(Number.parseInt(line.quantity, 10), 1),
                    mods: mods.map((mod) => ({ slot: String(mod.slot ?? ""), id: String(mod.id ?? ""), name: String(mod.name ?? "") }))
                };
            });
    }
    catch (error)
    {
        state.cart = [];
    }
}
