// server.js - Logic for the chat backend
jf.onStart(function() {
    jf.log.info('JellyChat Service Started');
    if (jf.store.get('chat_log') === null) {
        jf.store.set('chat_log', JSON.stringify([]));
    }
});

jf.onStop(function() {
    jf.log.info('JellyChat Service Stopped');
});

// Route: GET /JellyFrame/mods/jelly-chat/api/sync
// This returns BOTH the online users and the message history in one request
jf.routes.get('/sync', function(req, res) {
    var sessions = jf.jellyfin.getSessions() || [];
    var activeUsers = [];
    var seenIds = {};

    for (var i = 0; i < sessions.length; i++) {
        var s = sessions[i];
        if (s.userId && !seenIds[s.userId]) {
            seenIds[s.userId] = true;
            activeUsers.push({
                id: s.userId,
                name: s.userName,
                device: s.deviceName,
                // Check if they are actually playing something
                isWatching: s.nowPlayingItem !== null
            });
        }
    }

    var history = JSON.parse(jf.store.get('chat_log') || '[]');
    
    return res.json({
        online: activeUsers,
        messages: history
    });
});

// Route: POST /JellyFrame/mods/jelly-chat/api/send
jf.routes.post('/send', function(req, res) {
    if (!req.body || !req.body.text || !req.body.userId) {
        return res.status(400).json({ error: 'Incomplete data' });
    }

    var history = JSON.parse(jf.store.get('chat_log') || '[]');
    var entry = {
        userId: String(req.body.userId),
        userName: String(req.body.userName),
        text: String(req.body.text),
        timestamp: new Date().getTime()
    };

    history.push(entry);

    // Keep history lean (last 40 messages) to prevent CPU lag on parse
    if (history.length > 40) {
        history.shift();
    }

    jf.store.set('chat_log', JSON.stringify(history));
    return res.json({ success: true });
});
