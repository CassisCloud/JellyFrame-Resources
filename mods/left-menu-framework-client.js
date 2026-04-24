(function() {
    'use strict';

    const restructureMenu = () => {
        const customMenu = document.querySelector('.customMenuOptions');
        const homeLink = document.querySelector('.mainDrawer-scrollContainer > a[href="#/home"]');

        if (customMenu && homeLink) {
            if (!customMenu.querySelector('.sidebarHeader')) {
                const header = document.createElement('h3');
                header.className = 'sidebarHeader';
                header.textContent = 'General';
                customMenu.appendChild(header);
            }
            
            customMenu.appendChild(homeLink);
        }
    };

    restructureMenu();

    const observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            const addedNodes = mutations[i].addedNodes;
            
            for (let j = 0; j < addedNodes.length; j++) {
                const node = addedNodes[j];
                
                if (node.nodeType === 1) { 
                    if (node.classList.contains('mainDrawer-scrollContainer') || 
                        node.classList.contains('customMenuOptions') || 
                        node.querySelector('.customMenuOptions')) {
                        
                        restructureMenu();
                        return;
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
