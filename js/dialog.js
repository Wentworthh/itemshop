import { addToCart } from "./cart.js";
import { HIGHLIGHT_CLASS, HIGHLIGHT_WORD } from "./config.js";
import { setTextWithHighlight } from "./highlight.js";
import { translate } from "./i18n.js";
import { getModsForProduct } from "./mods.js";
import { createImageWithFallbacks } from "./images.js";
import { formatPrice, parsePrice } from "./money.js";

export function setupModsDialog()
{
    const dialog = document.getElementById("mods-dialog");

    if (dialog === null)
    {
        return;
    }

    dialog.addEventListener("click", (event) =>
    {
        if (event.target === dialog)
        {
            dialog.close();
        }
    });

    const closeButton = document.getElementById("mods-dialog-close");

    if (closeButton !== null)
    {
        closeButton.addEventListener("click", () =>
        {
            dialog.close();
        });
    }

    const backButton = document.getElementById("mods-dialog-back");

    if (backButton !== null)
    {
        backButton.addEventListener("click", () =>
        {
            dialog.close();
        });
    }

    const addButton = document.getElementById("mods-dialog-add");

    if (addButton !== null)
    {
        addButton.addEventListener("click", () =>
        {
            if (currentProduct === null)
            {
                return;
            }

            addToCart(currentProduct, currentQuantity, getSelectedMods());
            dialog.close();
        });
    }
}

let currentProduct = null;
let currentQuantity = 1;

function getSelectedMods()
{
    return Array.from(document.querySelectorAll(".mod-tile[aria-pressed='true']"))
        .map((tile) =>
        {
            const section = tile.closest(".mods-slot");
            const slotTitle = section?.querySelector(".mods-slot__title")?.textContent ?? "";
            const name = tile.querySelector(".mod-tile__name")?.textContent ?? "";

            return {
                slot: slotTitle.replace(/\s*\(\d+\)$/, ""),
                id: tile.dataset.attachmentId ?? "",
                name: name
            };
        })
        .filter((mod) => mod.name !== "");
}

export function openModsDialog(product, quantity = 1)
{
    const dialog = document.getElementById("mods-dialog");
    const titleElement = document.getElementById("mods-dialog-title");
    const bodyElement = document.getElementById("mods-dialog-body");
    const closeButton = document.getElementById("mods-dialog-close");
    const backButton = document.getElementById("mods-dialog-back");
    const addButton = document.getElementById("mods-dialog-add");

    if (dialog === null || titleElement === null || bodyElement === null)
    {
        return;
    }

    currentProduct = product;
    currentQuantity = Math.max(1, quantity);

    setTextWithHighlight(titleElement, translate("customizeTitle", { name: product.name }), HIGHLIGHT_WORD, HIGHLIGHT_CLASS);

    if (closeButton !== null)
    {
        closeButton.setAttribute("aria-label", translate("closeLabel"));
    }

    if (backButton !== null)
    {
        backButton.textContent = translate("backButton");
    }

    if (addButton !== null)
    {
        addButton.textContent = translate("addButton");
        addButton.setAttribute("aria-label", translate("addAria", { name: product.name }));
    }

    const slots = getModsForProduct(product);

    if (slots.length === 0)
    {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "mods-dialog__empty";
        emptyMessage.textContent = translate("modsEmpty");
        bodyElement.replaceChildren(emptyMessage);
    }
    else
    {
        bodyElement.replaceChildren(...slots.map((slot) => createSlotSection(slot)));
    }

    updateSubtotal();

    if (typeof dialog.showModal === "function")
    {
        dialog.showModal();
    }
    else
    {
        dialog.setAttribute("open", "");
    }
}

