import { addToCart } from "./cart.js";
import { CUSTOMIZE_CATEGORY, HIGHLIGHT_CLASS, HIGHLIGHT_WORD } from "./config.js";
import { setTextWithHighlight } from "./highlight.js";
import { normalizeText } from "./csv.js";
import { openModsDialog } from "./dialog.js";
import { translate } from "./i18n.js";
import { hasMods } from "./mods.js";
import { formatPrice } from "./money.js";
import { createImageWithFallbacks } from "./images.js";

export function createProductCard(product)
{
    const card = document.createElement("article");
    card.className = "card";

    if (product.isSoldOut)
    {
        card.classList.add("card--sold-out");
    }

    if (product.id !== "")
    {
        card.dataset.productId = product.id;
    }

    card.appendChild(createCardImage(product));
    card.appendChild(createCardBody(product));

    return card;
}

function createCardImage(product)
{
    const wrapper = document.createElement("div");
    wrapper.className = "card__image-wrapper";

    const candidates = [product.imageUrl, ...(product.imageFallbacks ?? [])];
    const image = createImageWithFallbacks(candidates, "card__image", product.name, () =>
    {
        image.replaceWith(createImagePlaceholder());
    });

    if (image === null)
    {
        wrapper.appendChild(createImagePlaceholder());
        return wrapper;
    }

    wrapper.appendChild(image);

    return wrapper;
}

function createImagePlaceholder()
{
    const placeholder = document.createElement("span");
    placeholder.className = "card__image-placeholder";
    placeholder.textContent = translate("imagePlaceholder");

    return placeholder;
}

function createCardBody(product)
{
    const body = document.createElement("div");
    body.className = "card__body";

    if (product.isFeatured)
    {
        const featuredBadge = document.createElement("p");
        featuredBadge.className = "card__featured";
        featuredBadge.textContent = translate("statusFeatured");
        body.appendChild(featuredBadge);
    }

    const title = document.createElement("h2");
    title.className = "card__title";
    setTextWithHighlight(title, product.name, HIGHLIGHT_WORD, HIGHLIGHT_CLASS);
    body.appendChild(title);

    const meta = document.createElement("dl");
    meta.className = "card__meta";
    meta.appendChild(createMetaRow(translate("priceLabel"), formatPrice(product.price)));
    meta.appendChild(createMetaRow(translate("quantityLabel"), String(product.quantity)));
    body.appendChild(meta);

    body.appendChild(createStatusBadge(product));

    const actions = document.createElement("div");
    actions.className = "card__actions";
    const quantityState = { value: 1 };

    actions.appendChild(createQuantityControl(product, quantityState));
    actions.appendChild(createAddButton(product, quantityState));

    if (isCustomizable(product) && hasMods(product))
    {
        actions.appendChild(createCustomizeButton(product, quantityState));
    }

    body.appendChild(actions);

    return body;
}

function createStatusBadge(product)
{
    const status = document.createElement("p");
    status.className = "card__status";
    status.textContent = getStatusLabel(product);

    if (product.isSoldOut)
    {
        status.classList.add("card__status--sold-out");
    }
    else
    {
        status.classList.add("card__status--available");
    }

    return status;
}

function createMetaRow(label, value)
{
    const row = document.createElement("div");
    row.className = "card__meta-row";

    const labelElement = document.createElement("dt");
    labelElement.className = "card__meta-label";
    labelElement.textContent = label;

    const valueElement = document.createElement("dd");
    valueElement.className = "card__meta-value";
    valueElement.textContent = value;

    row.appendChild(labelElement);
    row.appendChild(valueElement);

    return row;
}

function createQuantityControl(product, quantityState)
{
    const wrapper = document.createElement("div");
    wrapper.className = "card__quantity";

    const maxQuantity = Math.max(product.quantity, 0);
    const decreaseButton = createStepButton("−", translate("decreaseQuantity"));
    const increaseButton = createStepButton("+", translate("increaseQuantity"));

    const input = document.createElement("input");
    input.type = "number";
    input.className = "card__quantity-value";
    input.min = "1";
    input.max = String(maxQuantity);
    input.value = String(quantityState.value);
    input.setAttribute("aria-label", translate("quantityLabel"));

    const sync = () =>
    {
        input.value = String(quantityState.value);
        decreaseButton.disabled = product.isSoldOut || quantityState.value <= 1;
        increaseButton.disabled = product.isSoldOut || quantityState.value >= maxQuantity;
    };

    decreaseButton.addEventListener("click", () =>
    {
        quantityState.value = Math.max(quantityState.value - 1, 1);
        sync();
    });

    increaseButton.addEventListener("click", () =>
    {
        quantityState.value = Math.min(quantityState.value + 1, maxQuantity);
        sync();
    });

    input.addEventListener("change", () =>
    {
        const newValue = Math.max(1, Math.min(parseInt(input.value, 10) || 1, maxQuantity));
        quantityState.value = newValue;
        sync();
    });

    input.addEventListener("blur", () =>
    {
        const newValue = Math.max(1, Math.min(parseInt(input.value, 10) || 1, maxQuantity));
        quantityState.value = newValue;
        sync();
    });

    input.addEventListener("keydown", (event) =>
    {
        if (event.key === "ArrowUp" || event.key === "ArrowDown")
        {
            event.preventDefault();
            if (event.key === "ArrowUp")
            {
                quantityState.value = Math.min(quantityState.value + 1, maxQuantity);
            }
            else
            {
                quantityState.value = Math.max(quantityState.value - 1, 1);
            }
            sync();
        }
    });

    wrapper.appendChild(decreaseButton);
    wrapper.appendChild(input);
    wrapper.appendChild(increaseButton);
    sync();

    return wrapper;
}

function createStepButton(label, ariaLabel)
{
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card__step";
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);

    return button;
}

function createAddButton(product, quantityState)
{
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card__button";
    button.textContent = translate("addButton");
    button.disabled = product.isSoldOut;

    if (product.isSoldOut)
    {
        button.setAttribute("aria-label", translate("soldOutAria", { name: product.name }));
        return button;
    }

    button.setAttribute("aria-label", translate("addAria", { name: product.name }));
    button.addEventListener("click", () =>
    {
        addToCart(product, quantityState.value);
    });

    return button;
}

function createCustomizeButton(product, quantityState)
{
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card__button card__button--secondary";
    button.textContent = translate("customizeButton");
    button.setAttribute("aria-label", translate("customizeAria", { name: product.name }));
    button.addEventListener("click", () =>
    {
        openModsDialog(product, quantityState.value);
    });

    return button;
}

function isCustomizable(product)
{
    return normalizeText(product.category) === CUSTOMIZE_CATEGORY;
}

function getStatusLabel(product)
{
    if (product.isSoldOut)
    {
        return translate("statusSoldOut");
    }

    if (product.status === "")
    {
        return translate("statusAvailable");
    }

    const normalizedStatus = normalizeText(product.status);

    if (normalizedStatus.includes("disponibil") || normalizedStatus.includes("available") || normalizedStatus.includes("in stock"))
    {
        return translate("statusAvailable");
    }

    return product.status;
}
