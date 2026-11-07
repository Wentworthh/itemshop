import { CSV_URL, LOCAL_IMAGE_EXTENSION, LOCAL_IMAGE_FOLDERS, REQUIRED_COLUMNS } from "./config.js";
import { buildColumnIndex, normalizeText, parseCsv } from "./csv.js";

async function fetchProducts(url)
{
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok)
    {
        throw new Error(`CSV request failed with status ${response.status} (on 400/404 republish the sheet and update CSV_URL)`);
    }

    const csvText = await response.text();
    const rows = parseCsv(csvText).filter((row) => row.some((cell) => cell.trim() !== ""));

    if (rows.length < 2)
    {
        return [];
    }

    const columnIndex = buildColumnIndex(rows[0]);
    const missingColumns = REQUIRED_COLUMNS.filter((key) => columnIndex[key] === -1);

    if (missingColumns.length > 0)
    {
        throw new Error(`Missing CSV columns: ${missingColumns.join(", ")}`);
    }

    return rows
        .slice(1)
        .map((row) => toProduct(row, columnIndex))
        .filter((product) => product !== null);
}

function toProduct(row, columnIndex)
{
    const readCell = (key) =>
    {
        const index = columnIndex[key];
        return index === -1 || index >= row.length ? "" : row[index].trim();
    };

    const name = readCell("name");

    if (name === "")
    {
        return null;
    }

    const id = readCell("id");
    const rawQuantity = readCell("quantity");
    const parsedQuantity = Number.parseInt(rawQuantity, 10);
    const quantity = Number.isNaN(parsedQuantity) ? 0 : parsedQuantity;
    const status = readCell("status");
    const explicitImageUrl = readCell("imageUrl");
    const derivedCandidates = buildImageCandidates(id !== "" ? id : name);

    return {
        id: id,
        name: name,
        quantity: quantity,
        price: readCell("price"),
        imageUrl: explicitImageUrl !== "" ? explicitImageUrl : (derivedCandidates[0] ?? ""),
        imageFallbacks: explicitImageUrl !== "" ? [] : derivedCandidates.slice(1),
        status: status,
        category: readCell("category"),
        isFeatured: isTruthyFlag(readCell("featured")),
        isHidden: isTruthyFlag(readCell("hidden")),
        isSoldOut: quantity <= 0 || isSoldOutStatus(status)
    };
}

function isTruthyFlag(value)
{
    const normalizedValue = normalizeText(value);
    return ["si", "yes", "y", "true", "1", "x"].includes(normalizedValue);
}

function isSoldOutStatus(status)
{
    const normalizedStatus = normalizeText(status);
    return normalizedStatus.includes("esaurit") || normalizedStatus.includes("sold out");
}

export function buildImageCandidates(slugSource)
{
    const slug = toImageSlug(slugSource);

    if (slug === "")
    {
        return [];
    }

    return LOCAL_IMAGE_FOLDERS.map((folder) => `${folder}${slug}${LOCAL_IMAGE_EXTENSION}`);
}

function buildLocalImageUrl(slugSource)
{
    return buildImageCandidates(slugSource)[0] ?? "";
}

function toImageSlug(value)
{
    return normalizeText(value)
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

export function toSafeImageUrl(rawUrl)
{
    if (rawUrl === "")
    {
        return null;
    }

    try
    {
        const parsedUrl = new URL(rawUrl, window.location.href);

        if (parsedUrl.protocol === "data:")
        {
            return parsedUrl.pathname.startsWith("image/") ? parsedUrl.href : null;
        }

        if (parsedUrl.protocol === "https:")
        {
            return parsedUrl.href;
        }

        if (parsedUrl.origin === window.location.origin)
        {
            return parsedUrl.href;
        }
    }
    catch (error)
    {
        return null;
    }

    return null;
}

export async function loadProducts()
{
    return fetchProducts(CSV_URL);
}
