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
    var libraryReadAccess = jf.vars['ENABLE_LIBRARY_READ_ACCESS'] === '1';

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

    if (libraryReadAccess && messages.length > 0) {
        try {
            var lastUserMessage = messages[messages.length - 1].content.toLowerCase();
            var contextMessage = "";

            var searchTerms = ["about", "what is", "who is", "movie", "show", "series"];
            var shouldSearch = false;
            for (var k = 0; k < searchTerms.length; k++) {
                if (lastUserMessage.indexOf(searchTerms[k]) !== -1) {
                    shouldSearch = true;
                    break;
                }
            }

            if (shouldSearch || lastUserMessage.length > 10) {
                var searchResults = jf.jellyfin.search(lastUserMessage, 3) || [];
                
                if (searchResults.length > 0) {
                    contextMessage = "I found these items in your library that might be relevant: \n";
                    for (var m = 0; m < searchResults.length; m++) {
                        var item = searchResults[m];
                        contextMessage += "- " + item.name + " (" + (item.productionYear || 'N/A') + "): " + 
                                         (item.overview ? item.overview.substring(0, 200) + "..." : "No overview available.") + "\n";
                        
                        if (lastUserMessage.indexOf(item.name.toLowerCase()) !== -1) {
                            contextMessage += "  Detailed Info: Rating: " + (item.officialRating || 'Unrated') + 
                                             ", Genres: " + (item.genres ? item.genres.join(', ') : 'None') + ".\n";
                        }
                    }
                }
            }

            if (contextMessage === "") {
                var stats = jf.jellyfin.getItemCounts() || {};
                contextMessage = "LIBRARY STATS: The user has " + (stats.movieCount || 0) + " movies and " + (stats.seriesCount || 0) + " series.";
            }

            messages.splice(messages.length - 1, 0, { 
                role: 'system', 
                content: "INTERNAL LIBRARY DATA: " + contextMessage + "\nAnswer the user using this data if it matches their query." 
            });

        } catch (ragErr) {
            jf.log.warn('Intent-RAG failed: ' + ragErr.message);
        }
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
