jf.onStart(function() {
    jf.log.info('Recommendation engine started');
});

jf.onStop(function() {
    jf.log.info('Recommendation engine stopped');
});

function getUserProfile(userId) {
    var favs = jf.jellyfin.getItems({ 
        type: 'Movie', 
        isFavorite: 'true', 
        userId: userId 
    }) || [];

    var profile = { genres: {}, tags: {} };

    for (var i = 0; i < favs.length; i++) {
        var item = favs[i];
        
        if (item.genres) {
            for (var j = 0; j < item.genres.length; j++) {
                var g = item.genres[j];
                if (!profile.genres[g]) { 
                    profile.genres[g] = 0; 
                }
                profile.genres[g] += 1;
            }
        }
        
        if (item.tags) {
            for (var k = 0; k < item.tags.length; k++) {
                var t = item.tags[k];
                if (!profile.tags[t]) { 
                    profile.tags[t] = 0; 
                }
                profile.tags[t] += 1;
            }
        }
    }
    return profile;
}

jf.routes.get('/recommendations', function(req, res) {
    try {
        var userId = req.query['userId'];
        
        if (!userId) {
            return res.status(400).json({ error: 'Missing userId parameter' });
        }

        var cacheKey = 'recs_' + userId;
        var cached = jf.cache.get(cacheKey);
        
        if (cached) {
            return res.json(cached);
        }

        var profile = getUserProfile(userId);
        var candidates = jf.jellyfin.getItems({ 
            type: 'Movie', 
            limit: '200', 
            sortBy: 'Random',
            userId: userId 
        }) || [];

        var scored = [];

        for (var m = 0; m < candidates.length; m++) {
            var cand = candidates[m];
            
            if (cand.isFavorite) {
                continue;
            }

            var score = 0;

            if (cand.genres) {
                for (var n = 0; n < cand.genres.length; n++) {
                    var cg = cand.genres[n];
                    if (profile.genres[cg]) {
                        score += profile.genres[cg];
                    }
                }
            }

            if (cand.tags) {
                for (var p = 0; p < cand.tags.length; p++) {
                    var ct = cand.tags[p];
                    if (profile.tags[ct]) {
                        score += profile.tags[ct];
                    }
                }
            }

            if (score > 0) {
                scored.push({ id: cand.id, name: cand.name, score: score });
            }
        }

        var results = [];

        if (scored.length === 0) {
            jf.log.info('Cold start for user ' + userId);
            
            var fallbacks = jf.jellyfin.getItems({
                type: 'Movie',
                limit: '10',
                sortBy: 'CommunityRating',
                sortOrder: 'Descending',
                userId: userId
            }) || [];

            for (var f = 0; f < fallbacks.length; f++) {
                results.push({
                    id: fallbacks[f].id,
                    name: fallbacks[f].name,
                    score: 1 
                });
            }
        } else {
            scored.sort(function(a, b) { 
                return b.score - a.score; 
            });
            results = scored.slice(0, 10);
        }

        jf.cache.set(cacheKey, results, 5 * 60 * 1000);
        return res.json(results);

    } catch (e) {
        jf.log.error('Recs Error: ' + String(e));
        return res.status(500).json({ error: String(e) });
    }
});
