(function () {
    'use strict';

    var QUEUE_KEY = 'jf_queue_v1';
    var BAR_ID = 'jf-queue-panel';
    var BTN_ID = 'jf-queue-fab';
    var STYLE_ID = 'jf-queue-styles';

    var queue = loadQueue();
    var currentIdx = -1;
    var panelOpen = false;
    var lastPlayingId = null;

    function loadQueue() {
        try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (e) { return []; }
    }
    function saveQueue() {
        try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch (e) {}
    }

    function playItem(item, callback) {
        if (typeof ApiClient === 'undefined') return;
        ApiClient.getJSON(ApiClient.getUrl('Sessions')).then(function (sessions) {
            var deviceId = typeof ApiClient.deviceId === 'function' ? ApiClient.deviceId() : null;
            var sessionId = null;
            for (var i = 0; i < sessions.length; i++) {
                if (deviceId && sessions[i].DeviceId === deviceId) { sessionId = sessions[i].Id; break; }
            }
            if (!sessionId) {
                for (var j = 0; j < sessions.length; j++) {
                    if (sessions[j].Client && sessions[j].Client.indexOf('Web') !== -1) { sessionId = sessions[j].Id; break; }
                }
            }
            if (!sessionId && sessions.length > 0) { sessionId = sessions[0].Id; }
            if (!sessionId) return;

            var headers = { 'Accept': 'application/json' };
            if (typeof ApiClient.getAuthorizationHeader === 'function') {
                headers['Authorization'] = ApiClient.getAuthorizationHeader();
            } else if (typeof ApiClient.accessToken === 'function') {
                headers['Authorization'] = 'MediaBrowser Token="' + ApiClient.accessToken() + '"';
            }

            var playUrl = ApiClient.getUrl('Sessions/' + sessionId + '/Playing') + '?playCommand=PlayNow&itemIds=' + item.id;
            fetch(playUrl, { method: 'POST', headers: headers })
                .then(function () { if (callback) { callback(); } })
                .catch(function (e) { console.error('[jf-queue] Play failed', e); });
        });
    }

    function playIndex(idx) {
        if (idx < 0 || idx >= queue.length) return;
        currentIdx = idx;
        lastPlayingId = queue[idx].id;
        playItem(queue[idx]);
        renderPanel();
        updateFab();
    }

    function playNext() {
        if (currentIdx + 1 < queue.length) {
            playIndex(currentIdx + 1);
        } else {
            currentIdx = -1;
            lastPlayingId = null;
            renderPanel();
            updateFab();
        }
    }

    function addToQueue(item) {
        for (var i = 0; i < queue.length; i++) {
            if (queue[i].id === item.id) {
                showToast(item.name + ' is already in the queue');
                return;
            }
        }
        queue.push(item);
        saveQueue();
        renderPanel();
        updateFab();
        showToast('Added ' + item.name + ' to queue');
    }

    function removeFromQueue(idx) {
        if (idx === currentIdx) { currentIdx = -1; lastPlayingId = null; }
        else if (idx < currentIdx) { currentIdx--; }
        queue.splice(idx, 1);
        saveQueue();
        renderPanel();
        updateFab();
    }

    function moveItem(fromIdx, toIdx) {
        if (toIdx < 0 || toIdx >= queue.length) return;
        var item = queue.splice(fromIdx, 1)[0];
        queue.splice(toIdx, 0, item);
        if (currentIdx === fromIdx) { currentIdx = toIdx; }
        else if (fromIdx < currentIdx && toIdx >= currentIdx) { currentIdx--; }
        else if (fromIdx > currentIdx && toIdx <= currentIdx) { currentIdx++; }
        saveQueue();
        renderPanel();
    }

    function clearQueue() {
        queue = [];
        currentIdx = -1;
        lastPlayingId = null;
        saveQueue();
        renderPanel();
        updateFab();
    }

    function resolveItemFromCard(card) {
        var id = card.getAttribute('data-id');
        var name = card.getAttribute('data-title') ||
            (card.querySelector('.cardText-first bdi, .cardText-first a') || {}).textContent ||
            (card.querySelector('[title]') || {}).title || 'Unknown';
        var type = card.getAttribute('data-type') || '';
        var thumb = (card.querySelector('.cardImageContainer, .cardContent') || {}).style;
        var thumbUrl = thumb ? (thumb.backgroundImage || '').replace(/url\(["']?|["']?\)/g, '') : '';
        if (!id) return null;
        return { id: id, name: name.trim(), type: type, thumbUrl: thumbUrl };
    }

    function resolveItemFromDetailPage() {
        var hash = window.location.hash;
        var match = hash.match(/[?&]id=([a-zA-Z0-9]+)/);
        if (!match) return null;
        var id = match[1];
        var nameEl = document.querySelector('.itemName, h1.itemName, .detail-clamp-3');
        var name = nameEl ? nameEl.textContent.trim() : document.title || 'Unknown';
        var thumbEl = document.querySelector('.itemBackdropImage, .cardImageContainer');
        var thumbUrl = thumbEl ? (thumbEl.style.backgroundImage || '').replace(/url\(["']?|["']?\)/g, '') : '';
        return { id: id, name: name, type: '', thumbUrl: thumbUrl };
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '#jf-queue-fab{position:fixed;bottom:32px;right:32px;z-index:99998;display:flex;align-items:center;gap:8px;',
            'background:#111;border:1px solid rgba(255,255,255,.12);color:#fff;padding:0 18px;height:44px;',
            'border-radius:22px;cursor:pointer;font-family:"Geist Mono",monospace;font-size:11px;font-weight:600;',
            'letter-spacing:.1em;text-transform:uppercase;transition:all .2s ease;box-shadow:0 4px 24px rgba(0,0,0,.5);}',
            '#jf-queue-fab:hover{background:#1a1a1a;border-color:rgba(255,255,255,.25);transform:translateY(-2px);}',
            '#jf-queue-fab .jfq-count{background:#00a4dc;color:#fff;border-radius:10px;padding:2px 7px;font-size:10px;min-width:18px;text-align:center;}',
            '#jf-queue-fab .jfq-playing-dot{width:7px;height:7px;background:#1db954;border-radius:50%;animation:jfq-pulse 1.5s infinite;}',
            '@keyframes jfq-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(1.3);}}',

            '#jf-queue-panel{position:fixed;bottom:88px;right:32px;z-index:99997;width:360px;max-height:70vh;',
            'background:#0e0e0e;border:1px solid rgba(255,255,255,.1);border-radius:16px;',
            'display:flex;flex-direction:column;overflow:hidden;',
            'box-shadow:0 24px 64px rgba(0,0,0,.8);',
            'transform:translateY(12px) scale(.97);opacity:0;pointer-events:none;',
            'transition:transform .25s cubic-bezier(.16,1,.3,1),opacity .25s ease;}',
            '#jf-queue-panel.open{transform:translateY(0) scale(1);opacity:1;pointer-events:auto;}',

            '.jfq-header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;',
            'border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0;}',
            '.jfq-title{font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:rgba(255,255,255,.5);}',
            '.jfq-header-actions{display:flex;gap:8px;}',
            '.jfq-hbtn{background:none;border:none;color:rgba(255,255,255,.35);cursor:pointer;font-size:12px;',
            'font-family:"Geist Mono",monospace;letter-spacing:.08em;text-transform:uppercase;padding:4px 8px;',
            'border-radius:4px;transition:all .15s;}',
            '.jfq-hbtn:hover{color:#fff;background:rgba(255,255,255,.08);}',

            '.jfq-now{display:flex;align-items:center;gap:12px;padding:12px 18px;',
            'background:rgba(0,164,220,.07);border-bottom:1px solid rgba(0,164,220,.12);}',
            '.jfq-now-dot{width:6px;height:6px;background:#00a4dc;border-radius:50%;flex-shrink:0;animation:jfq-pulse 1.5s infinite;}',
            '.jfq-now-name{font-size:12px;color:#00a4dc;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}',
            '.jfq-now-next{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:11px;',
            'font-family:"Geist Mono",monospace;text-transform:uppercase;letter-spacing:.08em;padding:2px 6px;',
            'border-radius:3px;transition:all .15s;white-space:nowrap;}',
            '.jfq-now-next:hover{color:#fff;background:rgba(255,255,255,.08);}',

            '.jfq-list{overflow-y:auto;flex:1;}',
            '.jfq-list::-webkit-scrollbar{width:4px;}',
            '.jfq-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px;}',
            '.jfq-empty{padding:40px 20px;text-align:center;color:rgba(255,255,255,.2);',
            'font-family:"Geist Mono",monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;line-height:2;}',

            '.jfq-item{display:flex;align-items:center;gap:10px;padding:10px 14px;',
            'border-bottom:1px solid rgba(255,255,255,.04);transition:background .15s;cursor:default;position:relative;}',
            '.jfq-item:hover{background:rgba(255,255,255,.04);}',
            '.jfq-item.is-current{background:rgba(0,164,220,.06);}',
            '.jfq-item-num{font-family:"Geist Mono",monospace;font-size:10px;color:rgba(255,255,255,.2);width:18px;text-align:right;flex-shrink:0;}',
            '.jfq-item-thumb{width:54px;height:32px;border-radius:4px;background:#1a1a1a;background-size:cover;background-position:center;flex-shrink:0;position:relative;overflow:hidden;}',
            '.jfq-item-thumb-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;',
            'background:rgba(0,0,0,.5);opacity:0;transition:opacity .15s;cursor:pointer;}',
            '.jfq-item:hover .jfq-item-thumb-play{opacity:1;}',
            '.jfq-item-thumb-play .material-icons{font-size:16px;color:#fff;}',
            '.jfq-item-info{flex:1;min-width:0;}',
            '.jfq-item-name{font-size:12px;color:#eee;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.jfq-item.is-current .jfq-item-name{color:#00a4dc;}',
            '.jfq-item-type{font-family:"Geist Mono",monospace;font-size:9px;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:.1em;margin-top:2px;}',
            '.jfq-item-actions{display:flex;gap:4px;flex-shrink:0;}',
            '.jfq-ibtn{background:none;border:none;color:rgba(255,255,255,.25);cursor:pointer;',
            'width:24px;height:24px;border-radius:4px;display:flex;align-items:center;justify-content:center;',
            'transition:all .15s;font-size:14px;}',
            '.jfq-ibtn:hover{color:#fff;background:rgba(255,255,255,.1);}',
            '.jfq-ibtn.jfq-remove:hover{color:#f87171;background:rgba(248,113,113,.1);}',
            '.jfq-ibtn .material-icons{font-size:14px;}',

            '.jfq-footer{padding:12px 18px;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;}',
            '.jfq-play-all{width:100%;height:36px;background:#00a4dc;border:none;border-radius:8px;',
            'color:#fff;font-family:"Geist Mono",monospace;font-size:10px;font-weight:700;letter-spacing:.15em;',
            'text-transform:uppercase;cursor:pointer;transition:all .15s;}',
            '.jfq-play-all:hover{background:#0090c4;transform:translateY(-1px);}',
            '.jfq-play-all:disabled{background:rgba(255,255,255,.1);color:rgba(255,255,255,.3);cursor:default;transform:none;}',

            '.jfq-add-btn{position:absolute;top:6px;left:6px;z-index:5;',
            'background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.15);border-radius:4px;',
            'color:#fff;width:26px;height:26px;display:flex;align-items:center;justify-content:center;',
            'cursor:pointer;opacity:0;transition:opacity .15s;backdrop-filter:blur(4px);}',
            '.jfq-add-btn .material-icons{font-size:14px;}',
            '.jfq-add-btn:hover{background:rgba(0,164,220,.8);border-color:#00a4dc;}',
            '.card:hover .jfq-add-btn{opacity:1;}',
            '.jfq-add-btn.in-queue{opacity:1;background:rgba(0,164,220,.7);border-color:#00a4dc;}',

            '#jfq-detail-btn{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 16px;',
            'background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:6px;',
            'color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;backdrop-filter:blur(4px);}',
            '#jfq-detail-btn:hover{background:rgba(0,164,220,.25);border-color:#00a4dc;color:#00a4dc;}',
            '#jfq-detail-btn .material-icons{font-size:16px;}',

            '#jfq-toast{position:fixed;bottom:96px;left:50%;transform:translateX(-50%) translateY(8px);',
            'background:#111;border:1px solid rgba(255,255,255,.12);color:#fff;',
            'padding:10px 18px;border-radius:8px;font-size:12px;z-index:999999;',
            'opacity:0;transition:all .25s ease;pointer-events:none;white-space:nowrap;',
            'font-family:"Geist Mono",monospace;letter-spacing:.05em;}',
            '#jfq-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}',
        ].join('');
        document.head.appendChild(s);
    }

    var toastTimer = null;
    function showToast(msg) {
        var t = document.getElementById('jfq-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'jfq-toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        if (toastTimer) { clearTimeout(toastTimer); }
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
    }

    function ensureFab() {
        var fab = document.getElementById(BTN_ID);
        if (!fab) {
            fab = document.createElement('button');
            fab.id = BTN_ID;
            fab.onclick = togglePanel;
            document.body.appendChild(fab);
        }
        return fab;
    }

    function updateFab() {
        var fab = ensureFab();
        var isPlaying = currentIdx >= 0 && currentIdx < queue.length;
        fab.innerHTML = [
            isPlaying ? '<span class="jfq-playing-dot"></span>' : '<span class="material-icons" style="font-size:16px;">queue_music</span>',
            ' Queue',
            queue.length > 0 ? '<span class="jfq-count">' + queue.length + '</span>' : ''
        ].join('');
    }

    function togglePanel() {
        panelOpen = !panelOpen;
        var panel = document.getElementById(BAR_ID);
        if (panel) {
            if (panelOpen) { panel.classList.add('open'); }
            else { panel.classList.remove('open'); }
        }
    }

    function ensurePanel() {
        var panel = document.getElementById(BAR_ID);
        if (!panel) {
            panel = document.createElement('div');
            panel.id = BAR_ID;
            document.body.appendChild(panel);
            if (panelOpen) { panel.classList.add('open'); }
        }
        return panel;
    }

    function renderPanel() {
        var panel = ensurePanel();
        panel.innerHTML = '';

        var header = document.createElement('div');
        header.className = 'jfq-header';
        header.innerHTML = '<span class="jfq-title">Watch Queue</span>';
        var headerActions = document.createElement('div');
        headerActions.className = 'jfq-header-actions';
        if (queue.length > 0) {
            var clearBtn = document.createElement('button');
            clearBtn.className = 'jfq-hbtn';
            clearBtn.textContent = 'Clear';
            clearBtn.onclick = function () {
                if (confirm('Clear the entire queue?')) { clearQueue(); }
            };
            headerActions.appendChild(clearBtn);
        }
        header.appendChild(headerActions);
        panel.appendChild(header);

        if (currentIdx >= 0 && currentIdx < queue.length) {
            var nowBar = document.createElement('div');
            nowBar.className = 'jfq-now';
            nowBar.innerHTML = '<div class="jfq-now-dot"></div><div class="jfq-now-name">' + queue[currentIdx].name + '</div>';
            var nextBtn = document.createElement('button');
            nextBtn.className = 'jfq-now-next';
            nextBtn.textContent = 'Skip';
            nextBtn.onclick = playNext;
            nowBar.appendChild(nextBtn);
            panel.appendChild(nowBar);
        }

        var list = document.createElement('div');
        list.className = 'jfq-list';

        if (queue.length === 0) {
            list.innerHTML = '<div class="jfq-empty">Queue is empty<br>Hover any card to add</div>';
        } else {
            queue.forEach(function (item, i) {
                var row = document.createElement('div');
                row.className = 'jfq-item' + (i === currentIdx ? ' is-current' : '');
                row.setAttribute('data-qidx', i);

                var num = document.createElement('div');
                num.className = 'jfq-item-num';
                num.textContent = i + 1;

                var thumb = document.createElement('div');
                thumb.className = 'jfq-item-thumb';
                if (item.thumbUrl) { thumb.style.backgroundImage = 'url(' + item.thumbUrl + ')'; }

                var thumbPlay = document.createElement('div');
                thumbPlay.className = 'jfq-item-thumb-play';
                thumbPlay.innerHTML = '<span class="material-icons">play_arrow</span>';
                thumbPlay.onclick = (function (idx) { return function () { playIndex(idx); }; })(i);
                thumb.appendChild(thumbPlay);

                var info = document.createElement('div');
                info.className = 'jfq-item-info';
                info.innerHTML = '<div class="jfq-item-name">' + item.name + '</div>' +
                    (item.type ? '<div class="jfq-item-type">' + item.type + '</div>' : '');

                var actions = document.createElement('div');
                actions.className = 'jfq-item-actions';

                if (i > 0) {
                    var upBtn = document.createElement('button');
                    upBtn.className = 'jfq-ibtn';
                    upBtn.title = 'Move up';
                    upBtn.innerHTML = '<span class="material-icons">arrow_upward</span>';
                    upBtn.onclick = (function (idx) { return function () { moveItem(idx, idx - 1); }; })(i);
                    actions.appendChild(upBtn);
                }

                if (i < queue.length - 1) {
                    var downBtn = document.createElement('button');
                    downBtn.className = 'jfq-ibtn';
                    downBtn.title = 'Move down';
                    downBtn.innerHTML = '<span class="material-icons">arrow_downward</span>';
                    downBtn.onclick = (function (idx) { return function () { moveItem(idx, idx + 1); }; })(i);
                    actions.appendChild(downBtn);
                }

                var removeBtn = document.createElement('button');
                removeBtn.className = 'jfq-ibtn jfq-remove';
                removeBtn.title = 'Remove';
                removeBtn.innerHTML = '<span class="material-icons">close</span>';
                removeBtn.onclick = (function (idx) { return function () { removeFromQueue(idx); }; })(i);
                actions.appendChild(removeBtn);

                row.appendChild(num);
                row.appendChild(thumb);
                row.appendChild(info);
                row.appendChild(actions);
                list.appendChild(row);
            });
        }

        panel.appendChild(list);

        var footer = document.createElement('div');
        footer.className = 'jfq-footer';
        var playAllBtn = document.createElement('button');
        playAllBtn.className = 'jfq-play-all';
        playAllBtn.textContent = currentIdx >= 0 ? 'Now Playing — Skip to Start' : 'Play from Start';
        playAllBtn.disabled = queue.length === 0;
        playAllBtn.onclick = function () { if (queue.length > 0) { playIndex(0); } };
        footer.appendChild(playAllBtn);
        panel.appendChild(footer);
    }

    function isInQueue(id) {
        for (var i = 0; i < queue.length; i++) {
            if (queue[i].id === id) { return true; }
        }
        return false;
    }

    function injectCardButtons() {
        var cards = document.querySelectorAll('.card[data-id]:not([data-jfq-injected])');
        cards.forEach(function (card) {
            card.setAttribute('data-jfq-injected', '1');
            var id = card.getAttribute('data-id');
            if (!id) return;

            var btn = document.createElement('button');
            btn.className = 'jfq-add-btn' + (isInQueue(id) ? ' in-queue' : '');
            btn.title = 'Add to Queue';
            btn.innerHTML = '<span class="material-icons">' + (isInQueue(id) ? 'playlist_add_check' : 'playlist_add') + '</span>';
            btn.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                var item = resolveItemFromCard(card);
                if (!item) return;
                if (isInQueue(id)) {
                    for (var i = 0; i < queue.length; i++) {
                        if (queue[i].id === id) { removeFromQueue(i); break; }
                    }
                    btn.className = 'jfq-add-btn';
                    btn.innerHTML = '<span class="material-icons">playlist_add</span>';
                } else {
                    addToQueue(item);
                    btn.className = 'jfq-add-btn in-queue';
                    btn.innerHTML = '<span class="material-icons">playlist_add_check</span>';
                }
            };

            var scalable = card.querySelector('.cardScalable');
            if (scalable) { scalable.appendChild(btn); }
            else { card.style.position = 'relative'; card.appendChild(btn); }
        });
    }

    function injectDetailButton() {
        var hash = window.location.hash;
        if (hash.indexOf('/details') === -1 && hash.indexOf('/item') === -1) { return; }

        if (document.getElementById('jfq-detail-btn')) { return; }

        var btnsRow = document.querySelector('.detailButtons, .itemDetailButtons, .buttons');
        if (!btnsRow) { return; }

        var item = resolveItemFromDetailPage();
        if (!item) { return; }

        var btn = document.createElement('button');
        btn.id = 'jfq-detail-btn';
        var inQ = isInQueue(item.id);
        btn.innerHTML = '<span class="material-icons">' + (inQ ? 'playlist_add_check' : 'playlist_add') + '</span>' + (inQ ? 'In Queue' : 'Add to Queue');
        btn.onclick = function () {
            var cur = resolveItemFromDetailPage();
            if (!cur) { return; }
            if (isInQueue(cur.id)) {
                for (var i = 0; i < queue.length; i++) {
                    if (queue[i].id === cur.id) { removeFromQueue(i); break; }
                }
                btn.innerHTML = '<span class="material-icons">playlist_add</span>Add to Queue';
            } else {
                addToQueue(cur);
                btn.innerHTML = '<span class="material-icons">playlist_add_check</span>In Queue';
            }
        };
        btnsRow.appendChild(btn);
    }

    function checkAutoAdvance() {
        if (currentIdx < 0 || currentIdx >= queue.length) { return; }
        if (typeof ApiClient === 'undefined') { return; }

        var video = document.querySelector('video');
        var osdPage = document.getElementById('videoOsdPage');
        var playerActive = !!video || (osdPage && !osdPage.classList.contains('hide'));

        if (!playerActive && lastPlayingId) {
            setTimeout(function () {
                var videoNow = document.querySelector('video');
                var osdNow = document.getElementById('videoOsdPage');
                var stillActive = !!videoNow || (osdNow && !osdNow.classList.contains('hide'));
                if (!stillActive && lastPlayingId) {
                    lastPlayingId = null;
                    playNext();
                }
            }, 3000);
        }
    }

    document.addEventListener('click', function (e) {
        if (!panelOpen) { return; }
        var panel = document.getElementById(BAR_ID);
        var fab = document.getElementById(BTN_ID);
        if (panel && !panel.contains(e.target) && fab && !fab.contains(e.target)) {
            panelOpen = false;
            panel.classList.remove('open');
        }
    });

    function tick() {
        injectStyles();
        ensureFab();
        updateFab();
        ensurePanel();
        injectCardButtons();
        injectDetailButton();
        checkAutoAdvance();
    }

    setInterval(tick, 800);
    renderPanel();

})();