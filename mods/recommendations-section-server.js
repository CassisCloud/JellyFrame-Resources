jf.routes.get('/recommendations', function(req, res) {
    var userId = req.query['userId'];
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    var cacheKey = 'recs_' + userId;
    var cached = jf.cache.get(cacheKey);
    if (cached) return res.json(cached);

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
        if (cand.isFavorite) continue;

        var score = 0;

        if (cand.genres) {
            for (var n = 0; n < cand.genres.length; n++) {
                var cg = cand.genres[n];
                if (profile.genres[cg]) score += profile.genres[cg];
            }
        }

        if (cand.tags) {
            for (var p = 0; p < cand.tags.length; p++) {
                var ct = cand.tags[p];
                if (profile.tags[ct]) score += profile.tags[ct];
            }
        }

        if (score > 0) {
            scored.push({ id: cand.id, name: cand.name, score: score });
        }
    }

    var results = [];

    if (scored.length === 0) {
        jf.log.info('Cold start for user ' + userId + '. Serving highly rated fallback.');
        
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
        scored.sort(function(a, b) { return b.score - a.score; });
        results = scored.slice(0, 10);
    }

    jf.cache.set(cacheKey, results, 60 * 60 * 1000);
    return res.json(results);
});
