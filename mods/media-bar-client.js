/**
 * Jellyfin Movie Gallery - Framework Component (V7)
 * FULL REFACTOR: Restored Playback API, Server-Mod Fallbacks, and Favorite Polling.
 */
(function () {
    'use strict';

    /* ── 1. Configuration ────────────────────────────────────────────────── */
    var INTERVAL_MS = parseInt('{{SLIDE_INTERVAL}}', 10) || 8000;
    var API_BASE    = '/JellyFrame/mods/media-bar/api';
    var BAR_ID      = 'jf-media-bar';
    
    var currentIndex = 0;
    var timer        = null;
    var isFetching   = false;

    /* ── 2. Playback Engine (The Missing Endpoint Logic) ─────────────────── */
    function playNow(item) {
        if (typeof ApiClient === 'undefined') return;

        ApiClient.getJSON(ApiClient.getUrl('Sessions')).then(function (sessions) {
            var deviceId = typeof ApiClient.deviceId === 'function' ? ApiClient.deviceId() : null;
            var sessionId = null;

            // Find session for current device
            for (var i = 0; i < sessions.length; i++) {
                if (deviceId && sessions[i].DeviceId === deviceId) {
                    sessionId = sessions[i].Id;
                    break;
                }
            }

            // Fallback to any Web client
            if (!sessionId) {
                for (var j = 0; j < sessions.length; j++) {
                    if (sessions[j].Client && sessions[j].Client.indexOf('Web') !== -1) {
                        sessionId = sessions[j].Id;
                        break;
                    }
                }
            }

            if (!sessionId && sessions.length > 0) sessionId = sessions[0].Id;
            if (!sessionId) return;

            var playUrl = ApiClient.getUrl('Sessions/' + sessionId + '/Playing') + '?playCommand=PlayNow&itemIds=' + item.id;
            var headers = { 'Accept': 'application/json' };

            if (typeof ApiClient.getAuthorizationHeader === 'function') {
                headers['Authorization'] = ApiClient.getAuthorizationHeader();
            } else if (typeof ApiClient.accessToken === 'function') {
                headers['Authorization'] = 'MediaBrowser Token="' + ApiClient.accessToken() + '"';
            }

            fetch(playUrl, { method: 'POST', headers: headers }).catch(err => console.error('[media-bar] Play failed', err));
        });
    }

    /* ── 3. Gallery Styles (Scoped to #app-area) ────────────────────────── */
    const injectStyles = () => {
        if (document.getElementById('jf-media-bar-style')) return;
        var s = document.createElement('style');
        s.id = 'jf-media-bar-style';
        s.textContent = `
            #${BAR_ID} { position: relative; height: 450px; overflow: hidden; background: #000; padding: 0 !important; }
            .jfmb-slide { position: absolute; inset: 0; background-size: cover; background-position: center 20%; opacity: 0; transition: opacity 1s; z-index: 1; cursor: pointer; display: flex; align-items: flex-end; }
            .jfmb-slide.active { opacity: 1; z-index: 2; }
            .jfmb-overlay { width: 100%; padding: 100px 48px 36px; background: linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.45) 55%, transparent 100%); color: #fff; pointer-events: none; }
            .jfmb-logo { max-height: 80px; max-width: 320px; object-fit: contain; display: block; margin-bottom: 14px; filter: brightness(1.2); }
            .jfmb-title { font-size: 2.4em; font-weight: 700; margin-bottom: 10px; text-shadow: 1px 2px 6px rgba(0,0,0,.8); line-height: 1.1; }
            .jfmb-meta { font-size: 1.05em; color: rgba(255,255,255,.75); display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
            .jfmb-rating { color: #facc15; font-weight: 600; }
            .jfmb-overview { font-size: .95em; color: rgba(255,255,255,.7); max-width: 620px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 20px; }
            .jfmb-buttons { display: flex; gap: 12px; pointer-events: auto; }
            .jfmb-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 42px; padding: 0 20px; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; transition: transform .15s; }
            .jfmb-btn-play { background: #fff; color: #000; }
            .jfmb-btn-info { background: rgba(255,255,255,.18); color: #fff; backdrop-filter: blur(4px); }
            .jfmb-btn-fav { background: rgba(255,255,255,.12); color: #fff; min-width: 42px; font-size: 1.1em; backdrop-filter: blur(4px); }
            .jfmb-btn-fav.active { color: #f87171; }
            .jfmb-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 10; cursor: pointer; background: rgba(0,0,0,.4); border: none; color: #fff; width: 44px; height: 44px; border-radius: 50%; font-size: 1.6em; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
            .jfmb-arrow-left { left: 16px; } .jfmb-arrow-right { right: 16px; }
            .jfmb-dots { position: absolute; bottom: 16px; right: 20px; z-index: 10; display: flex; gap: 7px; }
            .jfmb-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.4); cursor: pointer; transition: .3s; }
            .jfmb-dot.active { background: #fff; transform: scale(1.5); }
        `;
        document.head.appendChild(s);
    }

    /* ── 4. Data Logic (Restored Fetching & Formatting) ──────────────────── */
    function formatRuntime(ticks) {
        if (!ticks) return '';
        var m = Math.floor(ticks / 600000000);
        return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm';
    }

    function fetchItems() {
        var userId = (typeof ApiClient !== 'undefined') ? ApiClient.getCurrentUserId() : null;
        // Attempt Server Mod API first
        return fetch(API_BASE + '/items' + (userId ? '?userId=' + encodeURIComponent(userId) : ''))
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => data.items || [])
            .catch(() => {
                // Fallback to Standard ApiClient
                if (typeof ApiClient === 'undefined') return [];
                return ApiClient.getJSON(ApiClient.getUrl('Users/' + userId + '/Items', {
                    IncludeItemTypes: 'Movie,Series', Limit: 10, SortBy: 'Random', Filters: 'IsUnplayed', Recursive: true,
                    Fields: 'CommunityRating,ProductionYear,Overview,Genres,OfficialRating,RunTimeTicks', ImageTypes: 'Backdrop'
                })).then(res => (res.Items || []).map(item => {
                    var bdTag = item.BackdropImageTags && item.BackdropImageTags[0];
                    if (!bdTag) return null;
                    return {
                        id: item.Id, name: item.Name, overview: item.Overview, year: item.ProductionYear,
                        communityRating: item.CommunityRating, isFavorite: !!(item.UserData && item.UserData.IsFavorite),
                        backdropUrl: ApiClient.getImageUrl(item.Id, { type: 'Backdrop', maxWidth: 1920, tag: bdTag }),
                        logoUrl: item.ImageTags.Logo ? ApiClient.getImageUrl(item.Id, { type: 'Logo', maxWidth: 400, tag: item.ImageTags.Logo }) : null
                    };
                }).filter(Boolean));
            });
    }

    /* ── 5. Build Component ──────────────────────────────────────────────── */
    function buildBar(items) {
        var bar = document.createElement('div');
        bar.id = BAR_ID;
        bar.className = "app col-12"; // Framework: Style as App, Span all 12 columns

        var slideEls = [], dotEls = [];
        currentIndex = 0;

        items.forEach((item, i) => {
            var slide = document.createElement('div');
            slide.className = 'jfmb-slide' + (i === 0 ? ' active' : '');
            slide.style.backgroundImage = `url('${item.backdropUrl}')`;

            var overlay = document.createElement('div');
            overlay.className = 'jfmb-overlay';

            // Logo/Title Logic
            if (item.logoUrl) {
                overlay.innerHTML = `<img class="jfmb-logo" src="${item.logoUrl}">`;
            } else {
                overlay.innerHTML = `<div class="jfmb-title">${item.name}</div>`;
            }

            // Meta Info
            var meta = `<div class="jfmb-meta">`;
            if (item.communityRating) meta += `<span class="jfmb-rating">★ ${item.communityRating.toFixed(1)}</span>`;
            if (item.year) meta += `<span>${item.year}</span>`;
            meta += `</div><div class="jfmb-overview">${item.overview || ''}</div>`;
            overlay.innerHTML += meta;

            // Buttons
            var btns = document.createElement('div');
            btns.className = 'jfmb-buttons';

            var pBtn = document.createElement('button');
            pBtn.className = 'jfmb-btn jfmb-btn-play';
            pBtn.innerHTML = '&#9654; Play Now';
            pBtn.onclick = (e) => { e.stopPropagation(); playNow(item); };

            var iBtn = document.createElement('button');
            iBtn.className = 'jfmb-btn jfmb-btn-info';
            iBtn.textContent = 'More Info';
            iBtn.onclick = (e) => { e.stopPropagation(); window.location.hash = `#!/details?id=${item.id}`; };

            var fBtn = document.createElement('button');
            fBtn.className = 'jfmb-btn jfmb-btn-fav' + (item.isFavorite ? ' active' : '');
            fBtn.setAttribute('data-jfmb-item', item.id);
            fBtn.innerHTML = item.isFavorite ? '&#9829;&#xFE0E;' : '&#9825;&#xFE0E;';
            fBtn.onclick = (e) => {
                e.stopPropagation();
                item.isFavorite = !item.isFavorite;
                fBtn.classList.toggle('active', item.isFavorite);
                fBtn.innerHTML = item.isFavorite ? '&#9829;&#xFE0E;' : '&#9825;&#xFE0E;';
                fetch(API_BASE + '/favourite/' + item.id, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ favourite: item.isFavorite, userId: ApiClient.getCurrentUserId() })
                });
            };

            btns.append(pBtn, iBtn, fBtn);
            overlay.appendChild(btns);
            slide.appendChild(overlay);

            slide.onclick = (e) => {
                if (e.target.closest('button')) return;
                window.location.hash = `#!/details?id=${item.id}`;
            };

            bar.appendChild(slide);
            slideEls.push(slide);
        });

        // Rotation
        const goTo = (idx) => {
            slideEls[currentIndex].classList.remove('active');
            dotEls[currentIndex]?.classList.remove('active');
            currentIndex = (idx + items.length) % items.length;
            slideEls[currentIndex].classList.add('active');
            dotEls[currentIndex]?.classList.add('active');
        };

        var left = document.createElement('button');
        left.className = 'jfmb-arrow jfmb-arrow-left';
        left.innerHTML = '&#8249;';
        left.onclick = (e) => { e.stopPropagation(); goTo(currentIndex - 1); };
        
        var right = document.createElement('button');
        right.className = 'jfmb-arrow jfmb-arrow-right';
        right.innerHTML = '&#8250;';
        right.onclick = (e) => { e.stopPropagation(); goTo(currentIndex + 1); };

        var dotsWrap = document.createElement('div');
        dotsWrap.className = 'jfmb-dots';
        items.forEach((_, i) => {
            var d = document.createElement('div');
            d.className = 'jfmb-dot' + (i === 0 ? ' active' : '');
            d.onclick = (e) => { e.stopPropagation(); goTo(i); };
            dotsWrap.appendChild(d);
            dotEls.push(d);
        });

        bar.append(left, right, dotsWrap);
        timer = setInterval(() => goTo(currentIndex + 1), INTERVAL_MS);
        return bar;
    }

    /* ── 6. Lifecycle & Polling ────────────────────────────────────────── */
    const init = () => {
        const area = document.getElementById('app-area');
        if (!area || document.getElementById(BAR_ID) || isFetching) return;

        isFetching = true;
        injectStyles();
        fetchItems().then(items => {
            isFetching = false;
            if (items.length > 0) area.prepend(buildBar(items));
        });
    };

    // Polling for Favorite status (Syncing with other clients)
    setInterval(() => {
        if (!document.getElementById(BAR_ID)) return;
        var userId = (typeof ApiClient !== 'undefined') ? ApiClient.getCurrentUserId() : null;
        fetch(API_BASE + '/items' + (userId ? '?userId=' + encodeURIComponent(userId) : ''))
            .then(r => r.json()).then(data => {
                if (!data.items) return;
                data.items.forEach(itm => {
                    var btn = document.querySelector(`[data-jfmb-item="${itm.id}"]`);
                    if (btn) {
                        btn.classList.toggle('active', itm.isFavorite);
                        btn.innerHTML = itm.isFavorite ? '&#9829;&#xFE0E;' : '&#9825;&#xFE0E;';
                    }
                });
            }).catch(() => {});
    }, 5000);

    window.addEventListener('jfAppAreaReady', init);
    setInterval(init, 2000);
})();
