// =============================================================================
// KefinFrame - Server Script
// Runs inside Jellyfin via Jint (ES2022 subset, no DOM, no fetch)
// Provides per-user config storage and watchlist management via jf.userStore
// All watchlist items are backed by a real Jellyfin playlist per user
// =============================================================================

jf.onStart(function () {
    jf.log.info('KefinFrame server started');
    jf.scheduler.interval(10 * 60 * 1000, function () {
        cleanExpiredCaches();
    });
    jf.jellyfin.on('item.removed', function (data) {
        // When an item is removed from Jellyfin, scrub it from all watchlists
        if (data && data.itemId) {
            scrubItemFromAllWatchlists(data.itemId);
        }
    });
});

jf.onStop(function () {
    jf.scheduler.cancelAll();
    jf.jellyfin.off('item.removed');
    jf.log.info('KefinFrame server stopped');
});

function defaultUserConfig() {
    return {
        features: {
            watchlist: true,
            skinSwitcher: true,
            customHomeSections: true,
            enhancedSearch: true,
            customNavLinks: true
        },
        skin: {
            activeSkin: '',
            activeColorScheme: ''
        },
        homeSections: [],
        navLinks: [],
        search: {
            jellyseerrEnabled: false,
            jellyseerrUrl: ''
        }
    };
}

function getUserConfig(userId) {
    var raw = jf.userStore.get(userId, 'config');
    if (!raw) {
        return defaultUserConfig();
    }
    try {
        var parsed = JSON.parse(raw);
        // Merge with defaults so new fields added in future versions are always present
        var def = defaultUserConfig();
        if (!parsed.features) { parsed.features = def.features; }
        if (!parsed.skin) { parsed.skin = def.skin; }
        if (!parsed.homeSections) { parsed.homeSections = def.homeSections; }
        if (!parsed.navLinks) { parsed.navLinks = def.navLinks; }
        if (!parsed.search) { parsed.search = def.search; }
        // Per-feature defaults
        if (parsed.features.watchlist === undefined) { parsed.features.watchlist = true; }
        if (parsed.features.skinSwitcher === undefined) { parsed.features.skinSwitcher = true; }
        if (parsed.features.customHomeSections === undefined) { parsed.features.customHomeSections = true; }
        if (parsed.features.enhancedSearch === undefined) { parsed.features.enhancedSearch = true; }
        if (parsed.features.customNavLinks === undefined) { parsed.features.customNavLinks = true; }
        return parsed;
    } catch (e) {
        jf.log.warn('KefinFrame: corrupt config for user ' + userId + ', resetting');
        return defaultUserConfig();
    }
}

function saveUserConfig(userId, cfg) {
    jf.userStore.set(userId, 'config', JSON.stringify(cfg));
}

// Watchlist: stored as an ordered array of itemIds in jf.userStore
// The actual Jellyfin playlist id is also stored so we can sync it
function getWatchlist(userId) {
    var raw = jf.userStore.get(userId, 'watchlist');
    if (!raw) {
        return { items: [], playlistId: null };
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        return { items: [], playlistId: null };
    }
}

function saveWatchlist(userId, wl) {
    jf.userStore.set(userId, 'watchlist', JSON.stringify(wl));
}

function ensureWatchlistPlaylist(userId) {
    var wl = getWatchlist(userId);
    if (wl.playlistId) {
        // Verify it still exists
        var check = jf.jellyfin.getItem(wl.playlistId, userId);
        if (check && check.id) {
            return wl.playlistId;
        }
    }
    // Create a new playlist
    var user = jf.jellyfin.getUser(userId);
    var name = (user && user.name) ? user.name + "'s Watchlist" : 'My Watchlist';
    var pid = jf.jellyfin.createPlaylist(name, [], userId);
    if (pid) {
        wl.playlistId = pid;
        saveWatchlist(userId, wl);
        return pid;
    }
    return null;
}

