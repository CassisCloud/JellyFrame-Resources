jf.onStart(function() {
    jf.log.info('JellyGrok mod active.');
});

// Route: POST /JellyFrame/mods/jelly-grok/api/chat
jf.routes.post('/chat', function(req, res) {
    var apiUrl = jf.vars['API_URL'];
    var apiKey = jf.vars['API_KEY'];
    var modelName = jf.vars['MODEL'];

    if (!apiKey) {
        return res.status(401).json({ error: 'xAI API Key not configured in Mod settings.' });
    }

    var messagesStr = req.body && req.body.messagesJson ? String(req.body.messagesJson) : '[]';
    var messages = [];
    
    try {
        messages = JSON.parse(messagesStr);
    } catch(e) {
        return res.status(400).json({ error: 'Malformed message history.' });
    }

    var payload = {
        model: modelName,
        messages: messages,
        stream: false,
        temperature: 0.7
    };

    var options = {
        headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
        },
        timeout: 20000
    };

    var r = jf.http.post(apiUrl, JSON.stringify(payload), options);

    if (!r.ok) {
        jf.log.error('Grok API Error [' + r.status + ']: ' + r.body);
        return res.status(r.status).json({ error: 'Grok API failed to respond.' });
    }

    return res.json(r.json());
});

jf.onStop(function() {
    jf.log.info('JellyGrok mod stopped.');
});
