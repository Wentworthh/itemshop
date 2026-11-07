import { createProductCard } from "./cards.js";
import { FILTER_FEATURED } from "./config.js";
import { normalizeText } from "./csv.js";
import { clearFilterControls, renderFilterControls } from "./filters.js";
import { translate } from "./i18n.js";
import { state } from "./state.js";

export function refreshView()
{
    if (state.statusKey !== "ready")
    {
        clearFilterControls();
        showMessage(state.statusKey);
        return;
    }

    renderFilterControls(renderFilteredProducts);
    renderFilteredProducts();
}

function getVisibleProducts()
{
    return state.products.filter((product) => matchesCategoryFilter(product) && matchesStatusFilter(product) && matchesSearchFilter(product));
}

function matchesCategoryFilter(product)
{
    if (state.categoryFilter === "all")
    {
        return true;
    }

    if (state.categoryFilter === FILTER_FEATURED)
    {
        return product.isFeatured === true;
    }

    return product.category === state.categoryFilter;
}

function matchesSearchFilter(product)
{
    const query = normalizeText(state.searchQuery);

    if (query === "")
    {
        return true;
    }

    return normalizeText(product.name).includes(query);
}

function matchesStatusFilter(product)
{
    if (state.statusFilter === "available")
    {
        return product.isSoldOut === false;
    }

    if (state.statusFilter === "soldout")
    {
        return product.isSoldOut === true;
    }

    if (state.statusFilter === "featured")
    {
        return product.isFeatured === true;
    }

    return true;
}

function renderFilteredProducts()
{
    const products = getVisibleProducts();

    if (products.length === 0)
    {
        const gridElement = document.getElementById("product-grid");

        if (gridElement !== null)
        {
            gridElement.replaceChildren();
        }

        const isPlainEmptyShop = state.statusFilter === "available" && state.searchQuery.trim() === "";
        showMessage(isPlainEmptyShop ? "statusNothingAvailable" : "filterEmpty");
        return;
    }

    hideMessage();
    renderProducts(products);
}

function renderProducts(products)
{
    const gridElement = document.getElementById("product-grid");

    if (gridElement === null)
    {
        return;
    }

    const fragment = document.createDocumentFragment();

    products.forEach((product) =>
    {
        fragment.appendChild(createProductCard(product));
    });

    gridElement.replaceChildren(fragment);
}

function showMessage(messageKey)
{
    const statusElement = document.getElementById("status-message");

    if (statusElement === null)
    {
        return;
    }

    statusElement.textContent = translate(messageKey);
    statusElement.classList.toggle("status-message--error", messageKey === "statusError");
    statusElement.hidden = false;
}

function hideMessage()
{
    const statusElement = document.getElementById("status-message");

    if (statusElement === null)
    {
        return;
    }

    statusElement.hidden = true;
    statusElement.classList.remove("status-message--error");
}
