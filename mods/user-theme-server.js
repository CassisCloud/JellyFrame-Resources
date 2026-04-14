var DEFAULT_THEMES_URL = 'https://cdn.jsdelivr.net/gh/Jellyfin-PG/JellyFrame-Resources@main/themes.json';

function getThemes() {
    var cached = jf.cache.get('themes');
    if (cached) return cached;

    var url = jf.vars['THEMES_URL'] || DEFAULT_THEMES_URL;
    var r = jf.http.get(url, { timeout: 10000 });

    if (r.ok) {
        var themes = r.json();
        jf.cache.set('themes', themes, 60 * 60 * 1000);
        return themes;
    }
    return [];
}

jf.onStart(function () {
    jf.log.info('User Theme Selector started.');
});

jf.routes.get('/themes', function (req, res) {
    return res.json(getThemes());
});

jf.routes.get('/selection/:user', function (req, res) {
    var userId = req.pathParams['user'];
    var data = jf.userStore.get(userId, 'theme_config_v2');
    if (!data) {
        jf.log.debug('No saved config for user ' + userId + ', returning defaults');
        return res.json({ theme: '', vars: {}, addons: [] });
    }
    try {
        var parsed = JSON.parse(data);
        var result = {
            theme: parsed.theme || '',
            vars: parsed.vars || {},
            addons: parsed.addons || []
        };
        jf.log.debug('GET config for ' + userId + ': theme=' + result.theme + ' vars=' + JSON.stringify(result.vars) + ' addons=' + JSON.stringify(result.addons));
        return res.json(result);
    } catch (e) {
        jf.log.warn('Failed to parse stored config for user ' + userId + ': ' + e + ' raw: ' + data);
        return res.json({ theme: '', vars: {}, addons: [] });
    }
});

jf.routes.post('/selection/:user', function (req, res) {
    var userId = req.pathParams['user'];
    var body = req.body;
    if (!body) {
        return res.status(400).json({ error: 'Missing config' });
    }

    var themeId = String(body.theme || '');

    var parsed = null;
    try {
        parsed = JSON.parse(req.rawBody || '{}');
    } catch (e) {
        jf.log.warn('Failed to parse rawBody: ' + e);
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    var vars = parsed.vars || {};
    var addons = parsed.addons || [];

    if (!Array.isArray(addons)) {
        addons = [];
    }

    var safeVars = {};
    var varKeys = Object.keys(vars);
    for (var i = 0; i < varKeys.length; i++) {
        var k = varKeys[i];
        safeVars[k] = String(vars[k]);
    }

    var configToSave = {
        theme: themeId,
        vars: safeVars,
        addons: addons
    };

    jf.userStore.set(userId, 'theme_config_v2', JSON.stringify(configToSave));
    jf.log.debug('Saved theme config for user ' + userId + ': theme=' + themeId + ' vars=' + varKeys.length + ' addons=' + addons.length);
    return res.json({ ok: true });
});