function scrubItemFromAllWatchlists(itemId) {
    var users = jf.userStore.users();
    for (var i = 0; i < users.length; i++) {
        var uid = users[i];
        var wl = getWatchlist(uid);
        var before = wl.items.length;
        var filtered = [];
        for (var j = 0; j < wl.items.length; j++) {
            if (wl.items[j] !== itemId) {
                filtered.push(wl.items[j]);
            }
        }
        if (filtered.length !== before) {
            wl.items = filtered;
            saveWatchlist(uid, wl);
        }
    }
}

function cleanExpiredCaches() {
    // jf.cache handles TTL itself, this just logs a heartbeat
    jf.log.debug('KefinFrame: cache count=' + jf.cache.count);
}

function requireUserId(req, res) {
    var uid = req.query['userId'] ? String(req.query['userId']) : null;
    if (!uid && req.body && req.body.userId) {
        uid = String(req.body.userId);
    }
    if (!uid) {
        res.status(400).json({ error: 'userId required' });
        return null;
    }
    return uid;
}

function getAvailableSkins() {
    var adminSkinsRaw = jf.store.get('adminSkins');
    var adminSkins = [];
    if (adminSkinsRaw) {
        try { adminSkins = JSON.parse(adminSkinsRaw); } catch (e) { }
    }
    // Built-in community skins
    var builtIn = [
        {
            id: 'jellyfin-default',
            name: 'Default',
            description: 'The default Jellyfin look',
            cssUrl: '',
            colorSchemes: []
        },
        /*{
            id: 'ultrachromic',
            name: 'Ultrachromic',
            description: 'Dark theme with customizable accent color',
            cssUrl: 'https://cdn.jsdelivr.net/gh/CTalvio/Ultrachromic/base.css',
            colorSchemes: [
                { id: 'monochromic', name: 'Monochromic', cssUrl: 'https://cdn.jsdelivr.net/gh/CTalvio/Ultrachromic/presets/monochromic_preset.css' },
                { id: 'kaleidochromic', name: 'Kaleidochromic', cssUrl: 'https://cdn.jsdelivr.net/gh/CTalvio/Ultrachromic/presets/kaleidochromic_preset.css' },
                { id: 'Novachromic', name: 'Novachromic', cssUrl: 'https://cdn.jsdelivr.net/gh/CTalvio/Ultrachromic/presets/novachromic_preset.css' }
            ]
        },*/
        {
            id: 'elegant-fin',
            name: 'ElegantFin',
            description: 'ElegantFin gives Jellyfin a fresh, modern look, and it aims to work on mobile, desktop, and TV, with just one import.',
            cssUrl: 'https://cdn.jsdelivr.net/gh/lscambo13/ElegantFin@main/Theme/ElegantFin-jellyfin-theme-build-latest-minified.css',
            colorSchemes: []
        },
        {
            id: 'better-ui',
            name: 'Better UI',
            description: 'A modern UI enhancement theme for Jellyfin focused on cleaner layout, smoother animations, and ios like design.',
            cssUrl: 'https://cdn.jsdelivr.net/gh/tromoSM/better-jellyfin-ui@main/theme.css',
            colorSchemes: []
        }
    ];
    return builtIn.concat(adminSkins);
}

// GET /api/config?userId=...
jf.routes.get('/config', function (req, res) {
    var uid = requireUserId(req, res);
    if (!uid) { return; }
    var cfg = getUserConfig(uid);
    return res.json(cfg);
});

