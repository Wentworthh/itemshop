import { getCartLines, getSubtotal } from "./cart.js";
import { translate } from "./i18n.js";
import { formatPrice } from "./money.js";

const SEPARATOR = "-".repeat(32);

export function buildOrderPayload({ discordName, note })
{
    return {
        discordName: String(discordName ?? "").trim(),
        note: String(note ?? "").trim(),
        page: window.location.href,
        createdAt: new Date().toISOString(),
        items: getCartLines().map((line) => ({
            id: line.product.id,
            name: line.product.name,
            quantity: line.quantity,
            price: line.product.price,
            mods: line.mods.map((mod) => ({ slot: mod.slot, id: mod.id ?? "", name: mod.name, price: mod.price ?? "" })),
            modsText: line.mods
                .map((mod) => (mod.price === "" ? `${mod.slot}: ${mod.name}` : `${mod.slot}: ${mod.name} (+${formatPrice(mod.price)})`))
                .join(", ")
        }))
    };
}

function formatStamp(isoDate)
{
    const date = new Date(isoDate);
    const pad = (value) => String(value).padStart(2, "0");

    if (Number.isNaN(date.getTime()))
    {
        return "";
    }

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildItemBlock(line, index)
{
    const rows = [`${index + 1}. ${line.product.name}`];
    const unitText = line.unitPrice === null ? "n/a" : formatPrice(String(line.unitPrice));
    rows.push(`   Qty: ${line.quantity} x ${unitText}`);

    if (line.mods.length > 0)
    {
        const weaponText = line.unitPrice === null ? "n/a" : formatPrice(line.product.price);
        const modsText = line.modsPrice === null ? "n/a" : formatPrice(String(line.modsPrice));

        rows.push(`   Weapon: ${weaponText}`);
        rows.push(`   Mods: ${modsText}`);
    }

    line.mods.forEach((mod) =>
    {
        const priceText = mod.price === "" ? "" : ` (${formatPrice(mod.price)})`;
        rows.push(`   ${mod.slot}: ${mod.name}${priceText}`);
    });

    const lineText = line.lineTotal === null ? "n/a" : formatPrice(String(line.lineTotal));
    rows.push(`   Line: ${lineText}`);

    return rows.join("\n");
}

function buildTotalText(total)
{
    if (total.complete)
    {
        return formatPrice(total.value.toFixed(2));
    }

    if (total.value === null || total.value === 0)
    {
        return translate("subtotalUnavailable");
    }

    return translate("subtotalPartial", { amount: formatPrice(total.value.toFixed(2)), count: String(total.unknownCount) });
}

function buildOrderText(payload)
{
    const lines = getCartLines();
    const total = getSubtotal();
    const totalUnits = lines.reduce((sum, line) => sum + line.quantity, 0);
    const stamp = formatStamp(payload.createdAt);

    const blocks = [stamp === "" ? "NEW ORDER" : `NEW ORDER - ${stamp}`, ""];

    lines.forEach((line, index) =>
    {
        blocks.push(buildItemBlock(line, index));
        blocks.push("");
    });

    blocks.push(SEPARATOR);
    blocks.push(`Items: ${totalUnits} units in ${lines.length} lines`);
    blocks.push(`TOTAL: ${buildTotalText(total)}`);
    blocks.push(SEPARATOR);

    if (payload.discordName !== "")
    {
        blocks.push(`Discord: ${payload.discordName}`);
    }

    if (payload.note !== "")
    {
        blocks.push(`Note: ${payload.note}`);
    }

    return blocks.join("\n").trimEnd();
}

export async function copyOrder(payload)
{
    const copied = await copyText(buildOrderText(payload));

    return { copied: copied };
}

async function copyText(text)
{
    try
    {
        await navigator.clipboard.writeText(text);
        return true;
    }
    catch (error)
    {
        return copyTextWithTextarea(text);
    }
}

function copyTextWithTextarea(text)
{
    try
    {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.className = "visually-hidden";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();

        return copied;
    }
    catch (error)
    {
        return false;
    }
}