export function setTextWithHighlight(container, text, word, className)
{
    container.replaceChildren();

    if (text === null || text === undefined || text === "")
    {
        return container;
    }

    if (word === null || word === undefined || word === "")
    {
        container.appendChild(document.createTextNode(String(text)));
        return container;
    }

    const source = String(text);
    const lowerSource = source.toLowerCase();
    const lowerWord = word.toLowerCase();
    let cursor = 0;
    let matchIndex = lowerSource.indexOf(lowerWord);

    while (matchIndex !== -1)
    {
        if (matchIndex > cursor)
        {
            container.appendChild(document.createTextNode(source.slice(cursor, matchIndex)));
        }

        const highlighted = document.createElement("span");
        highlighted.className = className;
        highlighted.textContent = source.slice(matchIndex, matchIndex + lowerWord.length);
        container.appendChild(highlighted);

        cursor = matchIndex + lowerWord.length;
        matchIndex = lowerSource.indexOf(lowerWord, cursor);
    }

    if (cursor < source.length)
    {
        container.appendChild(document.createTextNode(source.slice(cursor)));
    }

    return container;
}