// POST /api/config  body: { userId, ...configFields }
jf.routes.post('/config', function (req, res) {
    var body = req.body || {};
    var uid = body.userId ? String(body.userId) : null;
    if (!uid) {
        return res.status(400).json({ error: 'userId required' });
    }
    var cfg = getUserConfig(uid);

    // Merge top-level sections that were sent
    if (body.features) {
        if (body.features.watchlist !== undefined) { cfg.features.watchlist = !!body.features.watchlist; }
        if (body.features.skinSwitcher !== undefined) { cfg.features.skinSwitcher = !!body.features.skinSwitcher; }
        if (body.features.customHomeSections !== undefined) { cfg.features.customHomeSections = !!body.features.customHomeSections; }
        if (body.features.enhancedSearch !== undefined) { cfg.features.enhancedSearch = !!body.features.enhancedSearch; }
        if (body.features.customNavLinks !== undefined) { cfg.features.customNavLinks = !!body.features.customNavLinks; }
    }
    if (body.skin) {
        if (body.skin.activeSkin !== undefined) { cfg.skin.activeSkin = String(body.skin.activeSkin); }
        if (body.skin.activeColorScheme !== undefined) { cfg.skin.activeColorScheme = String(body.skin.activeColorScheme); }
    }
    if (body.homeSections) {
        try {
            var hs = body.homeSections;
            if (typeof hs === 'string') { hs = JSON.parse(hs); }
            cfg.homeSections = hs;
        } catch (e) { }
    }
    if (body.navLinks) {
        try {
            var nl = body.navLinks;
            if (typeof nl === 'string') { nl = JSON.parse(nl); }
            cfg.navLinks = nl;
        } catch (e) { }
    }
    if (body.search) {
        if (body.search.jellyseerrEnabled !== undefined) { cfg.search.jellyseerrEnabled = !!body.search.jellyseerrEnabled; }
        if (body.search.jellyseerrUrl !== undefined) { cfg.search.jellyseerrUrl = String(body.search.jellyseerrUrl); }
    }

    saveUserConfig(uid, cfg);
    return res.json({ ok: true, config: cfg });
});

// POST /api/config/reset  body: { userId }
jf.routes.post('/config/reset', function (req, res) {
    var body = req.body || {};
    var uid = body.userId ? String(body.userId) : null;
    if (!uid) {
        return res.status(400).json({ error: 'userId required' });
    }
    saveUserConfig(uid, defaultUserConfig());
    return res.json({ ok: true });
});

// GET /api/config/export?userId=...
jf.routes.get('/config/export', function (req, res) {
    var uid = requireUserId(req, res);
    if (!uid) { return; }
    var cfg = getUserConfig(uid);
    var wl = getWatchlist(uid);
    return res.json({ config: cfg, watchlist: wl.items });
});

// POST /api/config/import  body: { userId, config, watchlist? }
jf.routes.post('/config/import', function (req, res) {
    var body = req.body || {};
    var uid = body.userId ? String(body.userId) : null;
    if (!uid) {
        return res.status(400).json({ error: 'userId required' });
    }
    var cfg = body.config;
    if (!cfg) {
        return res.status(400).json({ error: 'config required' });
    }
    if (typeof cfg === 'string') {
        try { cfg = JSON.parse(cfg); } catch (e) {
            return res.status(400).json({ error: 'invalid config JSON' });
        }
    }
    saveUserConfig(uid, cfg);
    if (body.watchlist) {
        var wl = getWatchlist(uid);
        try {
            var items = body.watchlist;
            if (typeof items === 'string') { items = JSON.parse(items); }
            wl.items = items;
            saveWatchlist(uid, wl);
        } catch (e) { }
    }
    return res.json({ ok: true });
});

// GET /api/skins
jf.routes.get('/skins', function (req, res) {
    var cacheKey = 'skins_list';
    var cached = jf.cache.get(cacheKey);
    if (cached) {
        return res.json(cached);
    }
    var skins = getAvailableSkins();
    jf.cache.set(cacheKey, skins, 10 * 60 * 1000);
    return res.json(skins);
});

// POST /api/skins/admin  body: { skins: [...] }  (admin: add custom skins server-wide)
jf.routes.post('/skins/admin', function (req, res) {
    var body = req.body || {};
    if (!body.skins) {
        return res.status(400).json({ error: 'skins array required' });
    }
    var skins = body.skins;
    if (typeof skins === 'string') {
        try { skins = JSON.parse(skins); } catch (e) {
            return res.status(400).json({ error: 'invalid JSON' });
        }
    }
    jf.store.set('adminSkins', JSON.stringify(skins));
    jf.cache.delete('skins_list');
    return res.json({ ok: true });
});

