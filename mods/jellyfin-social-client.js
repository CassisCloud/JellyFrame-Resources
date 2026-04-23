(function() {
    var MOD_ID = "jellyfin-social";
    var PAGE_ID = "communityPage";
    var cachedPageNode = null;

    var cssString = [
        "/* Native page integration */",
        "#" + PAGE_ID + " {",
        "    background-color: var(--theme-background, #101010);",
        "    color: var(--theme-text-color, #fff);",
        "}",
        "/* Aggressively hide Jellyfin's fallback and background pages when active */",
        "body[data-social-active='true'] #fallbackPage,",
        "body[data-social-active='true'] .page:not(#" + PAGE_ID + ") {",
        "    display: none !important;",
        "    opacity: 0 !important;",
        "    pointer-events: none !important;",
        "}",
        "/* Main centered layout for the feed */",
        ".social-container {",
        "    max-width: 700px;",
        "    margin: 0 auto;",
        "    padding-top: 20px;",
        "    padding-bottom: 60px;",
        "}",
        "/* Modern Composer Box */",
        ".social-composer {",
        "    background: rgba(0, 0, 0, 0.2);",
        "    border: 1px solid rgba(255, 255, 255, 0.08);",
        "    border-radius: 12px;",
        "    padding: 16px;",
        "    margin-bottom: 30px;",
        "    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);",
        "}",
        ".social-textarea {",
        "    width: 100%;",
        "    min-height: 80px;",
        "    background: transparent !important;",
        "    border: none !important;",
        "    color: var(--theme-text-color, #fff) !important;",
        "    font-family: inherit;",
        "    font-size: 1.15em;",
        "    resize: none;",
        "    outline: none;",
        "    margin-bottom: 12px;",
        "}",
        ".social-composer-footer {",
        "    display: flex;",
        "    justify-content: flex-end;",
        "    align-items: center;",
        "    border-top: 1px solid rgba(255, 255, 255, 0.08);",
        "    padding-top: 12px;",
        "}",
        "/* Modern Feed Cards */",
        ".social-post-card {",
        "    background: rgba(0, 0, 0, 0.2);",
        "    border: 1px solid rgba(255, 255, 255, 0.05);",
        "    border-radius: 12px;",
        "    padding: 20px;",
        "    margin-bottom: 20px;",
        "    display: flex;",
        "    flex-direction: column;",
        "    transition: background 0.2s ease;",
        "}",
        ".social-post-card:hover {",
        "    background: rgba(0, 0, 0, 0.35);",
        "}",
        ".social-post-header {",
        "    display: flex;",
        "    align-items: center;",
        "    margin-bottom: 12px;",
        "}",
        ".social-avatar {",
        "    width: 44px;",
        "    height: 44px;",
        "    border-radius: 50%;",
        "    background: var(--theme-primary-color, #00a4dc);",
        "    color: #fff;",
        "    display: flex;",
        "    align-items: center;",
        "    justify-content: center;",
        "    font-weight: bold;",
        "    font-size: 1.3em;",
        "    margin-right: 14px;",
        "    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);",
        "}",
        ".social-author-info {",
        "    display: flex;",
        "    flex-direction: column;",
        "}",
        ".social-author-name {",
        "    font-weight: 600;",
        "    font-size: 1.05em;",
        "    color: var(--theme-text-color, #fff);",
        "}",
        ".social-post-time {",
        "    font-size: 0.85em;",
        "    color: rgba(255, 255, 255, 0.5);",
        "    margin-top: 2px;",
        "}",
        ".social-post-content {",
        "    font-size: 1.1em;",
        "    line-height: 1.5;",
        "    color: rgba(255, 255, 255, 0.9);",
        "    white-space: pre-wrap;",
        "    word-break: break-word;",
        "    padding-left: 58px; /* Indents text to align with author name */",
        "}",
        "/* Embedded Item Preview Cards */",
        ".social-item-embed {",
        "    margin-top: 15px;",
        "    margin-left: 58px;",
        "    border: 1px solid rgba(255, 255, 255, 0.1);",
        "    border-radius: 8px;",
        "    overflow: hidden;",
        "    background: rgba(0, 0, 0, 0.3);",
        "    transition: border-color 0.2s, background 0.2s;",
        "}",
        ".social-item-embed:hover {",
        "    border-color: var(--theme-primary-color, #00a4dc);",
        "    background: rgba(0, 0, 0, 0.5);",
        "}",
        ".social-item-embed-link {",
        "    display: flex;",
        "    text-decoration: none;",
        "    color: inherit;",
        "    align-items: center;",
        "}",
        ".social-item-embed-img {",
        "    width: 60px;",
        "    height: 90px;",
        "    object-fit: cover;",
        "    background: #000;",
        "}",
        ".social-item-embed-placeholder {",
        "    width: 60px;",
        "    height: 90px;",
        "    background: rgba(255, 255, 255, 0.05);",
        "    display: flex;",
        "    align-items: center;",
        "    justify-content: center;",
        "}",
        ".social-item-embed-placeholder .material-icons {",
        "    color: rgba(255, 255, 255, 0.3);",
        "    font-size: 32px;",
        "}",
        ".social-item-embed-info {",
        "    padding: 12px 16px;",
        "    display: flex;",
        "    flex-direction: column;",
        "    justify-content: center;",
        "}",
        ".social-item-embed-title {",
        "    font-weight: bold;",
        "    font-size: 1.1em;",
        "    margin-bottom: 4px;",
        "    color: var(--theme-text-color, #fff);",
        "}",
        ".social-item-embed-year {",
        "    font-size: 0.9em;",
        "    color: rgba(255, 255, 255, 0.6);",
        "}",
        ".social-item-embed-type {",
        "    font-size: 0.8em;",
        "    text-transform: uppercase;",
        "    letter-spacing: 0.05em;",
        "    color: var(--theme-primary-color, #00a4dc);",
        "    margin-top: 4px;",
        "}",
        "/* Mobile Adjustments */",
        "@media(max-width: 600px) {",
        "    .social-post-content, .social-item-embed {",
        "        padding-left: 0;",
        "        margin-left: 0;",
        "        margin-top: 8px;",
        "    }",
        "    .social-container { padding-top: 10px; }",
        "}"
    ].join('\n');

    function injectStyles() {
        if (document.getElementById('jf-social-styles')) return;
        var style = document.createElement('style');
        style.id = 'jf-social-styles';
        style.type = 'text/css';
        style.appendChild(document.createTextNode(cssString));
        document.head.appendChild(style);
    }

    injectStyles();

    function getInitials(name) {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    }

    function timeAgo(dateString) {
        var date = new Date(dateString);
        var seconds = Math.floor((new Date() - date) / 1000);
        var interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return "just now";
    }

    function handleRoute() {
        var isCommunity = window.location.hash.indexOf('#/community') !== -1;
        
        if (isCommunity) {
            document.body.setAttribute('data-social-active', 'true');

            if (!cachedPageNode) {
                cachedPageNode = createSocialFeedPageNode();
            }
            
            var skinBody = document.querySelector('.skinBody');
            if (!skinBody) {
                skinBody = document.body;
            }
            
            if (!document.body.contains(cachedPageNode)) {
                skinBody.appendChild(cachedPageNode);
            }

            cachedPageNode.style.display = 'block';
            cachedPageNode.classList.remove('hide');

            var pageTitle = document.querySelector('.skinHeader .pageTitle');
            if (pageTitle && pageTitle.innerText !== 'Community Timeline') {
                pageTitle.innerText = 'Community Timeline';
                document.title = 'Community Timeline';
            }

        } else {
            document.body.removeAttribute('data-social-active');

            if (cachedPageNode && document.body.contains(cachedPageNode)) {
                cachedPageNode.style.display = 'none';
                cachedPageNode.classList.add('hide');
            }
        }
    }

    window.addEventListener('popstate', handleRoute);
    window.addEventListener('hashchange', handleRoute);

    setTimeout(handleRoute, 100);

    function injectMenu() {
        var menuContainer = document.querySelector('.customMenuOptions');
        
        if (menuContainer && !document.getElementById('nav-social-btn')) {
            var link = document.createElement('a');
            link.id = 'nav-social-btn';
            link.className = 'lnkMediaFolder navMenuOption emby-button';
            link.href = '#/community';
            link.setAttribute('is', 'emby-linkbutton');

            var icon = document.createElement('span');
            icon.className = 'material-icons navMenuOptionIcon'; 
            icon.setAttribute('aria-hidden', 'true');
            icon.innerText = 'forum';

            var text = document.createElement('span');
            text.className = 'sectionName navMenuOptionText';
            text.innerText = 'Community Timeline';

            link.appendChild(icon);
            link.appendChild(text);

            link.addEventListener('click', function(e) {
                e.preventDefault();

                var userId = window.ApiClient ? window.ApiClient.getCurrentUserId() : '';
                var targetHash = '#/community?userId=' + userId;

                if (window.location.hash !== targetHash) {
                    history.pushState({ jellyfinSocial: true }, 'Community Timeline', targetHash);
                }

                handleRoute();
                
                var drawer = document.querySelector('.mainDrawer');
                if (drawer && drawer.classList.contains('drawer-open')) {
                    var drawerBtn = document.querySelector('.headerButton.paper-icon-button-light');
                    if (drawerBtn) {
                        drawerBtn.click();
                    }
                }
            });

            menuContainer.appendChild(link);
        }
    }

    setInterval(function() {
        injectMenu();
        if (window.location.hash.indexOf('#/community') !== -1) {
            handleRoute();
        }
    }, 500);

    function createSocialFeedPageNode() {
        var page = document.createElement('div');
        page.id = PAGE_ID;
        page.setAttribute('data-role', 'page');
        page.className = 'page mainAnimatedPage libraryPage noSecondaryNavPage jellyfin-social-theme';
        page.setAttribute('data-title', 'Community Timeline');
        
        page.setAttribute('data-backbutton', 'true');
        page.setAttribute('data-menubutton', 'false');

        var innerPad = document.createElement('div');
        innerPad.className = 'padded-left padded-right padded-bottom-page';

        var socialContainer = document.createElement('div');
        socialContainer.className = 'social-container';

        var composer = document.createElement('div');
        composer.className = 'social-composer';

        var textarea = document.createElement('textarea');
        textarea.placeholder = "What's on your mind? Share your thoughts or link a show you're watching...";
        textarea.className = 'social-textarea emby-input';

        var composerFooter = document.createElement('div');
        composerFooter.className = 'social-composer-footer';

        var submitBtn = document.createElement('button');
        submitBtn.className = 'emby-button raised button-submit';
        submitBtn.innerHTML = '<span class="material-icons" style="margin-right: 6px; font-size: 1.2em; vertical-align: middle;">send</span><span style="vertical-align: middle;">Post</span>';

        var feedContainer = document.createElement('div');
        feedContainer.className = 'social-feed-container';

        submitBtn.addEventListener('click', function() {
            var text = textarea.value.trim();
            if (!text) {
                return;
            }
            submitPost(text, function() {
                textarea.value = '';
                loadPosts(feedContainer);
            });
        });

        composerFooter.appendChild(submitBtn);
        composer.appendChild(textarea);
        composer.appendChild(composerFooter);

        socialContainer.appendChild(composer);
        socialContainer.appendChild(feedContainer);
        
        innerPad.appendChild(socialContainer);
        page.appendChild(innerPad);

        loadPosts(feedContainer);

        return page;
    }

    function submitPost(content, callback) {
        var userId = window.ApiClient ? window.ApiClient.getCurrentUserId() : null;
        if (!userId) {
            console.error("Could not determine user ID from ApiClient.");
            return;
        }

        var extractedItemId = null;
        var match = content.match(/(?:https?:\/\/[^\s]+|#\/details\?)[^\s]*id=([a-fA-F0-9]{32})/i);
        if (match) {
            extractedItemId = match[1];
        }

        var payload = {
            userId: userId,
            content: content
        };

        if (extractedItemId) {
            payload.itemId = extractedItemId;
        }

        fetch('/JellyFrame/mods/' + MOD_ID + '/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(function(res) {
            return res.json();
        }).then(function(data) {
            if (callback) {
                callback();
            }
        }).catch(function(err) {
            console.error("Social post failed", err);
        });
    }

    function loadPosts(container) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color: var(--theme-muted-text-color);">Loading posts...</div>';

        fetch('/JellyFrame/mods/' + MOD_ID + '/api/posts')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                container.innerHTML = '';
                var posts = data.posts || [];
                
                if (posts.length === 0) {
                    container.innerHTML = '<div style="text-align:center; padding:40px; color: var(--theme-muted-text-color, #888); font-size: 1.1em;">No posts yet. Be the first to share!</div>';
                    return;
                }

                for (var i = 0; i < posts.length; i++) {
                    var p = posts[i];
                    
                    var card = document.createElement('div');
                    card.className = 'social-post-card card';

                    var header = document.createElement('div');
                    header.className = 'social-post-header';

                    var avatar = document.createElement('div');
                    avatar.className = 'social-avatar';
                    avatar.innerText = getInitials(p.userName);

                    var authorInfo = document.createElement('div');
                    authorInfo.className = 'social-author-info';

                    var authorName = document.createElement('div');
                    authorName.className = 'social-author-name';
                    authorName.innerText = p.userName;

                    var timeLine = document.createElement('div');
                    timeLine.className = 'social-post-time';
                    timeLine.innerText = timeAgo(p.timestamp);

                    var safeText = p.content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    var extractedItemId = p.itemId;
                    
                    var urlRegex = /(?:https?:\/\/[^\s&]+|#\/details\?)[^\s&]*id=([a-fA-F0-9]{32})[^\s&]*/g;
                    
                    safeText = safeText.replace(urlRegex, function(fullMatch, id) {
                        if (!extractedItemId) extractedItemId = id;
                        return '';
                    }).trim();

                    safeText = safeText.replace(/(https?:\/\/[^\s&]+)/g, function(url) {
                        return '<a href="' + url + '" target="_blank" style="color: var(--theme-primary-color, #00a4dc); text-decoration: none;">' + url + '</a>';
                    });

                    authorInfo.appendChild(authorName);
                    authorInfo.appendChild(timeLine);
                    
                    header.appendChild(avatar);
                    header.appendChild(authorInfo);

                    card.appendChild(header);
                    
                    if (safeText.length > 0) {
                        var contentLine = document.createElement('div');
                        contentLine.className = 'social-post-content';
                        contentLine.innerHTML = safeText;
                        card.appendChild(contentLine);
                    }
                    
                    if (extractedItemId && window.ApiClient) {
                        var embedContainer = document.createElement('div');
                        embedContainer.className = 'social-item-embed';
                        embedContainer.innerHTML = '<div style="padding: 16px; color: rgba(255,255,255,0.5); font-size: 0.85em;">Loading item details...</div>';
                        card.appendChild(embedContainer);

                        (function(container, itemId) {
                            var currentUserId = window.ApiClient.getCurrentUserId();
                            window.ApiClient.getItem(currentUserId, itemId).then(function(item) {
                                if (!item) {
                                    container.style.display = 'none';
                                    return;
                                }
                                
                                var imgTag = '';
                                if (item.ImageTags && item.ImageTags.Primary) {
                                    var imgUrl = window.ApiClient.getImageUrl(item.Id, { type: 'Primary', maxWidth: 100, tag: item.ImageTags.Primary });
                                    imgTag = '<img src="' + imgUrl + '" class="social-item-embed-img" />';
                                } else if (item.ImageTags && item.ImageTags.Thumb) {
                                    var imgUrl = window.ApiClient.getImageUrl(item.Id, { type: 'Thumb', maxWidth: 100, tag: item.ImageTags.Thumb });
                                    imgTag = '<img src="' + imgUrl + '" class="social-item-embed-img" />';
                                } else {
                                    var icon = 'movie';
                                    if (item.Type === 'Audio' || item.Type === 'MusicAlbum') icon = 'music_note';
                                    else if (item.Type === 'Book') icon = 'book';
                                    else if (item.Type === 'Series' || item.Type === 'Episode') icon = 'tv';
                    
                                    imgTag = '<div class="social-item-embed-placeholder"><span class="material-icons">' + icon + '</span></div>';
                                }
                    
                                var year = item.ProductionYear ? '<div class="social-item-embed-year">' + item.ProductionYear + '</div>' : '';
                                
                                var typeStr = item.Type || 'Item';
                                if (typeStr === 'Series') typeStr = 'TV Show';
                                var type = '<div class="social-item-embed-type">' + typeStr + '</div>';
                    
                                var embedLink = document.createElement('a');
                                embedLink.href = '#/details?id=' + item.Id + '&serverId=' + item.ServerId;
                                embedLink.className = 'social-item-embed-link';
                                embedLink.innerHTML = imgTag + '<div class="social-item-embed-info"><div class="social-item-embed-title">' + item.Name + '</div>' + year + type + '</div>';
                                
                                embedLink.addEventListener('click', function() {
                                    document.body.removeAttribute('data-social-active');
                                    if (cachedPageNode) {
                                        cachedPageNode.style.display = 'none';
                                        cachedPageNode.classList.add('hide');
                                    }
                                });
                    
                                container.innerHTML = '';
                                container.appendChild(embedLink);
                    
                            }).catch(function() {
                                container.style.display = 'none';
                            });
                        })(embedContainer, extractedItemId);
                    }

                    container.appendChild(card);
                }
            }).catch(function(err) {
                container.innerHTML = '<div style="text-align:center; padding:20px; color:#FF4444;">Failed to load posts.</div>';
                console.error(err);
            });
    }
})();
