import { DISCORD_INVITE_URL, HIGHLIGHT_CLASS, HIGHLIGHT_WORD } from "./config.js";
import { setTextWithHighlight } from "./highlight.js";
import { getCartLines, getSubtotal, removeLine, setLineQuantity } from "./cart.js";
import { translate } from "./i18n.js";
import { buildOrderPayload, copyOrder } from "./orders.js";
import { createImageWithFallbacks } from "./images.js";
import { formatPrice } from "./money.js";

const selectedKeys = new Set();

export function setupCartDialog()
{
    const dialog = document.getElementById("cart-dialog");

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

    document.getElementById("cart-dialog-close")?.addEventListener("click", () =>
    {
        selectedKeys.clear();
        dialog.close();
    });

    dialog.addEventListener("close", () =>
    {
        selectedKeys.clear();
        renderBulkActions(getCartLines());
    });

    document.getElementById("cart-dialog-discord")?.addEventListener("click", () =>
    {
        window.open(DISCORD_INVITE_URL, "_blank", "noopener,noreferrer");
    });

    document.getElementById("cart-dialog-send")?.addEventListener("click", async () =>
    {
        await handleCopyOrder();
    });
}

export function openCartDialog()
{
    const dialog = document.getElementById("cart-dialog");

    if (dialog === null)
    {
        return;
    }

    syncCartUi();

    const bodyElement = document.getElementById("cart-dialog-body");

    if (bodyElement !== null)
    {
        bodyElement.scrollTop = 0;
    }

    if (typeof dialog.showModal === "function")
    {
        dialog.showModal();
    }
    else
    {
        dialog.setAttribute("open", "");
    }
}

let lastRenderedCount = 0;
let bumpTimeoutId = null;

export function syncCartUi()
{
    const cartButton = document.getElementById("cart-button");

    if (cartButton !== null)
    {
        const count = getCartLines().reduce((total, line) => total + line.quantity, 0);
        const labelElement = cartButton.querySelector(".cart-button__label");

        if (labelElement !== null)
        {
            labelElement.textContent = translate("cartButton");
        }

        cartButton.setAttribute("aria-label", translate("cartAria", { count: String(count) }));

        let badge = cartButton.querySelector(".cart-button__count");

        if (badge === null)
        {
            badge = document.createElement("span");
            badge.className = "cart-button__count";
            cartButton.appendChild(badge);
        }

        badge.textContent = String(count);

        if (count > lastRenderedCount)
        {
            cartButton.classList.remove("cart-button--bump");
            void cartButton.offsetWidth;
            cartButton.classList.add("cart-button--bump");

            window.clearTimeout(bumpTimeoutId);
            bumpTimeoutId = window.setTimeout(() =>
            {
                cartButton.classList.remove("cart-button--bump");
            }, 450);
        }

        lastRenderedCount = count;
    }

    const closeButton = document.getElementById("cart-dialog-close");

    if (closeButton !== null)
    {
        closeButton.setAttribute("aria-label", translate("closeLabel"));
    }

    const sendButton = document.getElementById("cart-dialog-send");

    if (sendButton !== null)
    {
        sendButton.textContent = translate("copyOrderButton");
    }

    renderCartBody();
}

function renderCartBody()
{
    const bodyElement = document.getElementById("cart-dialog-body");
    const summaryElement = document.getElementById("cart-dialog-summary");
    const countElement = document.getElementById("cart-dialog-count");
    const sendButton = document.getElementById("cart-dialog-send");

    if (bodyElement === null)
    {
        return;
    }

    const lines = getCartLines();
    const totalUnits = lines.reduce((total, line) => total + line.quantity, 0);

    if (countElement !== null)
    {
        countElement.textContent = lines.length === 0 ? "" : translate("cartItemsLabel", { count: String(totalUnits) });
    }

    if (lines.length === 0)
    {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "mods-dialog__empty";
        emptyMessage.textContent = translate("cartEmpty");
        bodyElement.replaceChildren(emptyMessage);

        if (summaryElement !== null)
        {
            summaryElement.replaceChildren();
        }

        if (sendButton !== null)
        {
            sendButton.disabled = true;
        }

        renderBulkActions(lines);
        return;
    }

    const list = document.createElement("div");
    list.className = "cart-lines";

    lines.forEach((line) =>
    {
        list.appendChild(createCartLine(line));
    });

    bodyElement.replaceChildren(list);

    if (summaryElement !== null)
    {
        summaryElement.replaceChildren(createSubtotalRow(lines));
    }

    renderBulkActions(lines);

    if (sendButton !== null)
    {
        sendButton.disabled = false;
    }
}

