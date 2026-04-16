(function() {
    'use strict';

    function meowify(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.nodeValue;
            
            if (text.trim() !== '') {
                node.nodeValue = text.replace(/[a-zA-Z]+/g, (match) => {
                    if (match === match.toUpperCase() && match.length > 1) return 'MEOW';
                    if (match[0] === match[0].toUpperCase()) return 'Meow';
                    return 'meow';
                });
            }
        } 
        else if (node.nodeType === Node.ELEMENT_NODE) {
            let tag = node.tagName.toLowerCase();
            
            if (['script', 'style', 'input', 'textarea', 'noscript', 'code', 'svg', 'canvas'].includes(tag)) {
                return;
            }
            
            if (node.classList && typeof node.className === 'string') {
                const classString = node.className.toLowerCase();
                if (classString.includes('icon') || classString.includes('material-icons')) {
                    return;
                }
            }

            for (let child of node.childNodes) {
                meowify(child);
            }
        }
    }

    const isJellyfin = document.querySelector('meta[content="Jellyfin"]') || 
                       document.body.classList.contains('jellyfin-body') || 
                       document.title.toLowerCase().includes('jellyfin');

    meowify(document.body);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                meowify(node);
            });
        });
    });

    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });

})();
