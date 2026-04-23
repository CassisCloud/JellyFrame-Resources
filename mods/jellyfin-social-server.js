jf.onStart(function() {
    jf.log.info('Jellyfin Social plugin started.');
    
    var postsTable = jf.db.table('posts');

    // GET /api/posts -> Fetch the latest timeline
    jf.routes.get('/posts', function(req, res) {
        var rows = jf.db.query('posts')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .run();
            
        return res.json({ posts: rows });
    });

    // POST /api/posts -> Submit a new post
    jf.routes.post('/posts', function(req, res) {
        var body = req.body;
        
        if (!body || !body.userId || (!body.content && !body.itemId)) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        var user = jf.jellyfin.getUser(String(body.userId));
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        var post = {
            id: generateId(),
            userId: user.id,
            userName: user.name,
            content: body.content ? String(body.content) : "",
            itemId: body.itemId ? String(body.itemId) : null,
            timestamp: new Date().toISOString()
        };

        postsTable.insert(post);
        return res.json({ success: true, post: post });
    });

    jf.jellyfin.on('playback.stopped', function(data) {
        if (data.playedToEnd && data.itemId && data.userId) {
            var user = jf.jellyfin.getUser(data.userId);
            var item = jf.jellyfin.getItem(data.itemId, data.userId);
            
            if (user && item) {
                var post = {
                    id: generateId(),
                    userId: user.id,
                    userName: user.name,
                    content: "Just finished watching " + item.name + "!",
                    itemId: item.id,
                    timestamp: new Date().toISOString()
                };
                postsTable.insert(post);
            }
        }
    });
});

jf.onStop(function() {
    jf.jellyfin.off('playback.stopped');
    jf.log.info('Jellyfin Social plugin stopped.');
});

function generateId() {
    return Math.random().toString(36).substring(2, 15);
}