function createCartLine(line)
{
    const row = document.createElement("div");
    row.className = "cart-line";
    row.dataset.lineKey = line.key;

    const candidates = [line.product.imageUrl, ...(line.product.imageFallbacks ?? [])];
    const image = createImageWithFallbacks(candidates, "cart-line__image", "", () =>
    {
        image.replaceWith(createCartThumbPlaceholder());
    });

    if (image === null)
    {
        row.appendChild(createCartThumbPlaceholder());
    }
    else
    {
        row.appendChild(image);
    }

    const select = document.createElement("input");
    select.type = "checkbox";
    select.className = "cart-line__select";
    select.checked = selectedKeys.has(line.key);
    select.setAttribute("aria-label", translate("selectLine", { name: line.product.name }));
    select.addEventListener("change", () =>
    {
        if (select.checked)
        {
            selectedKeys.add(line.key);
        }
        else
        {
            selectedKeys.delete(line.key);
        }

        renderBulkActions(getCartLines());
    });
    row.appendChild(select);

    const info = document.createElement("div");
    info.className = "cart-line__info";

    const name = document.createElement("p");
    name.className = "cart-line__name";
    setTextWithHighlight(name, line.product.name, HIGHLIGHT_WORD, HIGHLIGHT_CLASS);
    info.appendChild(name);

    if (line.mods.length > 0)
    {
        const mods = document.createElement("p");
        mods.className = "cart-line__mods";

        line.mods.forEach((mod) =>
        {
            const modLine = document.createElement("span");
            modLine.className = "cart-line__mod";
            const modLabel = mod.price === "" ? `${mod.slot}: ${mod.name}` : `${mod.slot}: ${mod.name} (+${formatPrice(mod.price)})`;

            setTextWithHighlight(modLine, modLabel, HIGHLIGHT_WORD, HIGHLIGHT_CLASS);
            mods.appendChild(modLine);
        });

        info.appendChild(mods);
    }

    const price = document.createElement("p");
    price.className = "cart-line__price";
    const modsPriceText = line.modsPrice === null || line.modsPrice === 0 ? "" : ` + ${formatPrice(String(line.modsPrice))}`;
    const quantityText = line.quantity > 1 && line.lineTotal !== null ? ` × ${line.quantity} = ${formatPrice(String(line.lineTotal))}` : "";
    price.textContent = `${formatPrice(line.product.price)}${modsPriceText}${quantityText}`;
    info.appendChild(price);

    row.appendChild(info);

    const quantity = document.createElement("div");
    quantity.className = "card__quantity";

    const decreaseButton = createQuantityButton("−", translate("decreaseQuantity"));
    decreaseButton.disabled = line.quantity <= 1;
    decreaseButton.addEventListener("click", () =>
    {
        setLineQuantity(line.key, line.quantity - 1);
        syncCartUi();
    });

    const input = document.createElement("input");
    input.type = "number";
    input.className = "card__quantity-input";
    input.min = "1";
    input.max = String(line.maxQuantity);
    input.value = String(line.quantity);
    input.setAttribute("aria-label", translate("quantityLabel"));
    input.addEventListener("change", () =>
    {
        const newQuantity = Math.max(1, Math.min(parseInt(input.value, 10) || 1, line.maxQuantity));
        setLineQuantity(line.key, newQuantity);
        syncCartUi();
    });
    input.addEventListener("blur", () =>
    {
        const newQuantity = Math.max(1, Math.min(parseInt(input.value, 10) || 1, line.maxQuantity));
        if (newQuantity !== line.quantity)
        {
            setLineQuantity(line.key, newQuantity);
            syncCartUi();
        }
        else
        {
            input.value = String(line.quantity);
        }
    });

    const value = document.createElement("output");
    value.className = "card__quantity-value";
    value.textContent = String(line.quantity);
    value.style.display = "none";

    const increaseButton = createQuantityButton("+", translate("increaseQuantity"));
    increaseButton.disabled = line.quantity >= line.maxQuantity;
    increaseButton.addEventListener("click", () =>
    {
        setLineQuantity(line.key, line.quantity + 1);
        syncCartUi();
    });

    quantity.appendChild(decreaseButton);
    quantity.appendChild(input);
    quantity.appendChild(value);
    quantity.appendChild(increaseButton);
    row.appendChild(quantity);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "cart-line__remove";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `${translate("removeLine")}: ${line.product.name}`);
    removeButton.addEventListener("click", () =>
    {
        removeLine(line.key);
        syncCartUi();
    });
    row.appendChild(removeButton);

    return row;
}

function buildTotalLabel(subtotal)
{
    if (subtotal.complete)
    {
        return formatPrice(subtotal.value.toFixed(2));
    }

    if (subtotal.value === null || subtotal.value === 0)
    {
        return translate("subtotalUnavailable");
    }

    return translate("subtotalPartial", { amount: formatPrice(subtotal.value.toFixed(2)), count: String(subtotal.unknownCount) });
}

