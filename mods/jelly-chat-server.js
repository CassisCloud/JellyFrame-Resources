jf.onStart(function() {
    jf.log.info('Private Chat Service Started');
});

jf.onStop(function() {
    jf.log.info('Private Chat Service Stopped');
});

// GET /JellyFrame/mods/jelly-chat/api/sync
// Returns online users and, if a targetId is provided, the private message history.
jf.routes.get('/sync', function(req, res) {
    var myId = req.query['myId'] ? String(req.query['myId']) : null;
    var targetId = req.query['targetId'] ? String(req.query['targetId']) : null;
    
    if (!myId) {
        return res.status(400).json({ error: 'Missing myId' });
    }

    // 1. Build the "Online Users" list
    var sessions = jf.jellyfin.getSessions() || [];
    var activeUsers = [];
    var seenIds = {};

    for (var i = 0; i < sessions.length; i++) {
        var s = sessions[i];
        if (s.userId && s.userId !== myId && !seenIds[s.userId]) {
            seenIds[s.userId] = true;
            activeUsers.push({
                id: s.userId,
                name: s.userName,
                isWatching: s.nowPlayingItem !== null
            });
        }
    }

    // 2. Fetch private message history if a target is selected
    var history = [];
    if (targetId && targetId !== 'null' && targetId !== 'undefined') {
        // Create a unique, alphabetical key for this specific pair of users
        var pairArr = [myId, targetId].sort();
        var pairId = pairArr[0] + '_' + pairArr[1];
        var storeKey = 'chat_' + pairId;
        
        history = JSON.parse(jf.store.get(storeKey) || '[]');
    }

    return res.json({
        online: activeUsers,
        messages: history
    });
});

// POST /JellyFrame/mods/jelly-chat/api/send
// Saves a new message to the persistent store for that specific user pair.
jf.routes.post('/send', function(req, res) {
    var body = req.body;
    if (!body || !body.fromId || !body.toId || !body.text) {
        return res.status(400).json({ error: 'Incomplete data' });
    }

    var fromId = String(body.fromId);
    var toId = String(body.toId);
    
    // Generate the same unique pair key
    var pairArr = [fromId, toId].sort();
    var pairId = pairArr[0] + '_' + pairArr[1];
    var storeKey = 'chat_' + pairId;

    var history = JSON.parse(jf.store.get(storeKey) || '[]');
    
    history.push({
        fromId: fromId,
        fromName: String(body.fromName),
        text: String(body.text),
        time: new Date().getTime()
    });

    // Keep history lean to avoid parsing massive strings (saves CPU)
    if (history.length > 40) {
        history.shift();
    }

    jf.store.set(storeKey, JSON.stringify(history));
    return res.json({ ok: true });
});
