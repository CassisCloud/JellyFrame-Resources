jf.onStart(function() {
    jf.log.info('JellyAssistant (OpenRouter) mod started.');
});

jf.routes.get('/hello', function(req, res) {
    return res.json({ message: 'world' });
});

// Route: POST /JellyFrame/mods/jelly-assistant/api/chat
jf.routes.post('/chat', function(req, res) {
    var apiUrl = jf.vars['API_URL'];
    var apiKey = jf.vars['API_KEY'];
    var modelName = jf.vars['MODEL'];

    if (!apiKey || apiKey === '') {
        return res.status(401).json({ error: 'OpenRouter API Key is missing in settings.' });
    }

    var messagesJson = '';
    if (req.body && req.body.messagesJson) {
        messagesJson = String(req.body.messagesJson);
    }

    if (!messagesJson || messagesJson === '') {
        return res.status(400).json({ error: 'No chat history provided.' });
    }

    var messages = [];
    try {
        messages = JSON.parse(messagesJson);
    } catch(e) {
        return res.status(400).json({ error: 'Invalid JSON payload.' });
    }

    var payload = {
        model: modelName,
        messages: messages,
        temperature: 0.7
    };

    var options = {
        headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
            'X-Title': 'JellyAssistant Mod'
        },
        timeout: 25000 
    };

    try {
        var r = jf.http.post(apiUrl, JSON.stringify(payload), options);

        if (!r.ok) {
            var detail = 'Status ' + r.status;
            try {
                var errObj = r.json();
                if (errObj && errObj.error) {
                    detail = typeof errObj.error === 'string' ? errObj.error : (errObj.error.message || detail);
                }
            } catch(e) {
                detail = r.body || detail;
            }
            return res.status(r.status).json({ error: 'OpenRouter Error: ' + detail });
        }

        return res.json(r.json());
    } catch (err) {
        return res.status(500).json({ error: 'Proxy Exception: ' + err.message });
    }
});

jf.onStop(function() {
    jf.log.info('JellyAssistant mod stopped.');
});
