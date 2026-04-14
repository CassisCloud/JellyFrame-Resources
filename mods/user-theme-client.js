(function() {
    'use strict';

    var API_BASE = '/JellyFrame/mods/user-theme/api';
    var THEMES = [];
    var CURRENT_THEME = '';
    var HAS_LOADED = false;

    // Load user selection and themes catalogue
    function initializeThemeSystem() {
        if (!window.ApiClient || !window.ApiClient.getCurrentUserId()) {
            setTimeout(initializeThemeSystem, 1000);
            return;
        }

        var userId = window.ApiClient.getCurrentUserId();

        // Fetch Themes
        fetch(API_BASE + '/themes')
            .then(function(r) { return r.json(); })
            .then(function(themes) {
                THEMES = themes;
                
                // Fetch user selection
                fetch(API_BASE + '/selection/' + userId)
                    .then(function(r) { return r.json(); })
                    .then(function(sel) {
                        CURRENT_THEME = sel.theme || '';
                        applyThemeCss(CURRENT_THEME);
                        HAS_LOADED = true;
                        injectSettingsButton();
                    });
            })
            .catch(function(e) {
                console.error('[UserTheme] Failed to initialize:', e);
            });
    }

    // Apply the CSS dynamically and remove/disable the server theme
    function applyThemeCss(themeId) {
        var serverTheme = document.querySelector('link[data-jellyframe-theme="1"]');
        var customLink = document.getElementById('jf-user-custom-theme-link');

        if (!themeId) {
            // Restore server default if no personal theme is selected
            if (serverTheme) serverTheme.disabled = false;
            if (customLink) customLink.disabled = true;
            return;
        }

        // Find the selected theme
        var themeObj = null;
        for (var i = 0; i < THEMES.length; i++) {
            if (THEMES[i].id === themeId) {
                themeObj = THEMES[i];
                break;
            }
        }

        if (!themeObj || !themeObj.cssUrl) return;

        // Disable server theme to avoid conflict
        if (serverTheme) serverTheme.disabled = true;

        // Inject new theme link
        if (!customLink) {
            customLink = document.createElement('link');
            customLink.id = 'jf-user-custom-theme-link';
            customLink.rel = 'stylesheet';
            document.head.appendChild(customLink);
        }
        customLink.href = themeObj.cssUrl;
        customLink.disabled = false;
    }

    // Save the new theme and apply immediately
    function saveTheme(themeId) {
        var userId = window.ApiClient.getCurrentUserId();
        fetch(API_BASE + '/selection/' + userId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: themeId })
        }).then(function(r) { return r.json(); }).then(function() {
            CURRENT_THEME = themeId;
            applyThemeCss(themeId);
            
            // Re-render modal to show selection changes
            var m = document.getElementById('jf-theme-picker-modal');
            if (m) m.parentNode.removeChild(m);
        });
    }

    // Create the visual theme card
    function createThemeCard(theme) {
        var card = document.createElement('div');
        var isSelected = CURRENT_THEME === theme.id;
        
        card.style.cssText = 'width:260px; background:#222; border-radius:10px; overflow:hidden; cursor:pointer; border: 3px solid ' + (isSelected ? '#00a4dc' : 'transparent') + '; transition: transform 0.2s, box-shadow 0.2s; position:relative;';
        
        card.onmouseover = function() { 
            card.style.transform = 'translateY(-5px)'; 
            card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.5)';
        };
        card.onmouseout = function() { 
            card.style.transform = 'translateY(0)'; 
            card.style.boxShadow = 'none';
        };

        var img = document.createElement('div');
        img.style.cssText = 'width:100%; height:150px; background-color:#111; background-size:cover; background-position:center;';
        
        if (theme.previewUrl) {
            img.style.backgroundImage = 'url(' + theme.previewUrl + ')';
        } else {
            img.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#555;font-size:12px;text-transform:uppercase;letter-spacing:1px;">No Preview</div>';
        }

        var info = document.createElement('div');
        info.style.cssText = 'padding:15px; color:white; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;';
        
        var titleStr = isSelected ? '<span class="material-icons" style="font-size:16px; color:#00a4dc; vertical-align:middle; margin-right:5px;">check_circle</span>' + theme.name : theme.name;
        
        info.innerHTML = '<div style="font-weight:bold;font-size:16px;margin-bottom:5px;">' + titleStr + '</div><div style="font-size:12px;color:#aaa;">By ' + theme.author + '</div>';

        card.appendChild(img);
        card.appendChild(info);

        card.onclick = function() {
            saveTheme(theme.id);
            var m = document.getElementById('jf-theme-picker-modal');
            if (m) m.style.display = 'none';
        };

        return card;
    }

    // Opens the full-screen modal
    function openThemeModal() {
        var modal = document.getElementById('jf-theme-picker-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'jf-theme-picker-modal';
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif; backdrop-filter:blur(5px); opacity:0; transition: opacity 0.3s;';
            
            modal.onclick = function() { 
                modal.style.opacity = '0';
                setTimeout(function() { modal.style.display = 'none'; }, 300);
            };

            var header = document.createElement('div');
            header.style.cssText = 'width:90%; max-width:1200px; display:flex; justify-content:space-between; align-items:center; color:white; margin-bottom:20px;';
            header.innerHTML = '<h2 style="margin:0; font-weight:normal;">Theme Gallery</h2><button class="material-icons" style="background:transparent; border:none; color:white; font-size:30px; cursor:pointer;" onclick="document.getElementById(\'jf-theme-picker-modal\').style.opacity=\'0\'; setTimeout(function(){ document.getElementById(\'jf-theme-picker-modal\').style.display=\'none\'; }, 300);">close</button>';

            var content = document.createElement('div');
            content.style.cssText = 'background:#1a1a1a;width:90%;max-width:1200px;max-height:80vh;border-radius:12px;padding:30px;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,0.9); display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:25px; justify-items:center; border: 1px solid rgba(255,255,255,0.05);';
            content.onclick = function(e) { e.stopPropagation(); };

            // Custom "Server Default" Card
            content.appendChild(createThemeCard({
                id: '',
                name: 'Server Default',
                author: 'Administrator',
                previewUrl: ''
            }));

            // Generate rest of the catalog
            for (var i = 0; i < THEMES.length; i++) {
                content.appendChild(createThemeCard(THEMES[i]));
            }

            // Scrollbar styling for content
            var style = document.createElement('style');
            style.innerHTML = '#jf-theme-picker-modal > div::-webkit-scrollbar { width: 8px; } #jf-theme-picker-modal > div::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }';
            modal.appendChild(style);

            modal.appendChild(header);
            modal.appendChild(content);
            document.body.appendChild(modal);
        }
        
        modal.style.display = 'flex';
        // Trigger reflow for fade-in
        void modal.offsetWidth;
        modal.style.opacity = '1';
    }

    // Inject the entry button into the user's settings menu
    function injectSettingsButton() {
        if (!HAS_LOADED) return;
        
        var userSection = document.querySelector('#myPreferencesMenuPage .userSection');
        if (!userSection) return;
        
        if (document.getElementById('btn-jf-theme-selector')) return;

        var btn = document.createElement('a');
        btn.id = 'btn-jf-theme-selector';
        btn.className = 'emby-button listItem-border';
        btn.href = '#';
        btn.style.cssText = 'display: block; margin: 0px; padding: 0px;';
        btn.innerHTML = '<div class="listItem"><span class="material-icons listItemIcon listItemIcon-transparent palette" aria-hidden="true"></span><div class="listItemBody"><div class="listItemBodyText">Theme Gallery</div></div></div>';

        btn.onclick = function(e) {
            e.preventDefault();
            openThemeModal();
        };

        var logoutBtn = userSection.querySelector('.btnLogout');
        if (logoutBtn) {
            userSection.insertBefore(btn, logoutBtn);
        } else {
            userSection.appendChild(btn);
        }
    }

    // Start script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeThemeSystem);
    } else {
        initializeThemeSystem();
    }

    // Watch for DOM mutations to inject the button whenever the Settings menu opens
    var observer = new MutationObserver(function(mutations) {
        if (document.getElementById('myPreferencesMenuPage')) {
            injectSettingsButton();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
