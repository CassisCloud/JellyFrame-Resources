(function() {
    'use strict';

    const restructureMenu = () => {
        const customMenu = document.querySelector('.customMenuOptions');
        const homeLink = document.querySelector('.mainDrawer-scrollContainer > a[href="#/home"]');
        const scrollContainer = document.querySelector('.mainDrawer-scrollContainer');

        if (customMenu) {
            if (!customMenu.querySelector('.sidebarHeader')) {
                const header = document.createElement('h3');
                header.className = 'sidebarHeader';
                header.textContent = 'General';
                customMenu.appendChild(header);
            }
            
            if (homeLink) {
                customMenu.appendChild(homeLink);
            }
        }

        if (scrollContainer && !document.querySelector('.btnCloseMenuContainer')) {
            const closeContainer = document.createElement('div');
            closeContainer.className = 'btnCloseMenuContainer';
            closeContainer.style.display = 'flex';
            closeContainer.style.justifyContent = 'flex-end';
            closeContainer.style.padding = '8px 16px 0 0';

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.setAttribute('is', 'paper-icon-button-light');
            closeBtn.className = 'headerButton mainDrawerButton barsMenuButton headerButtonLeft paper-icon-button-light btnCloseMenu'; 
            closeBtn.title = 'Close Menu';
            
            closeBtn.innerHTML = '<span class="material-icons" aria-hidden="true">close</span>';
            
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); 
                
                const backdrop = document.querySelector('.mainDrawer-backdrop, .drawer-backdrop');
                if (backdrop) {
                    backdrop.click();
                    return;
                }
                
                const menuToggle = document.querySelector('.btnApplicationMenu, .btnHeaderMenu, .mainDrawerButton:not(.btnCloseMenu)');
                if (menuToggle) {
                    menuToggle.click();
                }
            });
            
            closeContainer.appendChild(closeBtn);
            
            scrollContainer.insertBefore(closeContainer, scrollContainer.firstChild);
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

    // Observe the body for added elements
    observer.observe(document.body, { childList: true, subtree: true });
})();
