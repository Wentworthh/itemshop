import { toSafeImageUrl } from "./products.js";

export function createImageWithFallbacks(candidates, className, alt, onExhausted)
{
    const safeCandidates = candidates
        .map((candidate) => toSafeImageUrl(candidate))
        .filter((url) => url !== null);

    if (safeCandidates.length === 0)
    {
        return null;
    }

    const image = document.createElement("img");
    image.className = className;
    image.alt = alt;
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";

    let candidateIndex = 0;

    image.addEventListener("error", () =>
    {
        candidateIndex += 1;

        if (candidateIndex < safeCandidates.length)
        {
            image.src = safeCandidates[candidateIndex];
            return;
        }

        if (typeof onExhausted === "function")
        {
            onExhausted();
        }
    });

    image.src = safeCandidates[0];

    return image;
}
