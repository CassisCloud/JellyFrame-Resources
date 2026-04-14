(function () {
    'use strict';

    var MOD_ID = 'user-theme';
    var API_BASE = '/JellyFrame/mods/' + MOD_ID + '/api';
    var THEMES = [];
    var USER_CONFIG = { theme: '', vars: {}, addons: [] };
    var HAS_LOADED = false;

    function findTheme(id) {
        for (var i = 0; i < THEMES.length; i++) {
            if (THEMES[i].id === id) return THEMES[i];
        }
        return null;
    }

    function initializeThemeSystem() {
        if (!window.ApiClient || !window.ApiClient.getCurrentUserId()) {
            setTimeout(initializeThemeSystem, 200);
            return;
        }

        var userId = window.ApiClient.getCurrentUserId();

        Promise.all([
            fetch(API_BASE + '/themes').then(function (r) { return r.json(); }),
            fetch(API_BASE + '/selection/' + userId).then(function (r) { return r.json(); })
        ]).then(function (results) {
            THEMES = results[0] || [];
            var config = results[1] || {};

            USER_CONFIG.theme = config.theme || '';
            USER_CONFIG.vars = config.vars || {};
            USER_CONFIG.addons = config.addons || [];

            applyThemeConfig(true);
            HAS_LOADED = true;
            injectSettingsButton();
        }).catch(function (e) {
            console.error('[UserTheme] Failed to initialize:', e);
        });
    }

    var _serverThemeStash = null;
    var _serverThemeParent = null;
    var _serverThemeNext = null;

    function removeServerTheme() {
        var serverTheme = document.querySelector('link[data-jellyframe-theme="1"]');
        if (serverTheme && !_serverThemeStash) {
            _serverThemeStash = serverTheme;
            _serverThemeParent = serverTheme.parentNode;
            _serverThemeNext = serverTheme.nextSibling;
            serverTheme.parentNode.removeChild(serverTheme);
        } else if (serverTheme) {
            serverTheme.parentNode.removeChild(serverTheme);
        }
    }

    function restoreServerTheme() {
        var customLink = document.getElementById('jf-user-custom-theme-link');
        var customVars = document.getElementById('jf-user-custom-vars-style');
        var customAddons = document.getElementById('jf-user-custom-addons-container');
        if (customLink && customLink.parentNode) { customLink.parentNode.removeChild(customLink); }
        if (customVars && customVars.parentNode) { customVars.parentNode.removeChild(customVars); }
        if (customAddons && customAddons.parentNode) { customAddons.parentNode.removeChild(customAddons); }

        if (_serverThemeStash) {
            var parent = _serverThemeParent || document.head;
            if (_serverThemeNext && _serverThemeNext.parentNode === parent) {
                parent.insertBefore(_serverThemeStash, _serverThemeNext);
            } else {
                parent.appendChild(_serverThemeStash);
            }
            _serverThemeStash.disabled = false;
            _serverThemeStash = null;
            _serverThemeParent = null;
            _serverThemeNext = null;
        }
    }

    function applyThemeConfig(isInitial) {
        if (!USER_CONFIG.theme) {
            restoreServerTheme();
            return;
        }

        var themeObj = findTheme(USER_CONFIG.theme);
        if (!themeObj) { return; }

        if (!isInitial) {
            document.body.style.transition = 'opacity 0.15s ease';
            document.body.style.opacity = '0.6';
        }

        removeServerTheme();

        var customVars = document.getElementById('jf-user-custom-vars-style');
        if (!customVars) {
            customVars = document.createElement('style');
            customVars.id = 'jf-user-custom-vars-style';
        }

        var cssVarString = ':root { ';
        if (themeObj.vars) {
            themeObj.vars.forEach(function (v) {
                var val = USER_CONFIG.vars[v.key] !== undefined ? USER_CONFIG.vars[v.key] : v.default;
                if (val !== undefined && val !== null) {
                    cssVarString += '--' + v.key.toLowerCase().replace(/_/g, '-') + ': ' + val + ' !important; ';
                }
            });
        }
        cssVarString += ' }';
        customVars.innerHTML = cssVarString;

        var customLink = document.getElementById('jf-user-custom-theme-link');
        if (!customLink) {
            customLink = document.createElement('link');
            customLink.id = 'jf-user-custom-theme-link';
            customLink.rel = 'stylesheet';
        }
        if (customLink.href !== themeObj.cssUrl) { customLink.href = themeObj.cssUrl; }
        customLink.disabled = false;

        var customAddons = document.getElementById('jf-user-custom-addons-container');
        if (!customAddons) {
            customAddons = document.createElement('div');
            customAddons.id = 'jf-user-custom-addons-container';
        }

        customAddons.innerHTML = '';
        if (themeObj.addons) {
            themeObj.addons.forEach(function (addon) {
                if (USER_CONFIG.addons.indexOf(addon.id) !== -1) {
                    var link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.className = 'jf-user-addon-instance';
                    link.href = addon.cssUrl;
                    customAddons.appendChild(link);
                }
            });
        }

        document.body.appendChild(customVars);
        document.body.appendChild(customLink);
        document.body.appendChild(customAddons);

        if (!isInitial) {
            setTimeout(function () { document.body.style.opacity = '1'; }, 50);
        }
    }

    function saveConfig(reApply, callback) {
        var userId = window.ApiClient.getCurrentUserId();
        fetch(API_BASE + '/selection/' + userId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(USER_CONFIG)
        }).then(function (r) {
            return r.json();
        }).then(function (data) {
            if (data && data.ok) {
                if (reApply) { applyThemeConfig(false); }
                if (callback) { callback(true); }
            } else {
                console.error('[UserTheme] Save rejected by server:', data);
                if (callback) { callback(false); }
            }
        }).catch(function (e) {
            console.error('[UserTheme] saveConfig failed:', e);
            if (callback) { callback(false); }
        });
    }

    function createThemeCard(theme) {
        var isSelected = USER_CONFIG.theme === theme.id;
        var card = document.createElement('div');
        card.className = 'jf-theme-card';
        card.style.cssText = 'width:100%; background:#222; border-radius:12px; overflow:hidden; border: 2px solid ' + (isSelected ? '#00a4dc' : 'rgba(255,255,255,0.05)') + '; transition: all 0.2s ease; display:flex; flex-direction:column; height: 380px; position:relative;';

        var preview = document.createElement('div');
        preview.style.cssText = 'width:100%; height:220px; background:#111; background-size:cover; background-position:top; position:relative; cursor:pointer;';
        if (theme.previewUrl) { preview.style.backgroundImage = 'url(' + theme.previewUrl + ')'; }

        if (isSelected) {
            preview.innerHTML = '<div style="position:absolute; inset:0; background:rgba(0,164,220,0.15); display:flex; align-items:center; justify-content:center;"><span class="material-icons" style="font-size:40px; color:white; text-shadow:0 2px 10px rgba(0,0,0,0.5);">check_circle</span></div>';
        }

        preview.onclick = function () {
            if (USER_CONFIG.theme === theme.id) { return; }
            USER_CONFIG.theme = theme.id;
            USER_CONFIG.vars = {};
            USER_CONFIG.addons = [];
            if (theme.vars) {
                theme.vars.forEach(function (v) { USER_CONFIG.vars[v.key] = v.default; });
            }
            applyThemeConfig(false);
            saveConfig(false);
            openThemeModal();
        };

        var info = document.createElement('div');
        info.style.cssText = 'padding:16px; flex-grow:1; display:flex; flex-direction:column; justify-content:space-between;';
        info.innerHTML = '<div><div style="font-weight:bold; font-size:16px; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + theme.name + '</div>' +
            '<div style="font-size:12px; color:#888;">by ' + theme.author + '</div></div>';

        var actions = document.createElement('div');
        actions.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:10px;';

        var customizeBtn = document.createElement('button');
        customizeBtn.style.cssText = 'background:rgba(255,255,255,0.05); border:none; color:#00a4dc; border-radius:4px; padding:4px 8px; cursor:pointer; display:flex; align-items:center; gap:5px; font-size:12px; font-weight:bold;';
        customizeBtn.innerHTML = '<span class="material-icons" style="font-size:16px;">tune</span> Customize';

        if (theme.id !== '') { actions.appendChild(customizeBtn); }
        info.appendChild(actions);

        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute; bottom:-100%; left:0; width:100%; height:100%; background:#1a1a1a; transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index:10; display:flex; flex-direction:column;';

        var overlayHeader = document.createElement('div');
        overlayHeader.style.cssText = 'padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;';
        overlayHeader.innerHTML = '<span style="color:white; font-weight:bold; font-size:13px;">' + theme.name + ' Settings</span>';

        var closeOverlay = document.createElement('button');
        closeOverlay.className = 'material-icons';
        closeOverlay.style.cssText = 'background:transparent; border:none; color:#888; cursor:pointer; font-size:18px;';
        closeOverlay.innerText = 'expand_more';
        closeOverlay.onclick = function () { overlay.style.bottom = '-100%'; };
        overlayHeader.appendChild(closeOverlay);

        var overlayContent = document.createElement('div');
        overlayContent.style.cssText = 'padding:16px; overflow-y:auto; flex-grow:1;';

        var pendingVars = {};
        var pendingAddons = [];

        var configVarKeys = Object.keys(USER_CONFIG.vars);
        for (var vi = 0; vi < configVarKeys.length; vi++) {
            pendingVars[configVarKeys[vi]] = USER_CONFIG.vars[configVarKeys[vi]];
        }
        for (var ai = 0; ai < USER_CONFIG.addons.length; ai++) {
            pendingAddons.push(USER_CONFIG.addons[ai]);
        }

        if (theme.addons && theme.addons.length > 0) {
            var addonsLabel = document.createElement('div');
            addonsLabel.style.cssText = 'font-size:10px; color:#555; font-weight:bold; text-transform:uppercase; margin-bottom:10px;';
            addonsLabel.innerText = 'Addons';
            overlayContent.appendChild(addonsLabel);

            theme.addons.forEach(function (addon) {
                var row = document.createElement('label');
                var active = pendingAddons.indexOf(addon.id) !== -1;
                row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; cursor:pointer; font-size:13px; color:#eee;';

                var nameSpan = document.createElement('span');
                nameSpan.innerText = addon.name;

                var checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = active;
                checkbox.onchange = function (e) {
                    if (e.target.checked) {
                        if (pendingAddons.indexOf(addon.id) === -1) { pendingAddons.push(addon.id); }
                    } else {
                        var filtered = [];
                        for (var fi = 0; fi < pendingAddons.length; fi++) {
                            if (pendingAddons[fi] !== addon.id) { filtered.push(pendingAddons[fi]); }
                        }
                        pendingAddons = filtered;
                    }
                };

                row.appendChild(nameSpan);
                row.appendChild(checkbox);
                overlayContent.appendChild(row);
            });
        }

        if (theme.vars && theme.vars.length > 0) {
            var varsLabel = document.createElement('div');
            varsLabel.style.cssText = 'font-size:10px; color:#555; font-weight:bold; text-transform:uppercase; margin:15px 0 10px 0;';
            varsLabel.innerText = 'Variables';
            overlayContent.appendChild(varsLabel);

            theme.vars.forEach(function (v) {
                if (v.type === 'color') {
                    var row = document.createElement('div');
                    row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; font-size:13px; color:#eee;';

                    var nameSpan = document.createElement('span');
                    nameSpan.innerText = v.name;

                    var currentVal = pendingVars[v.key] !== undefined ? pendingVars[v.key] : (v.default || '#000000');
                    var colorInput = document.createElement('input');
                    colorInput.type = 'color';
                    colorInput.style.cssText = 'border:none; background:transparent; width:30px; height:26px; cursor:pointer;';
                    colorInput.value = currentVal;
                    colorInput.oninput = function (e) {
                        pendingVars[v.key] = e.target.value;
                    };
                    colorInput.onchange = function (e) {
                        pendingVars[v.key] = e.target.value;
                    };

                    row.appendChild(nameSpan);
                    row.appendChild(colorInput);
                    overlayContent.appendChild(row);
                }
            });
        }

        var overlayFooter = document.createElement('div');
        overlayFooter.style.cssText = 'padding:12px 16px; border-top:1px solid rgba(255,255,255,0.05); flex-shrink:0;';

        var applyBtn = document.createElement('button');
        applyBtn.style.cssText = 'width:100%; padding:10px; background:#00a4dc; border:none; color:white; border-radius:8px; font-size:13px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;';
        applyBtn.innerHTML = '<span class="material-icons" style="font-size:16px;">save</span> Apply & Save';

        applyBtn.onclick = function () {
            USER_CONFIG.vars = {};
            var pendingVarKeys = Object.keys(pendingVars);
            for (var ki = 0; ki < pendingVarKeys.length; ki++) {
                USER_CONFIG.vars[pendingVarKeys[ki]] = pendingVars[pendingVarKeys[ki]];
            }
            USER_CONFIG.addons = [];
            for (var pi = 0; pi < pendingAddons.length; pi++) {
                USER_CONFIG.addons.push(pendingAddons[pi]);
            }

            applyBtn.disabled = true;
            applyBtn.innerHTML = '<span class="material-icons" style="font-size:16px;">hourglass_top</span> Saving...';

            saveConfig(true, function (ok) {
                if (ok) {
                    applyBtn.innerHTML = '<span class="material-icons" style="font-size:16px;">check_circle</span> Saved!';
                    applyBtn.style.background = '#1db954';
                    setTimeout(function () {
                        applyBtn.disabled = false;
                        applyBtn.style.background = '#00a4dc';
                        applyBtn.innerHTML = '<span class="material-icons" style="font-size:16px;">save</span> Apply & Save';
                        overlay.style.bottom = '-100%';
                    }, 1200);
                } else {
                    applyBtn.innerHTML = '<span class="material-icons" style="font-size:16px;">error</span> Save Failed';
                    applyBtn.style.background = '#c0392b';
                    setTimeout(function () {
                        applyBtn.disabled = false;
                        applyBtn.style.background = '#00a4dc';
                        applyBtn.innerHTML = '<span class="material-icons" style="font-size:16px;">save</span> Apply & Save';
                    }, 2000);
                }
            });
        };

        overlayFooter.appendChild(applyBtn);

        overlay.appendChild(overlayHeader);
        overlay.appendChild(overlayContent);
        overlay.appendChild(overlayFooter);

        customizeBtn.onclick = function (e) {
            e.stopPropagation();
            overlay.style.bottom = '0';
        };

        card.appendChild(preview);
        card.appendChild(info);
        card.appendChild(overlay);
        return card;
    }

    function openThemeModal() {
        var modal = document.getElementById('jf-theme-picker-modal');
        if (modal) { modal.parentNode.removeChild(modal); }

        modal = document.createElement('div');
        modal.id = 'jf-theme-picker-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.92);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif; backdrop-filter:blur(10px); opacity:0; transition: opacity 0.3s ease;';

        modal.onclick = function () {
            modal.style.opacity = '0';
            setTimeout(function () { if (modal.parentNode) { modal.parentNode.removeChild(modal); } }, 250);
        };

        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'width:95%; max-width:1150px; max-height:85vh; background:#181818; border-radius:24px; display:flex; flex-direction:column; overflow:hidden; box-shadow: 0 40px 100px rgba(0,0,0,0.8); border:1px solid rgba(255,255,255,0.08);';
        wrapper.onclick = function (e) { e.stopPropagation(); };

        var header = document.createElement('div');
        header.style.cssText = 'padding:32px 40px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;';
        header.innerHTML = '<div><h2 style="margin:0; color:white; font-size:28px;">Appearance Gallery</h2><p style="margin:6px 0 0 0; color:#888; font-size:15px;">Select a theme, then customize with the tune button</p></div>' +
            '<button class="material-icons" style="background:rgba(255,255,255,0.1); border:none; color:white; border-radius:50%; width:44px; height:44px; cursor:pointer;" onclick="document.getElementById(\'jf-theme-picker-modal\').onclick()">close</button>';

        var content = document.createElement('div');
        content.style.cssText = 'padding:40px; overflow-y:auto; display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:30px;';

        content.appendChild(createThemeCard({ id: '', name: 'Server Default', author: 'System', description: 'Revert to the global theme.' }));

        THEMES.forEach(function (t) {
            content.appendChild(createThemeCard(t));
        });

        wrapper.appendChild(header);
        wrapper.appendChild(content);
        modal.appendChild(wrapper);
        document.body.appendChild(modal);

        void modal.offsetWidth;
        modal.style.opacity = '1';
    }

    function injectSettingsButton() {
        if (!HAS_LOADED) { return; }
        var userSection = document.querySelector('#myPreferencesMenuPage .userSection');
        if (!userSection) { return; }
        if (userSection.querySelector('#btn-jf-theme-selector')) { return; }

        var btn = document.createElement('a');
        btn.id = 'btn-jf-theme-selector';
        btn.className = 'emby-button listItem-border';
        btn.href = '#';
        btn.style.cssText = 'display: block; margin: 0px; padding: 0px;';
        btn.innerHTML = '<div class="listItem"><span class="material-icons listItemIcon listItemIcon-transparent palette" aria-hidden="true"></span><div class="listItemBody"><div class="listItemBodyText">Theme Gallery</div><div class="listItemBodyText secondary">Personalize your interface</div></div></div>';

        btn.onclick = function (e) {
            e.preventDefault();
            openThemeModal();
        };

        var logoutBtn = userSection.querySelector('.btnLogout');
        if (logoutBtn) { userSection.insertBefore(btn, logoutBtn); }
        else { userSection.appendChild(btn); }
    }

    function enforceCustomThemePriority() {
        var debounceTimer = null;

        var observer = new MutationObserver(function (mutations) {
            var selfCaused = true;
            var ourIds = { 'jf-user-custom-vars-style': 1, 'jf-user-custom-theme-link': 1, 'jf-user-custom-addons-container': 1 };
            for (var mi = 0; mi < mutations.length; mi++) {
                var lists = [mutations[mi].addedNodes, mutations[mi].removedNodes];
                for (var li = 0; li < lists.length; li++) {
                    for (var ni = 0; ni < lists[li].length; ni++) {
                        if (!ourIds[lists[li][ni].id || '']) { selfCaused = false; break; }
                    }
                    if (!selfCaused) { break; }
                }
                if (!selfCaused) { break; }
            }
            if (selfCaused) { return; }

            if (debounceTimer) { clearTimeout(debounceTimer); }
            debounceTimer = setTimeout(function () {
                debounceTimer = null;

                observer.disconnect();

                if (USER_CONFIG.theme) {
                    var reinjected = document.querySelector('link[data-jellyframe-theme="1"]');
                    if (reinjected && reinjected.parentNode) {
                        _serverThemeStash = null;
                        _serverThemeParent = null;
                        _serverThemeNext = null;
                        applyThemeConfig(true);
                    }
                }

                var customVars = document.getElementById('jf-user-custom-vars-style');
                var customLink = document.getElementById('jf-user-custom-theme-link');
                var customAddons = document.getElementById('jf-user-custom-addons-container');

                if (customVars || customLink || customAddons) {
                    var expected = customAddons || customLink || customVars;
                    if (document.body.lastChild !== expected) {
                        if (customVars) { document.body.appendChild(customVars); }
                        if (customLink) { document.body.appendChild(customLink); }
                        if (customAddons) { document.body.appendChild(customAddons); }
                    }
                }

                observer.observe(document.body, { childList: true, subtree: false });
                observer.observe(document.head, { childList: true });
            }, 50);
        });

        observer.observe(document.body, { childList: true, subtree: false });
        observer.observe(document.head, { childList: true });
    }

    setInterval(function () {
        if (!HAS_LOADED) { return; }
        var page = document.getElementById('myPreferencesMenuPage');
        if (!page || page.classList.contains('hide')) { return; }
        var userSection = page.querySelector('.userSection');
        if (!userSection) { return; }
        if (userSection.querySelector('#btn-jf-theme-selector')) { return; }
        injectSettingsButton();
    }, 500);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initializeThemeSystem();
            enforceCustomThemePriority();
        });
    } else {
        initializeThemeSystem();
        enforceCustomThemePriority();
    }
})();
