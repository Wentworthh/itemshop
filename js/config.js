export const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwnmaFg_nKRAKRaCzV5xUKDpQdnkvgqj0-_NhUXTa5mtWM9BGk_S7d67mNGkhiwj6eaU0LA8vJEzsh/pub?output=csv";

export const DISCORD_INVITE_URL = "https://discord.gg/kshaPDWteQ";

export const MODS_DATA_URL = "data/weapon-mods.json";

export const LOCAL_IMAGE_FOLDERS = ["images/items/"];
export const LOCAL_IMAGE_EXTENSION = ".png";

export const CUSTOMIZE_CATEGORY = "weapons";

export const CURRENCY_SYMBOL = "€";
export const CURRENCY_POSITION = "suffix";


export const COLUMN_ALIASES =
{
    id: ["id"],
    name: ["nome", "name"],
    quantity: ["quantita", "quantity", "qta"],
    price: ["prezzo", "price"],
    imageUrl: ["url immagine", "immagine", "image", "image url", "url"],
    status: ["stato", "status"],
    category: ["categoria", "category", "tipo", "type"],
    featured: ["in evidenza", "evidenza", "featured", "highlight"],
    hidden: ["nascosto", "nascondi", "hidden", "hide"]
};

export const REQUIRED_COLUMNS = ["name", "quantity"];

export const STATUS_FILTERS = ["featured", "available", "soldout", "all"];

export const FILTER_FEATURED = "__featured";

export const CATEGORY_ORDER = ["blueprints", "weapons", "consumables", "materials", "attachments", "gear", "collectibles"];

export const HIGHLIGHT_WORD = "Blueprint";
export const HIGHLIGHT_CLASS = "text-blueprint";
