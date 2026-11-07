import { CATEGORY_ORDER, FILTER_FEATURED, STATUS_FILTERS } from "./config.js";
import { normalizeText } from "./csv.js";
import { translate } from "./i18n.js";
import { state } from "./state.js";

export function renderFilterControls(onChange)
{
    const filtersElement = document.getElementById("filters");

    if (filtersElement === null)
    {
        return;
    }

    const categories = getCategories();
    const children = [];

    if (categories.length >= 2)
    {
        children.push(createCategoryFilter(categories, onChange));
    }
    else
    {
        state.categoryFilter = "all";
    }

    children.push(createStatusFilter(onChange));
    children.push(createSearchFilter(onChange));

    filtersElement.hidden = false;
    filtersElement.setAttribute("aria-label", translate("filtersLabel"));
    filtersElement.replaceChildren(...children);
}

export function clearFilterControls()
{
    const filtersElement = document.getElementById("filters");

    if (filtersElement === null)
    {
        return;
    }

    filtersElement.replaceChildren();
    filtersElement.hidden = true;
}

function getCategories()
{
    const categories = new Set();

    state.products.forEach((product) =>
    {
        categories.add(product.category);
    });

    const hasUncategorized = categories.has("");
    const known = [...categories].filter((category) => category !== "" && CATEGORY_ORDER.includes(normalizeText(category)));
    const unknown = [...categories].filter((category) => category !== "" && CATEGORY_ORDER.includes(normalizeText(category)) === false);

    known.sort((left, right) => CATEGORY_ORDER.indexOf(normalizeText(left)) - CATEGORY_ORDER.indexOf(normalizeText(right)));
    unknown.sort((left, right) => left.localeCompare(right, "en"));

    const ordered = [...known, ...unknown];

    return hasUncategorized ? [...ordered, ""] : ordered;
}

function getStatusFilterLabel(filterValue)
{
    if (filterValue === "available")
    {
        return translate("statusAvailable");
    }

    if (filterValue === "soldout")
    {
        return translate("statusSoldOut");
    }

    if (filterValue === "featured")
    {
        return translate("statusFeatured");
    }

    return translate("statusFilterAll");
}

function createCategoryFilter(categories, onChange)
{
    const group = document.createElement("div");
    group.className = "filters__group";

    const label = document.createElement("label");
    label.className = "filters__label";
    label.htmlFor = "category-filter";
    label.textContent = translate("categoryLabel");

    const select = document.createElement("select");
    select.id = "category-filter";
    select.className = "filters__select";
    select.appendChild(createOption(FILTER_FEATURED, translate("statusFeatured"), categoryColourClass("featured")));

    categories.filter((category) => category !== "").forEach((category) =>
    {
        select.appendChild(createOption(category, category, categoryColourClass(normalizeText(category))));
    });

    if (categories.includes(""))
    {
        select.appendChild(createOption("", translate("categoryNone")));
    }

    select.appendChild(createOption("all", translate("categoryAll")));

    const hasCurrentCategory = [...select.options].some((option) => option.value === state.categoryFilter);
    state.categoryFilter = hasCurrentCategory ? state.categoryFilter : "all";
    select.value = state.categoryFilter;

    select.addEventListener("change", () =>
    {
        state.categoryFilter = select.value;
        onChange();
    });

    group.appendChild(label);
    group.appendChild(select);

    return group;
}

function createStatusFilter(onChange)
{
    const group = document.createElement("div");
    group.className = "filters__group";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", translate("statusFilterLabel"));

    STATUS_FILTERS.forEach((filterValue) =>
    {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `filters__chip filters__chip--${filterValue}`;
        chip.dataset.statusFilter = filterValue;
        chip.textContent = getStatusFilterLabel(filterValue);
        chip.setAttribute("aria-pressed", String(state.statusFilter === filterValue));
        chip.classList.toggle("filters__chip--active", state.statusFilter === filterValue);

        chip.addEventListener("click", () =>
        {
            state.statusFilter = filterValue;

            group.querySelectorAll("[data-status-filter]").forEach((otherChip) =>
            {
                const isActive = otherChip.dataset.statusFilter === filterValue;
                otherChip.setAttribute("aria-pressed", String(isActive));
                otherChip.classList.toggle("filters__chip--active", isActive);
            });

            onChange();
        });

        group.appendChild(chip);
    });

    return group;
}

function createSearchFilter(onChange)
{
    const group = document.createElement("div");
    group.className = "filters__group filters__group--search";

    const label = document.createElement("label");
    label.className = "filters__label";
    label.htmlFor = "product-search";
    label.textContent = translate("searchLabel");

    const input = document.createElement("input");
    input.id = "product-search";
    input.type = "search";
    input.className = "filters__search";
    input.placeholder = translate("searchPlaceholder");
    input.value = state.searchQuery;
    input.autocomplete = "off";

    input.addEventListener("input", () =>
    {
        state.searchQuery = input.value;
        onChange();
    });

    group.appendChild(label);
    group.appendChild(input);

    return group;
}

function categoryColourClass(categoryKey)
{
    return `category-option--${categoryKey}`;
}

function createOption(value, text, colourClass)
{
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;

    if (colourClass !== undefined)
    {
        option.className = colourClass;
    }

    return option;
}