// GET /api/watchlist?userId=...
jf.routes.get('/watchlist', function (req, res) {
    var uid = requireUserId(req, res);
    if (!uid) { return; }

    var wl = getWatchlist(uid);
    if (wl.items.length === 0) {
        return res.json({ items: [], count: 0 });
    }

    var cacheKey = 'wl_items_' + uid;
    var cached = jf.cache.get(cacheKey);
    if (cached) {
        return res.json({ items: cached, count: cached.length });
    }

    var itemData = jf.jellyfin.getItemsByIds(wl.items, uid) || [];
    // Preserve watchlist order
    var byId = {};
    for (var i = 0; i < itemData.length; i++) {
        byId[itemData[i].id] = itemData[i];
    }
    var ordered = [];
    for (var j = 0; j < wl.items.length; j++) {
        if (byId[wl.items[j]]) {
            var item = byId[wl.items[j]];
            ordered.push({
                id: item.id,
                name: item.name,
                type: item.type,
                productionYear: item.productionYear,
                communityRating: item.communityRating,
                officialRating: item.officialRating,
                overview: item.overview,
                runTimeTicks: item.runTimeTicks,
                imageTags: {
                    Primary: item.imageTags ? item.imageTags.Primary : null,
                    Thumb: item.imageTags ? item.imageTags.Thumb : null,
                    Backdrop: item.imageTags ? item.imageTags.Backdrop : null
                },
                backdropImageTags: item.backdropImageTags,
                seriesName: item.seriesName,
                seasonName: item.seasonName,
                indexNumber: item.indexNumber
            });
        }
    }

    jf.cache.set(cacheKey, ordered, 5 * 60 * 1000);
    return res.json({ items: ordered, count: ordered.length });
});

// POST /api/watchlist/add  body: { userId, itemId }
jf.routes.post('/watchlist/add', function (req, res) {
    var body = req.body || {};
    var uid = body.userId ? String(body.userId) : null;
    var itemId = body.itemId ? String(body.itemId) : null;
    if (!uid || !itemId) {
        return res.status(400).json({ error: 'userId and itemId required' });
    }

    var wl = getWatchlist(uid);
    // Check if already in list
    for (var i = 0; i < wl.items.length; i++) {
        if (wl.items[i] === itemId) {
            return res.json({ ok: true, added: false, inWatchlist: true });
        }
    }

    wl.items.push(itemId);
    saveWatchlist(uid, wl);
    jf.cache.delete('wl_items_' + uid);

    // Sync to Jellyfin playlist in background (best effort)
    try {
        var pid = ensureWatchlistPlaylist(uid);
        if (pid) {
            jf.jellyfin.addToPlaylist(pid, [itemId], uid);
        }
    } catch (e) {
        jf.log.warn('KefinFrame: playlist sync failed for add: ' + e);
    }

    return res.json({ ok: true, added: true, inWatchlist: true, count: wl.items.length });
});

// POST /api/watchlist/remove  body: { userId, itemId }
jf.routes.post('/watchlist/remove', function (req, res) {
    var body = req.body || {};
    var uid = body.userId ? String(body.userId) : null;
    var itemId = body.itemId ? String(body.itemId) : null;
    if (!uid || !itemId) {
        return res.status(400).json({ error: 'userId and itemId required' });
    }

    var wl = getWatchlist(uid);
    var newItems = [];
    var removed = false;
    for (var i = 0; i < wl.items.length; i++) {
        if (wl.items[i] === itemId) {
            removed = true;
        } else {
            newItems.push(wl.items[i]);
        }
    }
    wl.items = newItems;
    saveWatchlist(uid, wl);
    jf.cache.delete('wl_items_' + uid);

    return res.json({ ok: true, removed: removed, inWatchlist: false, count: wl.items.length });
});

