var STORE_KEY = 'requests';

function loadRequests() {
    try {
        var raw = jf.store.get(STORE_KEY);
        if (!raw) {
            return [];
        }
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function saveRequests(list) {
    try {
        jf.store.set(STORE_KEY, JSON.stringify(list));
    } catch (e) {
        jf.log.error('[media-request] Failed to save requests: ' + e);
    }
}

function nextId(list) {
    var max = 0;
    for (var i = 0; i < list.length; i++) {
        var n = parseInt(list[i].id, 10) || 0;
        if (n > max) {
            max = n;
        }
    }
    return String(max + 1);
}

jf.routes.get('/requests', function (req, res) {
    var userId = '';
    try {
        if (req.query) {
            userId = String(req.query.userId || req.query['userId'] || '').trim();
        }
    } catch (e) {}

    var isAdmin = false;
    if (userId) {
        try {
            var user = jf.jellyfin.getUser(userId);
            if (user && user.isAdmin === true) {
                isAdmin = true;
            }
        } catch (e) {}
    }

    var list = loadRequests();
    return res.json({ 
        count: list.length, 
        requests: list,
        isAdmin: isAdmin
    });
});

jf.routes.post('/requests', function (req, res) {
    var title = '', type = '', year = '', note = '', userId = '', userName = '';
    
    try {
        var body = req.body || {};
        title    = body.title    ? String(body.title).trim()    : '';
        type     = body.type     ? String(body.type).trim()     : '';
        year     = body.year     ? String(body.year).trim()     : '';
        note     = body.note     ? String(body.note).trim()     : '';
        userId   = body.userId   ? String(body.userId).trim()   : '';
        userName = body.userName ? String(body.userName).trim() : '';
    } catch (e) {
        
    }

    if (!title || !type) {
        return res.status(400).json({ error: 'title and type are required' });
    }

    var list  = loadRequests();
    var entry = {
        id:        nextId(list),
        title:     title,
        type:      type,
        year:      year,
        note:      note,
        userId:    userId,
        userName:  userName,
        status:    'pending',
        createdAt: new Date().toISOString()
    };
    list.push(entry);
    saveRequests(list);

    jf.log.info('[media-request] New request: ' + title + ' (' + type + ') from ' + (userName || userId || 'unknown'));

    try {
        var webhookUrl = (jf.vars['WEBHOOK_URL'] || '').trim();
        if (webhookUrl) {
            var payload = {
                content: 'New media request from ' + (userName || 'unknown') + ': ' + title + ' (' + type + (year ? ', ' + year : '') + ')',
                request: entry
            };
            var webhookSecret = (jf.vars['WEBHOOK_SECRET'] || '').trim();
            var opts = { timeout: 8000 };
            if (webhookSecret) {
                opts.secret = webhookSecret;
            }
            var result = jf.webhooks.send(webhookUrl, payload, opts);
            if (!result.ok) {
                jf.log.warn('[media-request] Webhook delivery failed: ' + result.status);
            }
        }
    } catch (e) {
        jf.log.warn('[media-request] Webhook error: ' + e);
    }

    return res.json({ ok: true, request: entry });
});

jf.routes.patch('/requests/:id', function (req, res) {
    var id = '';
    try {
        if (req.pathParams && req.pathParams['id']) {
            id = String(req.pathParams['id']).trim();
        }
    } catch (e) {}

    var status = '', adminId = '';
    try {
        var body = req.body || {};
        status  = body.status ? String(body.status).trim() : '';
        adminId = body.adminId ? String(body.adminId).trim() : '';
    } catch (e) {}

    var adminUser = null;
    if (adminId) {
        try {
            adminUser = jf.jellyfin.getUser(adminId);
        } catch (e) {}
    }

    if (!adminUser || adminUser.isAdmin !== true) {
        return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
    }

    var valid    = ['pending', 'approved', 'declined', 'available'];
    var isValid  = false;
    for (var i = 0; i < valid.length; i++) {
        if (valid[i] === status) {
            isValid = true;
            break;
        }
    }
    
    if (!isValid) {
        return res.status(400).json({ error: 'status must be pending, approved, declined, or available' });
    }

    var list  = loadRequests();
    var found = false;
    for (var j = 0; j < list.length; j++) {
        if (list[j].id === id) {
            list[j].status    = status;
            list[j].updatedAt = new Date().toISOString();
            found = true;
            break;
        }
    }

    if (!found) {
        return res.status(404).json({ error: 'request not found' });
    }
    
    saveRequests(list);
    return res.json({ ok: true });
});

jf.routes.delete('/requests/:id', function (req, res) {
    var id = '';
    try {
        if (req.pathParams && req.pathParams['id']) {
            id = String(req.pathParams['id']).trim();
        }
    } catch (e) {}

    var adminId = '';
    try {
        if (req.query) {
            adminId = String(req.query.adminId || req.query['adminId'] || '').trim();
        }
    } catch (e) {}

    var adminUser = null;
    if (adminId) {
        try {
            adminUser = jf.jellyfin.getUser(adminId);
        } catch (e) {}
    }

    if (!adminUser || adminUser.isAdmin !== true) {
        return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
    }

    var list    = loadRequests();
    var newList = [];
    var found   = false;
    
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
            found = true;
        } else {
            newList.push(list[i]);
        }
    }
    
    if (!found) {
        return res.status(404).json({ error: 'request not found' });
    }
    
    saveRequests(newList);
    return res.json({ ok: true });
});

jf.onStart(function () {
    jf.log.info('[media-request] started');
});

jf.onStop(function () {
    jf.log.info('[media-request] stopped');
});
