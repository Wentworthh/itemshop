import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const itemsDir = path.join(projectRoot, "items");
const imageDirs = ["images/items"].map((folder) => path.join(projectRoot, folder));
const outputPath = path.join(projectRoot, "products-template.csv");

const CATEGORY_BY_TYPE =
{
    "Recyclable": "Materials",
    "Refined Material": "Materials",
    "Basic Material": "Materials",
    "Topside Material": "Materials",
    "Nature": "Materials",
    "Blueprint": "Blueprints",
    "Trinket": "Collectibles",
    "Key": "Collectibles",
    "Special": "Collectibles",
    "Misc": "Collectibles",
    "Modification": "Attachments",
    "Augment": "Gear",
    "Shield": "Gear",
    "Quick Use": "Consumables",
    "Ammunition": "Consumables"
};

const WEAPON_CATEGORY = "Weapons";

function nameFromSlug(slug)
{
    return slug
        .split("_")
        .filter((part) => part !== "")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function escapeCsv(value)
{
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function isHttpsUrl(value)
{
    try
    {
        return new URL(value).protocol === "https:";
    }
    catch (error)
    {
        return false;
    }
}

function hasModSlots(item)
{
    return item.modSlots !== undefined && item.modSlots !== null && Object.keys(item.modSlots).length > 0;
}

function resolveCategory(item)
{
    if (item.isWeapon === true || hasModSlots(item))
    {
        return WEAPON_CATEGORY;
    }

    return CATEGORY_BY_TYPE[String(item.type ?? "").trim()] ?? "";
}

const localImages = new Set();
const baseFolderImages = fs
    .readdirSync(imageDirs[imageDirs.length - 1])
    .filter((file) => file.toLowerCase().endsWith(".png"));

imageDirs.forEach((directory) =>
{
    fs.readdirSync(directory).forEach((file) => localImages.add(file.toLowerCase()));
});
const jsonFiles = fs.readdirSync(itemsDir).filter((file) => file.toLowerCase().endsWith(".json"));

const rows = [];
const knownIds = new Set();

jsonFiles.forEach((file) =>
{
    let item;

    try
    {
        item = JSON.parse(fs.readFileSync(path.join(itemsDir, file), "utf8"));
    }
    catch (error)
    {
        return;
    }

    const id = String(item.id ?? path.basename(file, ".json")).trim();
    const name = String(item.name?.en ?? item.name?.it ?? "").trim() || nameFromSlug(id);
    const remoteImage = String(item.imageFilename ?? "").trim();
    const hasLocalImage = localImages.has(`${id.toLowerCase()}.png`);

    knownIds.add(id.toLowerCase());
    rows.push({
        id: id,
        name: name,
        imageUrl: hasLocalImage === false && isHttpsUrl(remoteImage) ? remoteImage : "",
        category: resolveCategory(item)
    });
});

baseFolderImages.forEach((file) =>
{
    const stem = path.basename(file, ".png");

    if (knownIds.has(stem) === false)
    {
        rows.push({ id: stem, name: nameFromSlug(stem), imageUrl: "", category: "" });
    }
});

rows.sort((left, right) => left.name.localeCompare(right.name, "en") || left.id.localeCompare(right.id, "en"));

const header = ["ID", "Nome", "Quantità", "Prezzo", "Stato", "URL Immagine", "Categoria", "In evidenza"];
const lines = [header.map(escapeCsv).join(",")];

rows.forEach((row) =>
{
    lines.push([
        escapeCsv(row.id),
        escapeCsv(row.name),
        "",
        "",
        "",
        escapeCsv(row.imageUrl),
        escapeCsv(row.category),
        ""
    ].join(","));
});

fs.writeFileSync(outputPath, `${lines.join("\r\n")}\r\n`, "utf8");

const counts = new Map();

rows.forEach((row) =>
{
    const key = row.category === "" ? "(nessuna)" : row.category;
    counts.set(key, (counts.get(key) ?? 0) + 1);
});

console.log(`rows: ${rows.length}, bytes: ${fs.statSync(outputPath).size}`);

[...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .forEach(([key, value]) => console.log(`  ${key}: ${value}`));