// GET /api/watchlist/check?userId=...&itemId=...
jf.routes.get('/watchlist/check', function (req, res) {
    var uid = req.query['userId'] ? String(req.query['userId']) : null;
    var itemId = req.query['itemId'] ? String(req.query['itemId']) : null;
    if (!uid || !itemId) {
        return res.status(400).json({ error: 'userId and itemId required' });
    }
    var wl = getWatchlist(uid);
    var inWatchlist = false;
    for (var i = 0; i < wl.items.length; i++) {
        if (wl.items[i] === itemId) {
            inWatchlist = true;
            break;
        }
    }
    return res.json({ inWatchlist: inWatchlist });
});

// POST /api/watchlist/reorder  body: { userId, items: [...ids in new order] }
jf.routes.post('/watchlist/reorder', function (req, res) {
    var body = req.body || {};
    var uid = body.userId ? String(body.userId) : null;
    if (!uid || !body.items) {
        return res.status(400).json({ error: 'userId and items required' });
    }
    var wl = getWatchlist(uid);
    var newOrder = body.items;
    if (typeof newOrder === 'string') {
        try { newOrder = JSON.parse(newOrder); } catch (e) {
            return res.status(400).json({ error: 'invalid items JSON' });
        }
    }
    wl.items = newOrder;
    saveWatchlist(uid, wl);
    jf.cache.delete('wl_items_' + uid);
    return res.json({ ok: true });
});

// POST /api/watchlist/sync  body: { userId }
// Rebuilds the Jellyfin playlist from the stored watchlist order
jf.routes.post('/watchlist/sync', function (req, res) {
    var body = req.body || {};
    var uid = body.userId ? String(body.userId) : null;
    if (!uid) {
        return res.status(400).json({ error: 'userId required' });
    }
    var wl = getWatchlist(uid);
    var pid = ensureWatchlistPlaylist(uid);
    if (!pid) {
        return res.status(500).json({ error: 'could not create/find playlist' });
    }
    if (wl.items.length > 0) {
        jf.jellyfin.addToPlaylist(pid, wl.items, uid);
    }
    return res.json({ ok: true, playlistId: pid, count: wl.items.length });
});

// GET /api/home/sections/available
jf.routes.get('/home/sections/available', function (req, res) {
    var uid = req.query['userId'] ? String(req.query['userId']) : null;
    var libs = [];
    if (uid) {
        libs = jf.jellyfin.getUserLibraries(uid) || [];
    } else {
        libs = jf.jellyfin.getLibraries() || [];
    }

    var builtIn = [
        { id: 'continue-watching', name: 'Continue Watching', type: 'resume' },
        { id: 'next-up', name: 'Next Up', type: 'nextUp' },
        { id: 'latest-movies', name: 'Latest Movies', type: 'latest', mediaType: 'Movie' },
        { id: 'latest-tv', name: 'Latest TV', type: 'latest', mediaType: 'Series' },
        { id: 'latest-music', name: 'Latest Music', type: 'latest', mediaType: 'Audio' },
        { id: 'watchlist', name: 'My Watchlist', type: 'watchlist' },
        { id: 'favorites', name: 'Favorites', type: 'favorites' },
        { id: 'random-movies', name: 'Random Movies', type: 'random', mediaType: 'Movie' },
        { id: 'random-tv', name: 'Random TV', type: 'random', mediaType: 'Series' }
    ];

    var libSections = [];
    for (var i = 0; i < libs.length; i++) {
        var lib = libs[i];
        libSections.push({
            id: 'lib-' + lib.id,
            name: lib.name,
            type: 'library',
            libraryId: lib.id
        });
    }

    return res.json({ sections: builtIn.concat(libSections) });
});

