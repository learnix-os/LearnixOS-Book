document.addEventListener("DOMContentLoaded", () => {
    // Select all Rust code blocks
    document.querySelectorAll('code.language-rust').forEach(codeBlock => {
        // Walk through text nodes in the code block
        const walker = document.createTreeWalker(codeBlock, NodeFilter.SHOW_TEXT, null);

        const macroRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)!/g; // Matches words ending with !
        const nodesToProcess = [];

        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (macroRegex.test(node.textContent)) {
                nodesToProcess.push(node);
            }
        }

        nodesToProcess.forEach(node => {
            const parent = node.parentNode;
            const frag = document.createDocumentFragment();

            let lastIndex = 0;
            macroRegex.lastIndex = 0;

            let match;
            while ((match = macroRegex.exec(node.textContent)) !== null) {
                // Text before macro
                const before = node.textContent.slice(lastIndex, match.index);
                if (before.length > 0) {
                    frag.appendChild(document.createTextNode(before));
                }
                // Macro text
                const macroSpan = document.createElement('span');
                macroSpan.textContent = match[0];
                macroSpan.style.color = '#d19a66';  // or add a CSS class here
                frag.appendChild(macroSpan);

                lastIndex = macroRegex.lastIndex;
            }
            // Remaining text after last macro
            const after = node.textContent.slice(lastIndex);
            if (after.length > 0) {
                frag.appendChild(document.createTextNode(after));
            }

            parent.replaceChild(frag, node);
        });
    });
});
