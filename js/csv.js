import { COLUMN_ALIASES } from "./config.js";

export function parseCsv(text)
{
    const rows = [];
    let currentRow = [];
    let currentField = "";
    let insideQuotes = false;

    for (let index = 0; index < text.length; index += 1)
    {
        const character = text[index];

        if (insideQuotes)
        {
            if (character === "\"")
            {
                if (text[index + 1] === "\"")
                {
                    currentField += "\"";
                    index += 1;
                }
                else
                {
                    insideQuotes = false;
                }
            }
            else
            {
                currentField += character;
            }

            continue;
        }

        if (character === "\"")
        {
            insideQuotes = true;
        }
        else if (character === ",")
        {
            currentRow.push(currentField);
            currentField = "";
        }
        else if (character === "\n")
        {
            currentRow.push(currentField);
            currentField = "";
            rows.push(currentRow);
            currentRow = [];
        }
        else if (character !== "\r")
        {
            currentField += character;
        }
    }

    if (currentField !== "" || currentRow.length > 0)
    {
        currentRow.push(currentField);
        rows.push(currentRow);
    }

    return rows;
}

export function normalizeText(value)
{
    return String(value ?? "")
        .replace(/^\uFEFF/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

export function buildColumnIndex(headerRow)
{
    const normalizedHeaders = headerRow.map(normalizeText);
    const columnIndex = {};

    Object.keys(COLUMN_ALIASES).forEach((key) =>
    {
        const aliases = COLUMN_ALIASES[key];
        columnIndex[key] = normalizedHeaders.findIndex((header) => aliases.includes(header));
    });

    return columnIndex;
}