// GET /api/home/sections/data?userId=...&type=...&mediaType=...&libraryId=...&limit=...
jf.routes.get('/home/sections/data', function (req, res) {
    var uid = req.query['userId'] ? String(req.query['userId']) : null;
    var type = req.query['type'] ? String(req.query['type']) : '';
    var mediaType = req.query['mediaType'] ? String(req.query['mediaType']) : '';
    var libraryId = req.query['libraryId'] ? String(req.query['libraryId']) : '';
    var limit = req.query['limit'] ? parseInt(String(req.query['limit']), 10) : 20;
    if (!uid) {
        return res.status(400).json({ error: 'userId required' });
    }

    var cacheKey = 'hs_' + uid + '_' + type + '_' + mediaType + '_' + libraryId + '_' + limit;
    var cached = jf.cache.get(cacheKey);
    if (cached) {
        return res.json({ items: cached });
    }

    var items = [];
    if (type === 'resume') {
        items = jf.jellyfin.getResumeItems(uid, limit) || [];
    } else if (type === 'nextUp') {
        items = jf.jellyfin.getNextUp(uid, limit) || [];
    } else if (type === 'latest') {
        var latestItems = jf.jellyfin.getLatestItems(uid, 50) || [];
        var filtered = [];
        for (var i = 0; i < latestItems.length; i++) {
            if (!mediaType || latestItems[i].type === mediaType) {
                filtered.push(latestItems[i]);
                if (filtered.length >= limit) { break; }
            }
        }
        items = filtered;
    } else if (type === 'watchlist') {
        var wl = getWatchlist(uid);
        if (wl.items.length > 0) {
            items = jf.jellyfin.getItemsByIds(wl.items.slice(0, limit), uid) || [];
        }
    } else if (type === 'favorites') {
        items = jf.jellyfin.getItems({
            userId: uid,
            isFavorite: 'true',
            recursive: 'true',
            sortBy: 'DateCreated',
            sortOrder: 'Descending',
            limit: String(limit)
        }) || [];
    } else if (type === 'random') {
        items = jf.jellyfin.getItems({
            userId: uid,
            type: mediaType,
            recursive: 'true',
            sortBy: 'Random',
            limit: String(limit)
        }) || [];
    } else if (type === 'library' && libraryId) {
        items = jf.jellyfin.getItems({
            userId: uid,
            parentId: libraryId,
            recursive: 'false',
            sortBy: 'DateCreated',
            sortOrder: 'Descending',
            limit: String(limit)
        }) || [];
    }

    var slim = [];
    for (var j = 0; j < items.length; j++) {
        var it = items[j];
        slim.push({
            id: it.id,
            name: it.name,
            type: it.type,
            productionYear: it.productionYear,
            communityRating: it.communityRating,
            officialRating: it.officialRating,
            seriesName: it.seriesName,
            seasonName: it.seasonName,
            indexNumber: it.indexNumber,
            imageTags: {
                Primary: it.imageTags ? it.imageTags.Primary : null,
                Thumb: it.imageTags ? it.imageTags.Thumb : null
            },
            backdropImageTags: it.backdropImageTags ? it.backdropImageTags.slice(0, 1) : []
        });
    }

    jf.cache.set(cacheKey, slim, 3 * 60 * 1000);
    return res.json({ items: slim });
});

// GET /api/search?userId=...&term=...&limit=...
jf.routes.get('/search', function (req, res) {
    var uid = req.query['userId'] ? String(req.query['userId']) : null;
    var term = req.query['term'] ? String(req.query['term']) : '';
    var limit = req.query['limit'] ? parseInt(String(req.query['limit']), 10) : 20;

    if (!uid || !term) {
        return res.status(400).json({ error: 'userId and term required' });
    }

    var cacheKey = 'search_' + uid + '_' + term + '_' + limit;
    var cached = jf.cache.get(cacheKey);
    if (cached) {
        return res.json({ results: cached });
    }

    var results = jf.jellyfin.search(term, limit) || [];
    var slim = [];
    for (var i = 0; i < results.length; i++) {
        var it = results[i];
        slim.push({
            id: it.id,
            name: it.name,
            type: it.type,
            productionYear: it.productionYear,
            communityRating: it.communityRating,
            seriesName: it.seriesName,
            imageTags: {
                Primary: it.imageTags ? it.imageTags.Primary : null,
                Thumb: it.imageTags ? it.imageTags.Thumb : null
            }
        });
    }

    jf.cache.set(cacheKey, slim, 2 * 60 * 1000);
    return res.json({ results: slim });
});

jf.routes.get('/ping', function (req, res) {
    return res.json({ ok: true, mod: 'kefinframe', version: '1.0.0' });
});
