const TRANSLATIONS =
{
    loading: "Loading items...",
    statusEmpty: "The sheet has no items to show.",
    statusError: "Could not load the items right now. Please try again later.",
    priceLabel: "Price",
    quantityLabel: "Quantity",
    soldOutAria: "{name}: not available",
    statusAvailable: "Available",
    statusSoldOut: "Sold out",
    statusFeatured: "Featured",
    imagePlaceholder: "Image not available",
    filtersLabel: "Filters",
    categoryLabel: "Category",
    categoryAll: "All",
    categoryNone: "Uncategorized",
    statusFilterLabel: "Availability",
    statusFilterAll: "All",
    searchLabel: "Search",
    searchPlaceholder: "Search items...",
    filterEmpty: "No items match these filters.",
    statusNothingAvailable: "No items are available right now. Check back soon.",
    backButton: "Back",
    addButton: "Add",
    addAria: "Add {name} to cart",
    decreaseQuantity: "Decrease quantity",
    increaseQuantity: "Increase quantity",
    cartButton: "Cart",
    cartAria: "Open cart ({count})",
    cartEmpty: "Your cart is empty.",
    cartItemsLabel: "{count} in cart",
    selectAll: "Select all",
    selectLine: "Select {name}",
    removeSelected: "Remove selected ({count})",
    removeLine: "Remove",
    subtotalLabel: "Total",
    subtotalUnavailable: "n/a",
    subtotalPartial: "{amount} ({count} unpriced)",
    copyOrderButton: "Copy order",
    orderCopied: "Order copied: join our {discord} and create a ticket to submit your order.",
    discordLabel: "Discord",
    orderFailed: "Could not copy the order. Select the text and copy it manually.",
    customizeButton: "Customize",
    customizeAria: "Customize {name}",
    customizeTitle: "Customize {name}",
    closeLabel: "Close",
    modsEmpty: "No attachments available for this weapon.",
    customizeSubtotal: "Total per unit",
    stockLabel: "{count} in stock",
    priceEach: "{price} each",
    outOfStock: "Out of stock",
    backToTop: "Back to top"
};

export function translate(key, params)
{
    const template = TRANSLATIONS[key] ?? "";

    if (params === undefined)
    {
        return template;
    }

    return Object.keys(params).reduce(
        (result, paramKey) => result.replaceAll(`{${paramKey}}`, params[paramKey]),
        template
    );
}