function renderOrderCopiedMessage(statusElement)
{
    const parts = translate("orderCopied").split("{discord}");
    const children = [document.createTextNode(parts[0])];
    const inviteUrl = toSafeLinkUrl(DISCORD_INVITE_URL);

    if (inviteUrl !== null)
    {
        const link = document.createElement("a");
        link.className = "cart-dialog__link";
        link.href = inviteUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = translate("discordLabel");
        children.push(link);
    }
    else
    {
        children.push(document.createTextNode(translate("discordLabel")));
    }

    parts.slice(1).forEach((part, index) =>
    {
        children.push(document.createTextNode(index === 0 ? part : `${translate("discordLabel")}${part}`));
    });

    statusElement.replaceChildren(...children);
}

function toSafeLinkUrl(rawUrl)
{
    try
    {
        const parsedUrl = new URL(rawUrl);

        return parsedUrl.protocol === "https:" ? parsedUrl.href : null;
    }
    catch (error)
    {
        return null;
    }
}

function renderBulkActions(lines)
{
    const bulkElement = document.getElementById("cart-bulk");

    if (bulkElement === null)
    {
        return;
    }

    const existingKeys = new Set(lines.map((line) => line.key));
    [...selectedKeys].forEach((key) =>
    {
        if (existingKeys.has(key) === false)
        {
            selectedKeys.delete(key);
        }
    });

    if (lines.length === 0)
    {
        bulkElement.hidden = true;
        bulkElement.replaceChildren();
        return;
    }

    const selectAll = document.createElement("input");
    selectAll.type = "checkbox";
    selectAll.className = "cart-bulk__select-all";
    selectAll.checked = selectedKeys.size > 0 && selectedKeys.size === lines.length;
    selectAll.indeterminate = selectedKeys.size > 0 && selectedKeys.size < lines.length;
    selectAll.setAttribute("aria-label", translate("selectAll"));
    selectAll.addEventListener("change", () =>
    {
        if (selectAll.checked)
        {
            getCartLines().forEach((line) => selectedKeys.add(line.key));
        }
        else
        {
            selectedKeys.clear();
        }

        renderCartBody();
    });

    const selectAllLabel = document.createElement("label");
    selectAllLabel.className = "cart-bulk__label";
    selectAllLabel.appendChild(selectAll);

    const labelText = document.createElement("span");
    labelText.textContent = translate("selectAll");
    selectAllLabel.appendChild(labelText);

    const children = [selectAllLabel];

    if (selectedKeys.size > 0)
    {
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "cart-bulk__remove";
        removeButton.textContent = translate("removeSelected", { count: String(selectedKeys.size) });
        removeButton.addEventListener("click", () =>
        {
            const keysToRemove = [...selectedKeys];
            selectedKeys.clear();

            keysToRemove.forEach((key) =>
            {
                removeLine(key);
            });

            syncCartUi();
        });

        children.push(removeButton);
    }

    bulkElement.hidden = false;
    bulkElement.replaceChildren(...children);
}

function createCartThumbPlaceholder()
{
    const placeholder = document.createElement("span");
    placeholder.className = "cart-line__image-placeholder";

    return placeholder;
}

function createQuantityButton(label, ariaLabel)
{
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card__step";
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);

    return button;
}

function createSubtotalRow(lines)
{
    const subtotal = getSubtotal();
    const row = document.createElement("p");
    row.className = "cart-subtotal";

    const label = document.createElement("span");
    label.textContent = translate("subtotalLabel");

    const value = document.createElement("strong");
    value.textContent = buildTotalLabel(subtotal);

    row.appendChild(label);
    row.appendChild(value);

    if (subtotal.complete === false && lines.length > 0)
    {
        row.classList.add("cart-subtotal--partial");
    }

    return row;
}

async function handleCopyOrder()
{
    if (getCartLines().length === 0)
    {
        return;
    }

    const statusElement = document.getElementById("cart-status");
    const discordNameInput = document.getElementById("cart-discord-name");
    const noteInput = document.getElementById("cart-note");

    const payload = buildOrderPayload({
        discordName: discordNameInput?.value ?? "",
        note: noteInput?.value ?? ""
    });

    const result = await copyOrder(payload);

    if (statusElement !== null)
    {
        statusElement.classList.toggle("cart-dialog__status--error", result.copied === false);

        if (result.copied)
        {
            renderOrderCopiedMessage(statusElement);
        }
        else
        {
            statusElement.textContent = translate("orderFailed");
        }
    }
}
