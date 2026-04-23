jf.onStart(function() {
    jf.log.info('JellyAssistant started. Optimized for performance and timeout safety.');
});

jf.routes.get('/hello', function(req, res) {
    return res.json({ message: 'world' });
});

// Route: POST /JellyFrame/mods/jelly-assistant/api/chat
jf.routes.post('/chat', function(req, res) {
    var apiUrl = jf.vars['API_URL'];
    var apiKey = jf.vars['API_KEY'];
    var modelName = jf.vars['MODEL'];
    var libraryReadAccess = jf.vars['ENABLE_LIBRARY_READ_ACCESS'] === '1';

    if (!apiKey || apiKey === '') {
        return res.status(401).json({ error: 'API Key missing in settings.' });
    }

    var body = req.body || {};
    var messagesStr = body.messagesJson ? String(body.messagesJson) : '[]';
    var messages = [];
    
    try {
        messages = JSON.parse(messagesStr);
    } catch(e) {
        return res.status(400).json({ error: 'Payload parse error.' });
    }

    if (libraryReadAccess && messages.length > 0) {
        try {
            var lastUserMessage = messages[messages.length - 1].content.toLowerCase();
            var contextMessage = "";

            var mediaKeywords = ["movie", "show", "series", "watch", "about", "what is"];
            var isMediaInquiry = false;
            for (var i = 0; i < mediaKeywords.length; i++) {
                if (lastUserMessage.indexOf(mediaKeywords[i]) !== -1) {
                    isMediaInquiry = true;
                    break;
                }
            }

            if (isMediaInquiry) {
                var results = jf.jellyfin.search(lastUserMessage, 2) || [];
                if (results.length > 0) {
                    contextMessage = "Library Context: ";
                    for (var j = 0; j < results.length; j++) {
                        var item = results[j];
                        contextMessage += "[" + item.name + " (" + (item.productionYear || "?") + "): " + 
                                         (item.overview ? item.overview.substring(0, 150) + "..." : "No desc.") + "] ";
                    }
                }
            }

            if (contextMessage) {
                messages.splice(messages.length - 1, 0, { 
                    role: 'system', 
                    content: "Use this local library data to assist: " + contextMessage 
                });
            }
        } catch (ragErr) {
            jf.log.warn('RAG Error: ' + ragErr.message);
        }
    }

    var payload = {
        model: modelName,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
    };

    var options = {
        headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
            'X-Title': 'JellyAssistant'
        },
        timeout: 18000
    };

    try {
        var r = jf.http.post(apiUrl, JSON.stringify(payload), options);

        if (!r.ok) {
            var errText = 'Provider Error ' + r.status;
            try {
                var errObj = r.json();
                errText = (errObj && errObj.error && errObj.error.message) ? errObj.error.message : r.body;
            } catch(e) {}
            return res.status(r.status).json({ error: errText });
        }

        return res.json(r.json());
    } catch (err) {
        jf.log.error('Chat Request Failed: ' + err.message);
        if (err.message.indexOf('timeout') !== -1) {
            return res.status(504).json({ error: 'The AI provider took too long to respond. Try again or check your API status.' });
        }
        return res.status(500).json({ error: 'Assistant error: ' + err.message });
    }
});

jf.onStop(function() {
    jf.log.info('JellyAssistant stopped.');
});
