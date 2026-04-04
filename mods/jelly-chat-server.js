// server.js
jf.onStart(function() {
    jf.log.info('Private Chat Service Started');
});

// GET /JellyFrame/mods/jelly-chat/api/sync?targetId=abc
jf.routes.get('/sync', function(req, res) {
    var myId = String(req.query['myId']);
    var targetId = String(req.query['targetId']);
    
    // Create a unique key for this pair (alphabetical so it's the same for both users)
    var pairId = [myId, targetId].sort().join('_');
    var storeKey = 'chat_' + pairId;

    var history = JSON.parse(jf.store.get(storeKey) || '[]');
    var sessions = jf.jellyfin.getSessions() || [];
    
    // Return all online users so the UI can show the "Friend List"
    var online = [];
    for (var i = 0; i < sessions.length; i++) {
        if (sessions[i].userId && sessions[i].userId !== myId) {
            online.push({ id: sessions[i].userId, name: sessions[i].userName });
        }
    }

    return res.json({
        messages: history,
        online: online
    });
});

// POST /JellyFrame/mods/jelly-chat/api/send
jf.routes.post('/send', function(req, res) {
    var body = req.body;
    var pairId = [String(body.fromId), String(body.toId)].sort().join('_');
    var storeKey = 'chat_' + pairId;

    var history = JSON.parse(jf.store.get(storeKey) || '[]');
    history.push({
        from: String(body.fromName),
        fromId: String(body.fromId),
        text: String(body.text),
        time: new Date().getTime()
    });

    if (history.length > 30) history.shift();

    jf.store.set(storeKey, JSON.stringify(history));
    return res.json({ ok: true });
});
