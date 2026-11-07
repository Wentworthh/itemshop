import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const itemsDir = path.join(projectRoot, "items");
const imageFolders = ["images/items/"];
const imageDirs = imageFolders.map((folder) => path.join(projectRoot, folder));
const outputDir = path.join(projectRoot, "data");
const outputPath = path.join(outputDir, "weapon-mods.json");

const ATTACHMENT_SLOTS = ["muzzle", "grip", "stock", "magazine"];

function nameFromSlug(slug)
{
    return slug
        .split("_")
        .filter((part) => part !== "")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
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

function readItems()
{
    return fs
        .readdirSync(itemsDir)
        .filter((file) => file.toLowerCase().endsWith(".json"))
        .map((file) =>
        {
            try
            {
                return JSON.parse(fs.readFileSync(path.join(itemsDir, file), "utf8"));
            }
            catch (error)
            {
                return null;
            }
        })
        .filter((item) => item !== null);
}

const items = readItems();
const localImages = new Set();

imageDirs.forEach((directory) =>
{
    fs.readdirSync(directory).forEach((file) => localImages.add(file.toLowerCase()));
});

const itemData = new Map();

items.forEach((item) =>
{
    const id = String(item.id ?? "").trim();

    if (id === "")
    {
        return;
    }

    itemData.set(id, item);
});

const slotLabels = {};
const weapons = {};
const referencedAttachmentIds = new Set();

items.forEach((item) =>
{
    const id = String(item.id ?? "").trim();
    const modSlots = item.modSlots;

    if (id === "" || modSlots === undefined || modSlots === null)
    {
        return;
    }

    const slots = {};

    Object.entries(modSlots).forEach(([slot, ids]) =>
    {
        if (ATTACHMENT_SLOTS.includes(slot) === false || Array.isArray(ids) === false || ids.length === 0)
        {
            return;
        }

        const attachmentIds = ids.map((attachmentId) => String(attachmentId));

        slots[slot] = attachmentIds;
        slotLabels[slot] = slot.charAt(0).toUpperCase() + slot.slice(1);
        attachmentIds.forEach((attachmentId) => referencedAttachmentIds.add(attachmentId));
    });

    if (Object.keys(slots).length > 0)
    {
        weapons[id] = slots;
    }
});

const attachments = {};

[...referencedAttachmentIds]
    .sort()
    .forEach((attachmentId) =>
    {
        const attachment = itemData.get(attachmentId);
        const name = String(attachment?.name?.en ?? attachment?.name?.it ?? "").trim() || nameFromSlug(attachmentId);
        const remoteImage = String(attachment?.imageFilename ?? "").trim();
        const hasLocalImage = localImages.has(`${attachmentId.toLowerCase()}.png`);

        attachments[attachmentId] =
        {
            name: name,
            image: hasLocalImage ? "" : (isHttpsUrl(remoteImage) ? remoteImage : "")
        };
    });

const data =
{
    slotLabels: slotLabels,
    attachments: attachments,
    weapons: weapons
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

const attachmentsWithoutImage = [...referencedAttachmentIds].filter((attachmentId) =>
    localImages.has(`${attachmentId.toLowerCase()}.png`) === false && attachments[attachmentId].image === ""
);

console.log(`weapons with mods: ${Object.keys(weapons).length}`);
console.log(`attachments: ${Object.keys(attachments).length}`);
console.log(`slots: ${Object.keys(slotLabels).join(", ")}`);
console.log(`attachments without any local image (placeholder only): ${attachmentsWithoutImage.length} ${attachmentsWithoutImage.join(", ")}`);
console.log(`bytes: ${fs.statSync(outputPath).size}`);