function updateSubtotal()
{
    const summaryElement = document.getElementById("mods-dialog-summary");

    if (summaryElement === null || currentProduct === null)
    {
        return;
    }

    const selectedTiles = Array.from(document.querySelectorAll(".mod-tile[aria-pressed='true']"));
    const weaponPrice = parsePrice(currentProduct.price);
    const modsPrices = selectedTiles.map((tile) => (tile.dataset.price === "" ? null : parsePrice(tile.dataset.price)));
    const hasUnknownPrice = weaponPrice === null || modsPrices.some((price) => price === null);
    const unitTotal = hasUnknownPrice ? null : weaponPrice + modsPrices.reduce((total, price) => total + price, 0);

    const label = document.createElement("span");
    label.className = "mods-dialog__summary-label";
    label.textContent = translate("customizeSubtotal");

    const value = document.createElement("strong");
    value.className = "mods-dialog__summary-value";
    value.textContent = unitTotal === null ? translate("subtotalUnavailable") : formatPrice(String(unitTotal));

    const children = [label, value];

    if (unitTotal !== null && currentQuantity > 1)
    {
        const total = document.createElement("span");
        total.className = "mods-dialog__summary-total";
        total.textContent = `× ${currentQuantity} = ${formatPrice(String(unitTotal * currentQuantity))}`;
        children.push(total);
    }

    summaryElement.replaceChildren(...children);
}

function createSlotSection(slot)
{
    const section = document.createElement("section");
    section.className = "mods-slot";
    section.dataset.slot = slot.key;
    section.setAttribute("aria-label", `${slot.slot} (${slot.attachments.length})`);

    const title = document.createElement("h3");
    title.className = "mods-slot__title";
    title.textContent = `${slot.slot} (${slot.attachments.length})`;

    const grid = document.createElement("div");
    grid.className = "mods-slot__grid";

    slot.attachments.forEach((attachment) =>
    {
        grid.appendChild(createAttachmentTile(attachment));
    });

    section.appendChild(title);
    section.appendChild(grid);

    return section;
}

function createAttachmentTile(attachment)
{
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "mod-tile";
    tile.dataset.attachmentId = attachment.id;
    tile.dataset.price = attachment.price;
    tile.setAttribute("aria-pressed", "false");

    const stock = attachment.stock ?? null;
    const isOutOfStock = stock !== null && stock <= 0;
    tile.disabled = isOutOfStock;
    const priceText = attachment.price === "" ? "" : translate("priceEach", { price: formatPrice(attachment.price) });
    const stockText = isOutOfStock ? translate("outOfStock") : translate("stockLabel", { count: String(stock) });
    tile.setAttribute("aria-label", [attachment.name, priceText, stockText].filter((part) => part !== "").join(", "));

    if (isOutOfStock)
    {
        tile.classList.add("mod-tile--out");
    }

    const candidates = [attachment.image, ...(attachment.imageFallbacks ?? [])];
    const image = createImageWithFallbacks(candidates, "mod-tile__image", "", () =>
    {
        image.replaceWith(createPlaceholderSpan());
    });

    if (image === null)
    {
        tile.appendChild(createPlaceholderSpan());
    }
    else
    {
        tile.appendChild(image);
    }

    const name = document.createElement("span");
    name.className = "mod-tile__name";
    setTextWithHighlight(name, attachment.name, HIGHLIGHT_WORD, HIGHLIGHT_CLASS);
    tile.appendChild(name);

    if (attachment.price !== "")
    {
        const priceBadge = document.createElement("span");
        priceBadge.className = "mod-tile__price";
        priceBadge.textContent = priceText;
        tile.appendChild(priceBadge);
    }

    if (stock !== null)
    {
        const stockBadge = document.createElement("span");
        stockBadge.className = "mod-tile__stock";
        stockBadge.textContent = stockText;
        tile.appendChild(stockBadge);
    }

    tile.addEventListener("click", () =>
    {
        if (tile.disabled)
        {
            return;
        }

        const wasSelected = tile.getAttribute("aria-pressed") === "true";
        const grid = tile.parentElement;

        if (grid !== null)
        {
            grid.querySelectorAll(".mod-tile").forEach((otherTile) =>
            {
                setTileSelected(otherTile, false);
            });
        }

        setTileSelected(tile, wasSelected === false);
        updateSubtotal();
    });

    return tile;
}

function createPlaceholderSpan()
{
    const placeholder = document.createElement("span");
    placeholder.className = "mod-tile__placeholder";
    placeholder.textContent = translate("imagePlaceholder");

    return placeholder;
}

function setTileSelected(tile, isSelected)
{
    tile.setAttribute("aria-pressed", String(isSelected));
    tile.classList.toggle("mod-tile--selected", isSelected);
}
