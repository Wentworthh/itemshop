import { setupModsDialog } from "./dialog.js";
import { loadCart, onCartChange } from "./cart.js";
import { openCartDialog, setupCartDialog, syncCartUi } from "./cart-dialog.js";
import { loadModsData } from "./mods.js";
import { loadProducts } from "./products.js";
import { refreshView } from "./view.js";
import { state } from "./state.js";

const SCROLL_THRESHOLD = 400;

async function init()
{
    setupBackToTop();
    setupModsDialog();
    setupCartDialog();
    onCartChange(() =>
    {
        syncCartUi();
    });

    document.getElementById("cart-button")?.addEventListener("click", () =>
    {
        openCartDialog();
    });

    syncCartUi();

    await loadModsData();
    await loadProductsIntoState();
}

async function loadProductsIntoState()
{
    try
    {
        const products = await loadProducts();

        if (products.length === 0)
        {
            state.products = [];
            state.statusKey = "statusEmpty";
            refreshView();
            return;
        }

        state.hiddenIds = new Set(products.filter((product) => product.isHidden).map((product) => product.id));
        state.products = products.filter((product) => product.isHidden === false);
        state.statusKey = "ready";
        loadCart();
        refreshView();
    }
    catch (error)
    {
        state.products = [];
        state.statusKey = "statusError";
        refreshView();
        console.error("CSV loading failed:", error);
    }
}

function setupBackToTop()
{
    const button = document.getElementById("back-to-top");

    if (button === null)
    {
        return;
    }

    window.addEventListener("scroll", () =>
    {
        button.hidden = window.scrollY < SCROLL_THRESHOLD;
    });

    button.addEventListener("click", () =>
    {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

init();
