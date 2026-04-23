jf.onStart(function () {
    jf.log.info('Jellyfin Social plugin started.');

    var postsTable = jf.db.table('posts');
    var commentsTable = jf.db.table('comments');
    var reactionsTable = jf.db.table('reactions');

    // GET /api/posts -> Intelligent Paginated timeline
    jf.routes.get('/posts', function (req, res) {
        var limit = parseInt(req.query['limit'] || '15', 10);
        var before = req.query['before']; // Cursor for infinite scroll

        var query = jf.db.query('posts');

        if (before) {
            query.where({ timestamp: { lt: before } });
        }

        var posts = query.orderBy('timestamp', 'desc')
            .limit(limit)
            .run();

        // Enrich posts with nested comments and reactions
        for (var i = 0; i < posts.length; i++) {
            var postId = posts[i].id;
            posts[i].comments = jf.db.query('comments')
                .where({ postId: postId })
                .orderBy('timestamp', 'asc')
                .run();
            posts[i].reactions = jf.db.query('reactions')
                .where({ postId: postId })
                .run();
        }

        return res.json({ posts: posts });
    });

    // POST /api/posts -> Create status
    jf.routes.post('/posts', function (req, res) {
        var body = req.body;
        if (!body || !body.userId || !body.content) return res.status(400).json({ error: 'Invalid' });

        var post = {
            id: generateId(),
            userId: body.userId,
            userName: body.userName || 'Unknown',
            content: String(body.content),
            itemId: body.itemId || null,
            timestamp: new Date().toISOString()
        };
        postsTable.insert(post);
        return res.json({ success: true, post: post });
    });

    // PUT /api/posts/:id -> Edit status
    jf.routes.put('/posts/:id', function (req, res) {
        var id = req.pathParams['id'], body = req.body || {};
        postsTable.update({ id: id }, { content: String(body.content), itemId: body.itemId || null });
        return res.json({ success: true });
    });

    // DELETE /api/posts/:id -> Delete status + associated data
    jf.routes.delete('/posts/:id', function (req, res) {
        var id = req.pathParams['id'];
        postsTable.delete({ id: id });
        commentsTable.delete({ postId: id });
        reactionsTable.delete({ postId: id });
        return res.json({ success: true });
    });

    jf.routes.post('/posts/:id/reactions', function (req, res) {
        var postId = req.pathParams['id'], body = req.body;
        var existing = reactionsTable.findOne({ postId: postId, userId: body.userId, emoji: body.emoji });
        if (existing) {
            reactionsTable.delete({ id: existing.id });
            return res.json({ removed: true });
        }
        reactionsTable.insert({ id: generateId(), postId: postId, userId: body.userId, userName: body.userName, emoji: body.emoji });
        return res.json({ added: true });
    });

    jf.routes.post('/posts/:id/comments', function (req, res) {
        var postId = req.pathParams['id'], body = req.body;
        var comment = {
            id: generateId(),
            postId: postId,
            userId: body.userId,
            userName: body.userName,
            content: String(body.content),
            timestamp: new Date().toISOString()
        };
        commentsTable.insert(comment);
        return res.json({ success: true });
    });

    jf.routes.put('/comments/:id', function (req, res) {
        commentsTable.update({ id: req.pathParams['id'] }, { content: String(req.body.content) });
        return res.json({ success: true });
    });

    jf.routes.delete('/comments/:id', function (req, res) {
        commentsTable.delete({ id: req.pathParams['id'] });
        return res.json({ success: true });
    });
});

jf.onStop(function () {
    jf.jellyfin.off('playback.stopped');
});

function generateId() { return Math.random().toString(36).substring(2, 15); }
