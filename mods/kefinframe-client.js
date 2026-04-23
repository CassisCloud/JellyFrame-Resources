// =============================================================================
// KefinFrame - Browser Script
// Injected into every Jellyfin page via JellyFrame jsUrl
// ES5 compatible. No const/let. No arrow functions. No template literals.
// All inline styles (no CSS class reliance). ASCII only.
// =============================================================================

(function () {
    'use strict';

    var MOD_ID = 'kefinframe';
    var API_BASE = '/JellyFrame/mods/' + MOD_ID + '/api';
    var STORAGE_KEY = 'kefinframe_state';
    var SKIN_STYLE_ID = 'kefinframe-skin-style';
    var NAV_LINKS_ID = 'kefinframe-nav-links';
    var HOME_SECTIONS_ID = 'kefinframe-home-sections';

    var state = {
        userId: null,
        userName: null,
        isAdmin: false,
        config: null,
        skins: [],
        watchlistCache: null,
        initialized: false
    };

    function apiGet(path, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', API_BASE + path, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) { return; }
            try {
                var data = JSON.parse(xhr.responseText);
                cb(null, data);
            } catch (e) {
                cb(e, null);
            }
        };
        xhr.onerror = function () { cb(new Error('network error'), null); };
        xhr.send();
    }

    function apiPost(path, body, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', API_BASE + path, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) { return; }
            try {
                var data = JSON.parse(xhr.responseText);
                if (cb) { cb(null, data); }
            } catch (e) {
                if (cb) { cb(e, null); }
            }
        };
        xhr.onerror = function () { if (cb) { cb(new Error('network error'), null); } };
        xhr.send(JSON.stringify(body));
    }

    function debounce(fn, ms) {
        var t;
        return function () {
            var args = arguments;
            var ctx = this;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(ctx, args); }, ms);
        };
    }

    function escapeHtml(str) {
        if (!str) { return ''; }
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function imageUrl(itemId, tag, type, maxWidth) {
        if (!tag) { return ''; }
        return '/Items/' + itemId + '/Images/' + (type || 'Primary') + '?tag=' + tag + '&quality=90&maxWidth=' + (maxWidth || 300);
    }

    function getJellyfinUser(cb) {
        if (typeof ApiClient === 'undefined' || !ApiClient) {
            setTimeout(function () { getJellyfinUser(cb); }, 500);
            return;
        }
        var user = ApiClient.getCurrentUser();
        if (user && user.then) {
            user.then(function (u) { cb(u); }).catch(function () { cb(null); });
        } else if (user) {
            cb(user);
        } else {
            cb(null);
        }
    }

    function currentPath() {
        return window.location.hash || window.location.pathname;
    }

    function init() {
        if (state.initialized) { return; }
        getJellyfinUser(function (user) {
            if (!user) { return; }
            state.userId = user.Id || user.id;
            state.userName = user.Name || user.name;
            state.isAdmin = !!(user.Policy && user.Policy.IsAdministrator);
            state.initialized = true;

            apiGet('/skins', function (errSkins, skinsData) {
                if (!errSkins && skinsData) {
                    state.skins = skinsData;
                }

                apiGet('/config?userId=' + state.userId, function (errCfg, cfg) {
                    if (errCfg || !cfg) { return; }
                    state.config = cfg;

                    applyAll();
                    setupMutationObserver();
                });
            });
        });
    }

    function applyAll() {
        if (!state.config) { return; }
        applySkin();
        if (state.config.features.customNavLinks) { applyNavLinks(); }
        if (state.config.features.skinSwitcher) { injectSkinSwitcherButton(); }
        injectSettingsButton();
        onRouteChange();
    }

    var lastPath = '';

    function onRouteChange() {
        var path = currentPath();
        if (path === lastPath) { return; }
        lastPath = path;

        setTimeout(function () {
            if (!state.config) { return; }

            if (state.config.features.skinSwitcher) { injectSkinSwitcherButton(); }
            injectSettingsButton();
            if (state.config.features.customNavLinks) { applyNavLinks(); }
            if (state.config.features.watchlist) { injectWatchlistButtons(); }
            if (state.config.features.customHomeSections && isHomePage()) { injectHomeSections(); }
        }, 500);
    }

    function isHomePage() {
        var p = currentPath();
        return p === '#!' || p === '#' || p === '' || p === '/' || p.indexOf('home') !== -1;
    }

    function setupMutationObserver() {
        var observer = new MutationObserver(debounce(function () {
            var path = currentPath();
            if (path !== lastPath) { onRouteChange(); }

            if (state.config) {
                if (state.config.features.watchlist) {
                    injectWatchlistButtons();
                }
                if (state.config.features.customHomeSections && isHomePage()) {
                    injectHomeSections(false);
                }
            }
        }, 300));
        observer.observe(document.body, { childList: true, subtree: true });

        window.addEventListener('hashchange', function () { onRouteChange(); });
        window.addEventListener('popstate', function () { onRouteChange(); });
    }

    function applySkin() {
        if (!state.config || !state.config.skin) { return; }
        var skinId = state.config.skin.activeSkin;
        var schemeId = state.config.skin.activeColorScheme;

        var existing = document.getElementById(SKIN_STYLE_ID);
        if (existing) { existing.parentNode.removeChild(existing); }

        if (!skinId || skinId === 'jellyfin-default') { return; }

        var skin = null;
        for (var i = 0; i < state.skins.length; i++) {
            if (state.skins[i].id === skinId) { skin = state.skins[i]; break; }
        }
        if (!skin || !skin.cssUrl) { return; }

        var frag = document.createDocumentFragment();
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = skin.cssUrl;
        link.id = SKIN_STYLE_ID;
        frag.appendChild(link);

        if (schemeId && skin.colorSchemes) {
            for (var j = 0; j < skin.colorSchemes.length; j++) {
                if (skin.colorSchemes[j].id === schemeId && skin.colorSchemes[j].cssUrl) {
                    var schemeLink = document.createElement('link');
                    schemeLink.rel = 'stylesheet';
                    schemeLink.href = skin.colorSchemes[j].cssUrl;
                    schemeLink.id = SKIN_STYLE_ID + '-scheme';
                    frag.appendChild(schemeLink);
                    break;
                }
            }
        }
        document.body.appendChild(frag);
    }

    function findHeaderButtonRow() {
        return document.querySelector('.headerRight')
            || document.querySelector('.skinHeader .headerButtons')
            || document.querySelector('header .headerButtons')
            || document.querySelector('.viewManagerContainer header');
    }

    function makeHeaderIconBtn(id, title, svgPath) {
        var btn = document.createElement('button');
        btn.id = id;
        btn.type = 'button';
        btn.title = title;
        btn.classList.add("headerSyncButton", "headerButton", "headerButtonRight", "paper-icon-button-light");
        btn.style.cssText = 'padding: 8.273px;cursor:pointer;margin:0;color:inherit;opacity:0.75;display:inline-flex;align-items:center;justify-content:center;height:100%;min-width:32px;vertical-align:middle;';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24.849" height="24.849" viewBox="0 0 24 24" fill="currentColor">' + svgPath + '</svg>';
        btn.addEventListener('mouseover', function () { this.style.opacity = '1'; });
        btn.addEventListener('mouseout', function () { this.style.opacity = '0.75'; });
        return btn;
    }

    function injectSkinSwitcherButton() {
        if (document.getElementById('kf-skin-btn')) { return; }
        var header = findHeaderButtonRow();
        if (!header) { return; }

        var btn = makeHeaderIconBtn(
            'kf-skin-btn',
            'Change Appearance (KefinFrame)',
            '<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>'
        );
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!state.skins || state.skins.length === 0) {
                apiGet('/skins', function (err, data) {
                    if (!err && data) { state.skins = data; }
                    openSkinPanel();
                });
            } else {
                openSkinPanel();
            }
        });
        header.insertBefore(btn, header.firstChild);
    }

    function openSkinPanel() {
        closeAllPanels();
        var panel = buildPanel('kf-skin-panel', 'Appearance', buildSkinPanelContent());
        document.body.appendChild(panel);
        animateIn(panel);
    }

    function buildSkinPanelContent() {
        var container = document.createElement('div');

        if (!state.skins || state.skins.length === 0) {
            container.innerHTML = '<p style="color:#aaa;text-align:center;padding:16px;">Loading skins...</p>';
            apiGet('/skins', function (err, data) {
                if (!err && data) {
                    state.skins = data;
                    var panel = document.getElementById('kf-skin-panel');
                    if (panel) {
                        var body = panel.querySelector('.kf-panel-body');
                        if (body) { body.innerHTML = ''; body.appendChild(buildSkinPanelContent()); }
                    }
                }
            });
            return container;
        }

        var activeSkin = state.config.skin.activeSkin || 'jellyfin-default';
        var activeScheme = state.config.skin.activeColorScheme || '';

        for (var i = 0; i < state.skins.length; i++) {
            var skin = state.skins[i];
            var isActive = skin.id === activeSkin;
            var card = document.createElement('div');
            card.style.cssText = 'border-radius:8px;padding:12px 14px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:background 0.15s;'
                + (isActive ? 'background:rgba(0,164,220,0.18);border:1px solid rgba(0,164,220,0.5);' : 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);');
            card.dataset.skinId = skin.id;

            var dot = document.createElement('div');
            dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:' + (isActive ? '#00a4dc' : '#555') + ';flex-shrink:0;';

            var info = document.createElement('div');
            info.style.cssText = 'flex:1;';
            info.innerHTML = '<div style="font-weight:600;font-size:13px;">' + escapeHtml(skin.name) + '</div>'
                + '<div style="font-size:11px;color:#888;margin-top:2px;">' + escapeHtml(skin.description || '') + '</div>';

            card.appendChild(dot);
            card.appendChild(info);

            if (isActive && skin.colorSchemes && skin.colorSchemes.length > 0) {
                var schemeRow = buildSchemeRow(skin, activeScheme);
                container.appendChild(card);
                container.appendChild(schemeRow);
            } else {
                container.appendChild(card);
            }

            (function (skinId) {
                card.addEventListener('click', function () {
                    state.config.skin.activeSkin = skinId;
                    state.config.skin.activeColorScheme = '';
                    apiPost('/config', { userId: state.userId, skin: state.config.skin }, null);
                    applySkin();
                    var panel = document.getElementById('kf-skin-panel');
                    if (panel) {
                        var body = panel.querySelector('.kf-panel-body');
                        if (body) { body.innerHTML = ''; body.appendChild(buildSkinPanelContent()); }
                    }
                });
            }(skin.id));
        }
        return container;
    }

    function buildSchemeRow(skin, activeScheme) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;padding:4px 14px 12px 36px;';
        for (var i = 0; i < skin.colorSchemes.length; i++) {
            var sc = skin.colorSchemes[i];
            var dot = document.createElement('div');
            dot.title = sc.name;
            dot.style.cssText = 'width:22px;height:22px;border-radius:50%;cursor:pointer;border:2px solid ' + (sc.id === activeScheme ? '#00a4dc' : 'transparent') + ';background:#888;display:flex;align-items:center;justify-content:center;';
            dot.textContent = sc.name.charAt(0);
            dot.style.fontSize = '10px';
            dot.style.fontWeight = '700';
            dot.style.color = '#fff';

            (function (schemeId) {
                dot.addEventListener('click', function (e) {
                    e.stopPropagation();
                    state.config.skin.activeColorScheme = schemeId;
                    apiPost('/config', { userId: state.userId, skin: state.config.skin }, null);
                    applySkin();
                    var panel = document.getElementById('kf-skin-panel');
                    if (panel) {
                        var body = panel.querySelector('.kf-panel-body');
                        if (body) { body.innerHTML = ''; body.appendChild(buildSkinPanelContent()); }
                    }
                });
            }(sc.id));
            row.appendChild(dot);
        }
        return row;
    }

    var navLinksRetryTimer = null;

    function applyNavLinks() {
        var existing = document.querySelectorAll('.kf-nav-link-btn');
        for (var r = 0; r < existing.length; r++) {
            existing[r].parentNode && existing[r].parentNode.removeChild(existing[r]);
        }

        var links = state.config.navLinks;
        if (!links || links.length === 0) { return; }

        var slider = document.querySelector('div.emby-tabs-slider');
        if (!slider) {
            if (navLinksRetryTimer) { clearTimeout(navLinksRetryTimer); }
            navLinksRetryTimer = setTimeout(applyNavLinks, 600);
            return;
        }

        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if (!link.url) { continue; }

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('is', 'emby-button');
            btn.className = 'emby-tab-button emby-button kf-nav-link-btn';
            btn.setAttribute('data-index', '900' + i);

            var fg = document.createElement('div');
            fg.className = 'emby-button-foreground';
            fg.textContent = link.label || link.url;
            btn.appendChild(fg);

            btn.addEventListener('click', function (url, external) {
                return function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (external) {
                        window.open(url, '_blank', 'noopener');
                    } else {
                        window.location.href = url;
                    }
                };
            }(link.url, !!link.external));

            slider.appendChild(btn);
        }
    }

    var watchlistSet = {};

    function loadWatchlistSet(cb) {
        if (!state.userId) { if (cb) { cb(); } return; }
        apiGet('/watchlist?userId=' + state.userId, function (err, data) {
            if (err || !data) { if (cb) { cb(); } return; }
            watchlistSet = {};
            for (var i = 0; i < data.items.length; i++) {
                watchlistSet[data.items[i].id] = true;
            }
            if (cb) { cb(); }
        });
    }

    function injectWatchlistButtons() {
        if (!state.config || !state.config.features.watchlist) { return; }
        var cards = document.querySelectorAll('.card:not([data-kf-wl])');
        if (cards.length === 0) { return; }

        function inject(cards) {
            for (var i = 0; i < cards.length; i++) {
                var card = cards[i];
                card.setAttribute('data-kf-wl', '1');
                var overlay = card.querySelector('.cardOverlayInner, .cardOverlayContainer, .itemAction');
                if (!overlay) { continue; }

                var itemId = card.getAttribute('data-id') || (card.querySelector('[data-id]') && card.querySelector('[data-id]').getAttribute('data-id'));
                if (!itemId) { continue; }

                if (card.querySelector('.kf-wl-btn')) { continue; }

                var btn = document.createElement('button');
                btn.className = 'kf-wl-btn';
                btn.dataset.itemId = itemId;
                var inWl = !!watchlistSet[itemId];
                btn.style.cssText = 'position:absolute;top:6px;right:6px;z-index:10;background:rgba(0,0,0,0.65);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:transform 0.15s,background 0.15s;';
                btn.title = inWl ? 'Remove from Watchlist' : 'Add to Watchlist';
                btn.innerHTML = inWl ? watchlistIconFilled() : watchlistIconEmpty();
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleWatchlist(this);
                });
                var pos = window.getComputedStyle(card).position;
                if (pos === 'static') { card.style.position = 'relative'; }
                card.appendChild(btn);
            }
        }
        inject(cards);
    }

    function watchlistIconEmpty() {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
    }

    function watchlistIconFilled() {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#00a4dc" stroke="#00a4dc" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
    }

    function toggleWatchlist(btn) {
        var itemId = btn.dataset.itemId;
        var inWl = !!watchlistSet[itemId];

        if (inWl) {
            watchlistSet[itemId] = false;
            btn.innerHTML = watchlistIconEmpty();
            btn.title = 'Add to Watchlist';
            apiPost('/watchlist/remove', { userId: state.userId, itemId: itemId }, function (err, data) {
                if (err || !data || !data.ok) {
                    watchlistSet[itemId] = true;
                    btn.innerHTML = watchlistIconFilled();
                    btn.title = 'Remove from Watchlist';
                }
            });
        } else {
            watchlistSet[itemId] = true;
            btn.innerHTML = watchlistIconFilled();
            btn.title = 'Remove from Watchlist';
            apiPost('/watchlist/add', { userId: state.userId, itemId: itemId }, function (err, data) {
                if (err || !data || !data.ok) {
                    watchlistSet[itemId] = false;
                    btn.innerHTML = watchlistIconEmpty();
                    btn.title = 'Add to Watchlist';
                }
            });
        }
    }

    var searchOverlayOpen = false;
    var searchDebounced = null;

    function initEnhancedSearch() {
        if (!state.config || !state.config.features.enhancedSearch) { return; }
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.headerSearchButton, .btnSearch, [data-action="search"]');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                openSearchOverlay();
            }
        }, true);

        document.addEventListener('keydown', function (e) {
            if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && !e.target.matches('input,textarea')) {
                e.preventDefault();
                if (!searchOverlayOpen) { openSearchOverlay(); }
            }
            if (e.key === 'Escape' && searchOverlayOpen) {
                closeSearchOverlay();
            }
        });
    }

    function openSearchOverlay() {
        if (searchOverlayOpen) { return; }
        searchOverlayOpen = true;
        closeAllPanels();

        var overlay = document.createElement('div');
        overlay.id = 'kf-search-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.82);display:flex;flex-direction:column;align-items:center;padding-top:80px;';

        var box = document.createElement('div');
        box.style.cssText = 'width:90%;max-width:680px;background:#1a1a2e;border-radius:14px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.6);';

        var inputRow = document.createElement('div');
        inputRow.style.cssText = 'display:flex;align-items:center;padding:16px 20px;gap:12px;border-bottom:1px solid rgba(255,255,255,0.08);';

        var icon = document.createElement('div');
        icon.style.cssText = 'opacity:0.5;flex-shrink:0;';
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.5 6.5 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';

        var input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Search movies, shows, music...';
        input.id = 'kf-search-input';
        input.style.cssText = 'flex:1;background:none;border:none;outline:none;color:#fff;font-size:17px;font-family:inherit;';
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');

        var kbHint = document.createElement('div');
        kbHint.style.cssText = 'font-size:11px;color:#555;flex-shrink:0;';
        kbHint.textContent = 'ESC to close';

        inputRow.appendChild(icon);
        inputRow.appendChild(input);
        inputRow.appendChild(kbHint);

        var results = document.createElement('div');
        results.id = 'kf-search-results';
        results.style.cssText = 'max-height:480px;overflow-y:auto;padding:8px 0;';

        box.appendChild(inputRow);
        box.appendChild(results);
        overlay.appendChild(box);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) { closeSearchOverlay(); }
        });

        searchDebounced = debounce(function (term) {
            if (term.length < 2) { results.innerHTML = ''; return; }
            results.innerHTML = '<div style="text-align:center;padding:20px;color:#666;font-size:13px;">Searching...</div>';
            apiGet('/search?userId=' + state.userId + '&term=' + encodeURIComponent(term) + '&limit=20', function (err, data) {
                if (err || !data) { return; }
                renderSearchResults(results, data.results);
            });
        }, 280);

        input.addEventListener('input', function () { searchDebounced(this.value.trim()); });

        document.body.appendChild(overlay);
        setTimeout(function () { input.focus(); }, 50);
    }

    function renderSearchResults(container, items) {
        container.innerHTML = '';
        if (!items || items.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:24px;color:#666;font-size:13px;">No results found</div>';
            return;
        }

        var grouped = { Movie: [], Series: [], Episode: [], Audio: [], MusicAlbum: [], other: [] };
        for (var i = 0; i < items.length; i++) {
            var type = items[i].type;
            if (grouped[type]) { grouped[type].push(items[i]); }
            else { grouped.other.push(items[i]); }
        }

        var groups = [
            { key: 'Movie', label: 'Movies' },
            { key: 'Series', label: 'TV Shows' },
            { key: 'Episode', label: 'Episodes' },
            { key: 'Audio', label: 'Music' },
            { key: 'MusicAlbum', label: 'Albums' },
            { key: 'other', label: 'Other' }
        ];

        for (var g = 0; g < groups.length; g++) {
            var grp = groups[g];
            var grpItems = grouped[grp.key];
            if (!grpItems || grpItems.length === 0) { continue; }

            var header = document.createElement('div');
            header.style.cssText = 'padding:6px 18px 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#00a4dc;';
            header.textContent = grp.label;
            container.appendChild(header);

            for (var k = 0; k < grpItems.length; k++) {
                var item = grpItems[k];
                var row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:8px 18px;cursor:pointer;transition:background 0.1s;border-radius:4px;';
                row.addEventListener('mouseover', function () { this.style.background = 'rgba(255,255,255,0.06)'; });
                row.addEventListener('mouseout', function () { this.style.background = ''; });

                var thumb = document.createElement('div');
                thumb.style.cssText = 'width:36px;height:36px;border-radius:4px;background:#222;flex-shrink:0;overflow:hidden;';
                var imgSrc = item.imageTags && item.imageTags.Primary
                    ? imageUrl(item.id, item.imageTags.Primary, 'Primary', 80)
                    : (item.imageTags && item.imageTags.Thumb ? imageUrl(item.id, item.imageTags.Thumb, 'Thumb', 80) : '');
                if (imgSrc) {
                    var img = document.createElement('img');
                    img.src = imgSrc;
                    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
                    thumb.appendChild(img);
                }

                var info = document.createElement('div');
                info.style.cssText = 'flex:1;min-width:0;';

                var nameEl = document.createElement('div');
                nameEl.style.cssText = 'font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                nameEl.textContent = item.name;

                var meta = document.createElement('div');
                meta.style.cssText = 'font-size:11px;color:#888;margin-top:1px;';
                var metaParts = [];
                if (item.seriesName) { metaParts.push(item.seriesName); }
                if (item.productionYear) { metaParts.push(String(item.productionYear)); }
                if (item.communityRating) { metaParts.push(parseFloat(item.communityRating).toFixed(1) + ' *'); }
                meta.textContent = metaParts.join('  |  ');

                info.appendChild(nameEl);
                info.appendChild(meta);
                row.appendChild(thumb);
                row.appendChild(info);

                if (state.config.features.watchlist) {
                    var wlBtn = document.createElement('button');
                    wlBtn.dataset.itemId = item.id;
                    var inWl = !!watchlistSet[item.id];
                    wlBtn.style.cssText = 'background:none;border:none;cursor:pointer;padding:4px;opacity:0.7;flex-shrink:0;';
                    wlBtn.title = inWl ? 'Remove from Watchlist' : 'Add to Watchlist';
                    wlBtn.innerHTML = inWl ? watchlistIconFilled() : watchlistIconEmpty();
                    wlBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        toggleWatchlist(this);
                        this.innerHTML = watchlistSet[this.dataset.itemId] ? watchlistIconFilled() : watchlistIconEmpty();
                    });
                    row.appendChild(wlBtn);
                }

                (function (itemId, itemType) {
                    row.addEventListener('click', function (e) {
                        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) { return; }
                        closeSearchOverlay();
                        navigateTo(itemId, itemType);
                    });
                }(item.id, item.type));

                container.appendChild(row);
            }
        }
    }

    function navigateTo(itemId, itemType) {
        var hash = '#!/details?id=' + itemId;
        if (itemType === 'Episode') { hash = '#!/details?id=' + itemId; }
        window.location.hash = hash;
    }

    function closeSearchOverlay() {
        searchOverlayOpen = false;
        var el = document.getElementById('kf-search-overlay');
        if (el) { el.parentNode.removeChild(el); }
    }

    function injectHomeSections(forceRebuild) {
        if (!state.config || !state.config.features.customHomeSections) { return; }
        var sections = state.config.homeSections;
        if (!sections || sections.length === 0) { return; }

        var homeMain = null;
        var containers = document.querySelectorAll('.homeSectionsContainer');

        for (var i = 0; i < containers.length; i++) {
            if (!containers[i].closest('.hide')) {
                homeMain = containers[i];
                break;
            }
        }

        if (!homeMain) { return; }

        var existing = homeMain.querySelector('.kf-home-sections-wrapper');

        if (existing && !forceRebuild) {
            return;
        }

        if (existing) {
            existing.parentNode.removeChild(existing);
        }

        var wrapper = document.createElement('div');
        wrapper.className = 'kf-home-sections-wrapper';

        var addedCount = 0;

        for (var j = 0; j < sections.length; j++) {
            var sec = sections[j];
            if (!sec.enabled) { continue; }
            (function (section) {
                var sectionEl = buildHomeSectionShell(section);
                wrapper.appendChild(sectionEl);
                loadHomeSectionData(section, sectionEl);
                addedCount++;
            }(sec));
        }

        if (addedCount > 0) {
            homeMain.appendChild(wrapper);
        }
    }

    function buildHomeSectionShell(section) {
        var el = document.createElement('div');
        el.className = 'verticalSection emby-scroller-container kf-home-section';

        var title = document.createElement('h2');
        title.className = 'sectionTitle sectionTitle-cards padded-left';
        title.textContent = section.title || section.name || 'Section';
        el.appendChild(title);

        var scroller = document.createElement('div');
        scroller.setAttribute('is', 'emby-scroller');
        scroller.className = 'padded-top-focusscale padded-bottom-focusscale emby-scroller';
        scroller.setAttribute('data-centerfocus', 'true');
        scroller.setAttribute('data-scroll-mode-x', 'custom');

        var itemsContainer = document.createElement('div');
        itemsContainer.setAttribute('is', 'emby-itemscontainer');
        itemsContainer.className = 'itemsContainer scrollSlider focuscontainer-x animatedScrollX';
        itemsContainer.style.cssText = 'white-space: nowrap;';

        itemsContainer.innerHTML = '<div style="color:#666;font-size:13px;padding:20px;white-space:normal;">Loading...</div>';

        scroller.appendChild(itemsContainer);
        el.appendChild(scroller);

        return el;
    }

    function loadHomeSectionData(section, el) {
        var url = '/home/sections/data?userId=' + state.userId
            + '&type=' + encodeURIComponent(section.type || 'latest')
            + '&mediaType=' + encodeURIComponent(section.mediaType || '')
            + '&libraryId=' + encodeURIComponent(section.libraryId || '')
            + '&limit=' + (section.limit || 20);

        apiGet(url, function (err, data) {
            var scroll = el.querySelector('.itemsContainer');
            if (!scroll) { return; }
            scroll.innerHTML = '';

            if (err || !data || !data.items || data.items.length === 0) {
                scroll.innerHTML = '<div style="color:#666;font-size:13px;padding:20px;white-space:normal;">No items found</div>';
                return;
            }

            for (var i = 0; i < data.items.length; i++) {
                var card = buildHomeCard(data.items[i]);

                card.style.display = 'inline-block';
                card.style.verticalAlign = 'top';
                card.style.marginRight = '12px';
                card.style.whiteSpace = 'normal';

                scroll.appendChild(card);
            }
        });
    }

    function buildHomeCard(item) {
        var serverId = typeof ApiClient !== 'undefined' && ApiClient.serverId ? ApiClient.serverId() : '';

        var isBackdrop = item.type === 'Episode' || item.type === 'Video' || item.type === 'CollectionFolder';
        var cardClass = isBackdrop ? 'overflowBackdropCard' : 'overflowPortraitCard';
        var padderClass = isBackdrop ? 'cardPadder-overflowBackdrop' : 'cardPadder-overflowPortrait';
        var isFolder = item.isFolder || item.type === 'Series' || item.type === 'CollectionFolder' ? 'true' : 'false';

        var card = document.createElement('div');
        card.className = 'card ' + cardClass + ' card-hoverable card-withuserdata';

        card.setAttribute('data-id', item.id);
        card.setAttribute('data-type', item.type);
        card.setAttribute('data-serverid', serverId);
        card.setAttribute('data-isfolder', isFolder);
        if (item.mediaType) { card.setAttribute('data-mediatype', item.mediaType); }

        card.style.position = 'relative';

        var cardBox = document.createElement('div');
        cardBox.className = 'cardBox cardBox-bottompadded';

        var cardScalable = document.createElement('div');
        cardScalable.className = 'cardScalable';

        var cardPadder = document.createElement('div');
        cardPadder.className = 'cardPadder ' + padderClass;

        var imgSrc = item.imageTags && item.imageTags.Primary && !isBackdrop
            ? imageUrl(item.id, item.imageTags.Primary, 'Primary', 400)
            : (item.imageTags && item.imageTags.Thumb ? imageUrl(item.id, item.imageTags.Thumb, 'Thumb', 400) : '');

        var hash = '#/details?id=' + item.id + '&serverId=' + serverId;

        var cardImageContainer = document.createElement('a');
        cardImageContainer.className = 'cardImageContainer coveredImage cardContent itemAction lazy lazy-image-fadein-fast';
        cardImageContainer.setAttribute('data-action', 'link');
        cardImageContainer.href = hash;

        if (imgSrc) {
            cardImageContainer.style.backgroundImage = 'url("' + imgSrc + '")';
        }

        var overlay = document.createElement('div');
        overlay.className = 'cardOverlayContainer itemAction';
        overlay.setAttribute('data-action', 'link');

        var playBtn = document.createElement('button');
        playBtn.setAttribute('is', 'paper-icon-button-light');
        playBtn.className = 'cardOverlayFab-primary itemAction paper-icon-button-light';
        playBtn.setAttribute('data-action', 'resume');
        playBtn.title = 'Play';
        playBtn.innerHTML = '<span class="material-icons cardOverlayFabIcon play_arrow" aria-hidden="true"></span>';
        overlay.appendChild(playBtn);

        var overlayBtnContainer = document.createElement('div');
        overlayBtnContainer.className = 'cardOverlayButton-br flex';

        var moreBtn = document.createElement('button');
        moreBtn.setAttribute('is', 'paper-icon-button-light');
        moreBtn.className = 'cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light';
        moreBtn.setAttribute('data-action', 'menu');
        moreBtn.title = 'More';
        moreBtn.innerHTML = '<span class="material-icons cardOverlayButtonIcon cardOverlayButtonIcon-hover more_vert" aria-hidden="true"></span>';

        overlayBtnContainer.appendChild(moreBtn);
        overlay.appendChild(overlayBtnContainer);

        cardScalable.appendChild(cardPadder);
        cardScalable.appendChild(cardImageContainer);
        cardScalable.appendChild(overlay);

        var cardText1 = document.createElement('div');
        cardText1.className = 'cardText cardTextCentered cardText-first';
        cardText1.innerHTML = '<bdi><a href="' + hash + '" class="itemAction textActionButton" data-action="link">' + escapeHtml(item.name) + '</a></bdi>';

        var cardText2 = document.createElement('div');
        cardText2.className = 'cardText cardTextCentered cardText-secondary';
        var metaText = item.productionYear || item.seriesName || '';
        cardText2.innerHTML = '<bdi>' + escapeHtml(metaText) + '</bdi>';

        cardBox.appendChild(cardScalable);
        cardBox.appendChild(cardText1);
        if (metaText) {
            cardBox.appendChild(cardText2);
        }

        card.appendChild(cardBox);
        
        if (state.config && state.config.features.watchlist) {
            var wlBtn = document.createElement('button');
            wlBtn.className = 'kf-wl-btn';
            wlBtn.dataset.itemId = item.id;
            var inWl = !!watchlistSet[item.id];

            wlBtn.style.cssText = 'position:absolute;top:6px;right:6px;z-index:10;background:rgba(0,0,0,0.65);border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:transform 0.15s,background 0.15s;';
            wlBtn.title = inWl ? 'Remove from Watchlist' : 'Add to Watchlist';
            wlBtn.innerHTML = inWl ? watchlistIconFilled() : watchlistIconEmpty();

            wlBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                toggleWatchlist(this);
            });

            card.appendChild(wlBtn);
        }

        return card;
    }

    function injectSettingsButton() {
        if (document.getElementById('kf-settings-btn')) { return; }
        var header = findHeaderButtonRow();
        if (!header) { return; }

        var btn = makeHeaderIconBtn(
            'kf-settings-btn',
            'KefinFrame Settings',
            '<path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94zM12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>'
        );
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            openSettingsPanel();
        });
        header.insertBefore(btn, header.firstChild);
    }

    function openSettingsPanel() {
        closeAllPanels();
        var panel = buildPanel('kf-settings-panel', 'KefinFrame Settings', buildSettingsContent());
        document.body.appendChild(panel);
        animateIn(panel);
    }

    function buildSettingsContent() {
        var wrap = document.createElement('div');

        var sectionTitle = function (text) {
            var el = document.createElement('div');
            el.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#00a4dc;padding:16px 0 8px;';
            el.textContent = text;
            return el;
        };

        wrap.appendChild(sectionTitle('Features'));

        var features = [
            { key: 'watchlist', label: 'Watchlist', desc: 'Bookmark button on all media cards' },
            { key: 'skinSwitcher', label: 'Appearance Switcher', desc: 'Theme/skin button in header' },
            { key: 'customHomeSections', label: 'Custom Home Sections', desc: 'Add extra sections to your home screen' },
            { key: 'enhancedSearch', label: 'Enhanced Search', desc: 'Full-screen search overlay (/ or Ctrl+K)' },
            { key: 'customNavLinks', label: 'Custom Nav Links', desc: 'Add links to the navigation drawer' }
        ];

        for (var i = 0; i < features.length; i++) {
            var f = features[i];
            var row = buildToggleRow(f.label, f.desc, state.config.features[f.key], f.key);
            wrap.appendChild(row);
        }

        wrap.appendChild(sectionTitle('Custom Nav Links'));
        var navLinkEditor = buildNavLinkEditor();
        wrap.appendChild(navLinkEditor);

        if (state.config.features.customHomeSections) {
            wrap.appendChild(sectionTitle('Home Screen Sections'));
            var homeSectionEditor = buildHomeSectionEditor();
            wrap.appendChild(homeSectionEditor);
        }

        wrap.appendChild(sectionTitle('Data'));
        var dataRow = document.createElement('div');
        dataRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

        var exportBtn = buildSmallBtn('Export Config', function () {
            apiGet('/config/export?userId=' + state.userId, function (err, data) {
                if (err || !data) { return; }
                var json = JSON.stringify(data, null, 2);
                var ta = document.createElement('textarea');
                ta.value = json;
                ta.style.cssText = 'position:fixed;left:-9999px;';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                showToast('Config copied to clipboard');
            });
        });

        var importBtn = buildSmallBtn('Import Config', function () {
            var json = window.prompt('Paste exported JSON:');
            if (!json) { return; }
            try {
                var data = JSON.parse(json);
                apiPost('/config/import', { userId: state.userId, config: data.config, watchlist: data.watchlist }, function (err) {
                    if (err) { showToast('Import failed'); return; }
                    apiGet('/config?userId=' + state.userId, function (e2, cfg) {
                        if (!e2 && cfg) { state.config = cfg; applyAll(); }
                    });
                    showToast('Config imported');
                    closeAllPanels();
                });
            } catch (e) { showToast('Invalid JSON'); }
        });

        var resetBtn = buildSmallBtn('Reset to Defaults', function () {
            if (!window.confirm('Reset all KefinFrame settings to defaults?')) { return; }
            apiPost('/config/reset', { userId: state.userId }, function (err) {
                if (err) { return; }
                apiGet('/config?userId=' + state.userId, function (e2, cfg) {
                    if (!e2 && cfg) { state.config = cfg; applyAll(); }
                });
                showToast('Settings reset');
                closeAllPanels();
            });
        });
        resetBtn.style.background = 'rgba(220,50,50,0.2)';
        resetBtn.style.borderColor = 'rgba(220,50,50,0.4)';

        dataRow.appendChild(exportBtn);
        dataRow.appendChild(importBtn);
        dataRow.appendChild(resetBtn);
        wrap.appendChild(dataRow);

        return wrap;
    }

    function buildToggleRow(label, desc, isOn, featureKey) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);';

        var left = document.createElement('div');
        left.style.cssText = 'flex:1;';
        left.innerHTML = '<div style="font-size:13px;font-weight:500;">' + escapeHtml(label) + '</div>'
            + '<div style="font-size:11px;color:#777;margin-top:2px;">' + escapeHtml(desc) + '</div>';

        var toggle = document.createElement('div');
        toggle.style.cssText = 'width:42px;height:24px;border-radius:12px;background:' + (isOn ? '#00a4dc' : '#333') + ';position:relative;cursor:pointer;transition:background 0.2s;flex-shrink:0;margin-left:12px;';
        var knob = document.createElement('div');
        knob.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:3px;left:' + (isOn ? '21px' : '3px') + ';transition:left 0.2s;';
        toggle.appendChild(knob);
        toggle.dataset.on = isOn ? '1' : '0';
        toggle.dataset.key = featureKey;

        toggle.addEventListener('click', function () {
            var on = this.dataset.on === '1';
            on = !on;
            this.dataset.on = on ? '1' : '0';
            this.style.background = on ? '#00a4dc' : '#333';
            knob.style.left = on ? '21px' : '3px';
            state.config.features[featureKey] = on;
            var update = { userId: state.userId, features: {} };
            update.features[featureKey] = on;
            apiPost('/config', update, null);
        });

        row.appendChild(left);
        row.appendChild(toggle);
        return row;
    }

    function buildNavLinkEditor() {
        var wrap = document.createElement('div');
        var links = state.config.navLinks || [];

        function render() {
            wrap.innerHTML = '';
            for (var i = 0; i < links.length; i++) {
                (function (idx) {
                    var link = links[idx];
                    var row = document.createElement('div');
                    row.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';

                    var labelInput = document.createElement('input');
                    labelInput.type = 'text';
                    labelInput.placeholder = 'Label';
                    labelInput.value = link.label || '';
                    labelInput.style.cssText = 'flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:6px 10px;color:#fff;font-size:12px;outline:none;';
                    labelInput.addEventListener('input', function () { links[idx].label = this.value; });

                    var urlInput = document.createElement('input');
                    urlInput.type = 'text';
                    urlInput.placeholder = 'URL';
                    urlInput.value = link.url || '';
                    urlInput.style.cssText = 'flex:2;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:6px 10px;color:#fff;font-size:12px;outline:none;';
                    urlInput.addEventListener('input', function () { links[idx].url = this.value; });

                    var del = document.createElement('button');
                    del.textContent = 'x';
                    del.style.cssText = 'background:rgba(200,50,50,0.3);border:none;border-radius:4px;width:24px;height:24px;cursor:pointer;color:#fff;font-size:12px;';
                    del.addEventListener('click', function () {
                        links.splice(idx, 1);
                        render();
                    });

                    row.appendChild(labelInput);
                    row.appendChild(urlInput);
                    row.appendChild(del);
                    wrap.appendChild(row);
                }(i));
            }

            var addBtn = document.createElement('button');
            addBtn.textContent = '+ Add Link';
            addBtn.style.cssText = 'background:rgba(0,164,220,0.15);border:1px solid rgba(0,164,220,0.3);border-radius:6px;padding:6px 14px;color:#00a4dc;font-size:12px;cursor:pointer;margin-top:4px;';
            addBtn.addEventListener('click', function () {
                links.push({ label: '', url: '' });
                render();
            });

            var saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save Links';
            saveBtn.style.cssText = 'background:rgba(0,164,220,0.3);border:1px solid rgba(0,164,220,0.5);border-radius:6px;padding:6px 14px;color:#fff;font-size:12px;cursor:pointer;margin-top:4px;margin-left:8px;';
            saveBtn.addEventListener('click', function () {
                var valid = links.filter(function (l) { return l.url; });
                state.config.navLinks = valid;
                apiPost('/config', { userId: state.userId, navLinks: valid }, null);
                applyNavLinks();
                showToast('Nav links saved');
            });

            var btnRow = document.createElement('div');
            btnRow.appendChild(addBtn);
            btnRow.appendChild(saveBtn);
            wrap.appendChild(btnRow);
        }
        render();
        return wrap;
    }

    function buildHomeSectionEditor() {
        var wrap = document.createElement('div');

        apiGet('/home/sections/available?userId=' + state.userId, function (err, data) {
            if (err || !data) { return; }
            var available = data.sections;
            var active = state.config.homeSections || [];

            wrap.innerHTML = '<div style="font-size:11px;color:#888;margin-bottom:8px;">Choose sections to show on your home screen. Drag to reorder (save to apply).</div>';

            for (var i = 0; i < available.length; i++) {
                var sec = available[i];
                var isEnabled = false;
                for (var j = 0; j < active.length; j++) {
                    if (active[j].id === sec.id && active[j].enabled) { isEnabled = true; break; }
                }

                var row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);';

                var nameEl = document.createElement('div');
                nameEl.style.cssText = 'font-size:13px;';
                nameEl.textContent = sec.name;

                var chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.checked = isEnabled;
                chk.style.cssText = 'width:16px;height:16px;cursor:pointer;accent-color:#00a4dc;';
                chk.dataset.secId = sec.id;

                (function (section) {
                    chk.addEventListener('change', function () {
                        var found = false;
                        for (var k = 0; k < active.length; k++) {
                            if (active[k].id === section.id) {
                                active[k].enabled = this.checked;
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            active.push({
                                id: section.id,
                                name: section.name,
                                type: section.type,
                                mediaType: section.mediaType || '',
                                libraryId: section.libraryId || '',
                                enabled: this.checked,
                                limit: 20
                            });
                        }
                    });
                }(sec));

                row.appendChild(nameEl);
                row.appendChild(chk);
                wrap.appendChild(row);
            }

            var saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save Home Sections';
            saveBtn.style.cssText = 'background:rgba(0,164,220,0.3);border:1px solid rgba(0,164,220,0.5);border-radius:6px;padding:8px 16px;color:#fff;font-size:12px;cursor:pointer;margin-top:12px;width:100%;';
            saveBtn.addEventListener('click', function () {
                state.config.homeSections = active;
                apiPost('/config', { userId: state.userId, homeSections: active }, null);
                showToast('Home sections saved');

                if (isHomePage()) { injectHomeSections(true); }
            });
            wrap.appendChild(saveBtn);
        });

        return wrap;
    }

    function buildSmallBtn(label, fn) {
        var btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = 'background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:7px 14px;color:#ddd;font-size:12px;cursor:pointer;';
        btn.addEventListener('click', fn);
        return btn;
    }

    function buildPanel(id, title, content) {
        var overlay = document.createElement('div');
        overlay.id = id + '-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,0.55);';
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) { closeAllPanels(); }
        });

        var panel = document.createElement('div');
        panel.id = id;
        panel.style.cssText = 'position:fixed;top:0;right:0;bottom:0;width:360px;max-width:100vw;background:#141428;z-index:9991;display:flex;flex-direction:column;box-shadow:-8px 0 40px rgba(0,0,0,0.5);transform:translateX(100%);transition:transform 0.25s cubic-bezier(0.4,0,0.2,1);';

        var header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;';

        var titleEl = document.createElement('h3');
        titleEl.style.cssText = 'margin:0;font-size:16px;font-weight:700;color:#fff;';
        titleEl.textContent = title;

        var closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:#888;padding:4px;';
        closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
        closeBtn.addEventListener('click', closeAllPanels);

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        var body = document.createElement('div');
        body.className = 'kf-panel-body';
        body.style.cssText = 'flex:1;overflow-y:auto;padding:16px 20px;';
        if (content) { body.appendChild(content); }

        panel.appendChild(header);
        panel.appendChild(body);
        overlay.appendChild(panel);
        return overlay;
    }

    function animateIn(panelOverlay) {
        var panel = panelOverlay.querySelector('[id$="-panel"]');
        if (panel) {
            requestAnimationFrame(function () {
                panel.style.transform = 'translateX(0)';
            });
        }
    }

    function closeAllPanels() {
        var panels = document.querySelectorAll('[id$="-panel-overlay"]');
        for (var i = 0; i < panels.length; i++) {
            panels[i].parentNode && panels[i].parentNode.removeChild(panels[i]);
        }
        closeSearchOverlay();
    }

    function showToast(msg) {
        var toast = document.getElementById('kf-toast');
        if (toast) { toast.parentNode.removeChild(toast); }
        toast = document.createElement('div');
        toast.id = 'kf-toast';
        toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1e1e3a;border:1px solid rgba(0,164,220,0.4);color:#e0e0e0;font-size:13px;padding:10px 20px;border-radius:8px;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.4);pointer-events:none;opacity:0;transition:opacity 0.2s;';
        toast.textContent = msg;
        document.body.appendChild(toast);
        requestAnimationFrame(function () { toast.style.opacity = '1'; });
        setTimeout(function () {
            toast.style.opacity = '0';
            setTimeout(function () { if (toast.parentNode) { toast.parentNode.removeChild(toast); } }, 300);
        }, 2800);
    }

    // Wait for DOM + ApiClient before starting
    function boot() {
        if (typeof ApiClient !== 'undefined' && document.body) {
            // Load watchlist set first, then full init
            getJellyfinUser(function (user) {
                if (!user) { setTimeout(boot, 800); return; }
                state.userId = user.Id || user.id;
                loadWatchlistSet(function () { init(); });
            });
        } else {
            setTimeout(boot, 400);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.addEventListener('hashchange', function () {
        if (state.initialized && state.config && state.config.features.enhancedSearch) {
            initEnhancedSearch();
        }
    });

    window.__kefinFrame = {
        state: state,
        reload: function () { state.initialized = false; boot(); },
        openSettings: openSettingsPanel,
        openSkins: openSkinPanel
    };

    var _applyAll = applyAll;
    applyAll = function () {
        _applyAll();
        if (state.config && state.config.features.enhancedSearch) {
            initEnhancedSearch();
        }
    };

}());
