import { MODS_DATA_URL } from "./config.js";
import { normalizeText } from "./csv.js";
import { buildImageCandidates } from "./products.js";
import { state } from "./state.js";

export async function loadModsData()
{
    try
    {
        const response = await fetch(MODS_DATA_URL, { cache: "no-store" });

        if (response.ok === false)
        {
            throw new Error(`Mods data request failed with status ${response.status}`);
        }

        const data = await response.json();

        state.modsData =
        {
            slotLabels: data.slotLabels ?? {},
            attachments: data.attachments ?? {},
            weapons: data.weapons ?? {}
        };
    }
    catch (error)
    {
        state.modsData = { slotLabels: {}, attachments: {}, weapons: {} };
        console.warn("Weapon mods data not available:", error);
    }
}

export function getModsForProduct(product)
{
    const weaponSlots = state.modsData.weapons[product.id];

    if (weaponSlots === undefined)
    {
        return [];
    }

    return Object.entries(weaponSlots)
        .map(([slot, attachmentIds]) =>
        {
            const label = state.modsData.slotLabels[slot] ?? slot;

            const attachments = attachmentIds
                .filter((attachmentId) => state.hiddenIds.has(attachmentId) === false)
                .map((attachmentId) =>
            {
                const attachment = state.modsData.attachments[attachmentId];
                const explicitImage = attachment?.image ?? "";
                const derivedCandidates = buildImageCandidates(attachmentId);

                return {
                    id: attachmentId,
                    name: attachment?.name ?? attachmentId,
                    image: explicitImage !== "" ? explicitImage : (derivedCandidates[0] ?? ""),
                    imageFallbacks: explicitImage !== "" ? [] : derivedCandidates.slice(1),
                    stock: getAttachmentStock(attachmentId),
                    price: findAttachmentProduct(attachmentId)?.price ?? ""
                };
            });

            return { key: slot, slot: label, attachments: attachments };
        })
        .filter((slot) => slot.attachments.length > 0);
}

export function findAttachmentProduct(attachmentId)
{
    const normalizedId = normalizeText(attachmentId);

    return state.products.find((item) => normalizeText(item.id) === normalizedId);
}

function getAttachmentStock(attachmentId)
{
    const product = findAttachmentProduct(attachmentId);

    if (product === undefined)
    {
        return null;
    }

    return Math.max(product.quantity, 0);
}

export function hasMods(product)
{
    return state.modsData.weapons[product.id] !== undefined;
}
