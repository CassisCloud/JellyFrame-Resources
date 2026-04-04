jf.onStart(function() {});
jf.onStop(function() {});

jf.routes.get('/sync', function(req, res) {
    var myId = req.query['myId'] ? String(req.query['myId']) : null;
    var targetId = req.query['targetId'] ? String(req.query['targetId']) : null;

    if (!myId) {
        return res.status(400).json({ error: 'Missing myId' });
    }

    var allUsers = jf.jellyfin.getUsers();
    if (!allUsers || typeof allUsers.length === 'undefined') allUsers = [];

    var sessions = jf.jellyfin.getSessions();
    if (!sessions || typeof sessions.length === 'undefined') sessions = [];

    var sessionMap = {};

    for (var i = 0; i < sessions.length; i++) {
        var s = sessions[i];
        if (s && s.userId && s.userId !== myId) {
            if (!sessionMap[s.userId]) sessionMap[s.userId] = { isWatching: false, online: true };
            if (s.nowPlayingItem !== null) sessionMap[s.userId].isWatching = true;
        }
    }

    var usersData = [];
    for (var j = 0; j < allUsers.length; j++) {
        var u = allUsers[j];
        if (u && u.id !== myId) {
            var sData = sessionMap[u.id] || { isWatching: false, online: false };
            usersData.push({
                id: u.id,
                name: u.name,
                isOnline: sData.online,
                isWatching: sData.isWatching
            });
        }
    }

    usersData.sort(function(a, b) {
        if (a.isOnline === b.isOnline) {
            return a.name.localeCompare(b.name);
        }
        return a.isOnline ? -1 : 1;
    });

    var history = [];
    if (targetId && targetId !== 'null' && targetId !== 'undefined') {
        var pairArr = [myId, targetId].sort();
        var pairId = pairArr[0] + '_' + pairArr[1];
        var storeKey = 'chat_' + pairId;
        var parsed = JSON.parse(jf.store.get(storeKey) || '[]');
        if (parsed && typeof parsed.length !== 'undefined') {
            history = parsed;
        }
    }

    return res.json({
        users: usersData,
        messages: history
    });
});

jf.routes.post('/send', function(req, res) {
    var body = req.body;
    if (!body || !body.fromId || !body.toId || !body.text) {
        return res.status(400).json({ error: 'Incomplete data' });
    }

    var fromId = String(body.fromId);
    var toId = String(body.toId);

    var pairArr = [fromId, toId].sort();
    var pairId = pairArr[0] + '_' + pairArr[1];
    var storeKey = 'chat_' + pairId;

    var history = JSON.parse(jf.store.get(storeKey) || '[]');
    if (!history || typeof history.length === 'undefined') history = [];

    history.push({
        fromId: fromId,
        fromName: String(body.fromName),
        text: String(body.text),
        time: new Date().getTime()
    });

    if (history.length > 40) {
        history.shift();
    }

    jf.store.set(storeKey, JSON.stringify(history));
    return res.json({ ok: true });
});
