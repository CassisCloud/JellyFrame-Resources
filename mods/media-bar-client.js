/**
 * Jellyfin Movie Gallery App
 * Retro-fitted for the 12-column Framework.
 */
(function () {
    'use strict';

    /* ── 1. Configuration ────────────────────────────────────────────────── */
    var INTERVAL_MS = 8000;
    var API_BASE    = '/JellyFrame/mods/media-bar/api';
    var BAR_ID      = 'jf-media-bar';

    var currentIndex = 0;
    var timer        = null;
    var paused       = false;

    /* ── 2. Gallery Specific Styles ──────────────────────────────────────── */
    const injectGalleryStyles = () => {
        if (document.getElementById('jf-gallery-styles')) return;
        const s = document.createElement('style');
        s.id = 'jf-gallery-styles';
        s.textContent = `
            #${BAR_ID} {
                position: relative; 
                height: 450px;
                overflow: hidden; 
                background: #000;
                padding: 0 !important; /* Edge-to-edge media */
            }
            .jfmb-slide {
                position: absolute; inset: 0;
                background-size: cover; background-position: center 20%;
                opacity: 0; transition: opacity 1s ease-in-out;
                z-index: 1; cursor: pointer;
                display: flex; align-items: flex-end;
            }
            .jfmb-slide.active { opacity: 1; z-index: 2; }
            .jfmb-overlay {
                width: 100%; padding: 100px 48px 36px;
                background: linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.45) 55%, transparent 100%);
                color: #fff; pointer-events: none;
            }
            .jfmb-logo { max-height: 80px; max-width: 320px; object-fit: contain; display: block; margin-bottom: 14px; filter: brightness(1.2); }
            .jfmb-title { font-size: 2.4em; font-weight: 700; margin: 0 0 10px; text-shadow: 1px 2px 6px rgba(0,0,0,.8); line-height: 1.1; }
            .jfmb-meta { font-size: 1.05em; color: rgba(255,255,255,.75); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
            .jfmb-rating { color: #facc15; font-weight: 600; }
            .jfmb-sep { font-size: 6px; opacity: .5; line-height: 1; }
            .jfmb-overview { font-size: .95em; color: rgba(255,255,255,.7); max-width: 620px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 20px; }
            .jfmb-buttons { display: flex; gap: 12px; pointer-events: auto; }
            .jfmb-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 42px; padding: 0 20px; box-sizing: border-box; border: none; border-radius: 6px; font-size: .95em; font-weight: 700; cursor: pointer; transition: opacity .2s, transform .15s; }
            .jfmb-btn:hover { opacity: .85; transform: translateY(-1px); }
            .jfmb-btn-play { background: #fff; color: #000; }
            .jfmb-btn-info { background: rgba(255,255,255,.18); color: #fff; backdrop-filter: blur(4px); }
            .jfmb-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 10; cursor: pointer; background: rgba(0,0,0,.4); border: none; color: #fff; width: 44px; height: 44px; border-radius: 50%; font-size: 1.6em; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
            .jfmb-dots { position: absolute; bottom: 16px; right: 20px; z-index: 10; display: flex; gap: 7px; }
            .jfmb-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.4); cursor: pointer; }
            .jfmb-dot.active { background: #fff; transform: scale(1.5); }
        `;
        document.head.appendChild(s);
    }

    /* ── 3. Data Fetching (ApiClient Logic preserved) ─────────────────────── */
    function fetchItems() {
        if (typeof ApiClient === 'undefined') return Promise.resolve([]);
        var userId = ApiClient.getCurrentUserId();
        return ApiClient.getJSON(ApiClient.getUrl('Users/' + userId + '/Items', {
            IncludeItemTypes: 'Movie,Series',
            Limit: 10,
            SortBy: 'Random',
            Filters: 'IsUnplayed',
            Fields: 'CommunityRating,ProductionYear,Overview,Genres,OfficialRating,RunTimeTicks',
            Recursive: true,
            ImageTypes: 'Backdrop'
        })).then(res => (res.Items || []).map(item => {
            var bdTag = item.BackdropImageTags && item.BackdropImageTags[0];
            var logoTag = item.ImageTags && item.ImageTags.Logo;
            if (!bdTag) return null;
            return {
                id: item.Id,
                name: item.Name,
                overview: item.Overview,
                year: item.ProductionYear,
                communityRating: item.CommunityRating,
                backdropUrl: ApiClient.getImageUrl(item.Id, { type: 'Backdrop', maxWidth: 1920, tag: bdTag }),
                logoUrl: logoTag ? ApiClient.getImageUrl(item.Id, { type: 'Logo', maxWidth: 400, tag: logoTag }) : null
            };
        }).filter(Boolean));
    }

    /* ── 4. Build Component ──────────────────────────────────────────────── */
    function buildBar(items) {
        var bar = document.createElement('div');
        bar.id = BAR_ID;
        bar.className = "app col-12"; // Takes all 12 columns

        var slideEls = [];
        var dotEls   = [];

        items.forEach((item, i) => {
            var slide = document.createElement('div');
            slide.className = 'jfmb-slide' + (i === 0 ? ' active' : '');
            slide.style.backgroundImage = `url('${item.backdropUrl}')`;

            var overlay = document.createElement('div');
            overlay.className = 'jfmb-overlay';
            
            if (item.logoUrl) {
                overlay.innerHTML = `<img class="jfmb-logo" src="${item.logoUrl}" alt="${item.name}">`;
            } else {
                overlay.innerHTML = `<div class="jfmb-title">${item.name}</div>`;
            }

            overlay.innerHTML += `
                <div class="jfmb-meta">
                    <span class="jfmb-rating">★ ${item.communityRating ? item.communityRating.toFixed(1) : 'N/A'}</span>
                    <span class="jfmb-sep"> * </span>
                    <span>${item.year || ''}</span>
                </div>
                <div class="jfmb-overview">${item.overview || ''}</div>
                <div class="jfmb-buttons">
                    <button class="jfmb-btn jfmb-btn-play">▶ Play Now</button>
                    <button class="jfmb-btn jfmb-btn-info">More Info</button>
                </div>
            `;

            slide.appendChild(overlay);
            bar.appendChild(slide);
            slideEls.push(slide);
        });

        // Simple Slide Logic
        const goTo = (idx) => {
            slideEls[currentIndex].classList.remove('active');
            currentIndex = (idx + items.length) % items.length;
            slideEls[currentIndex].classList.add('active');
        };

        timer = setInterval(() => goTo(currentIndex + 1), INTERVAL_MS);

        return bar;
    }

    /* ── 5. Integration ──────────────────────────────────────────────────── */
    const initGallery = () => {
        const area = document.getElementById('app-area');
        if (!area || document.getElementById(BAR_ID)) return;

        injectGalleryStyles();
        fetchItems().then(items => {
            if (items.length > 0) {
                area.prepend(buildBar(items)); // Prepend to keep gallery at the very top
                console.log("[Gallery] Injected into 12-column slot.");
            }
        });
    };

    window.addEventListener('jfAppAreaReady', initGallery);
    // Polling fallback for SPA navigation
    setInterval(initGallery, 2000);

})();
