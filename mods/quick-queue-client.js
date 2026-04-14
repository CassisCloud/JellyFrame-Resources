
(function() {
    if (typeof ApiClient === 'undefined') {
        setTimeout(arguments.callee, 100);
        return;
    }
    initQuickQueue();
})();

function initQuickQueue() {
    var accentColor = '{{ACCENT_COLOR}}';
    var showButton = '{{SHOW_QUEUE_BUTTON}}' === '1';
    
    var panel = document.createElement('div');
    panel.id = 'jf-quick-queue-panel';
    panel.style.cssText = 'position:fixed;right:0;top:0;height:100%;width:320px;background:#111;border-left:2px solid ' + accentColor + ';z-index:9999;transform:translateX(100%);transition:transform 0.2s;display:flex;flex-direction:column;';
    panel.innerHTML = '' +
        '<div style="padding:12px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center">' +
            '<strong style="color:' + accentColor + '">Quick Queue</strong>' +
            '<div>' +
                '<button id="jf-qq-toggle" style="background:none;border:none;color:#fff;font-size:18px">&times;</button>' +
                '<button id="jf-qq-clear" style="background:none;border:none;color:#f44;margin-left:8px" title="Clear queue">🗑</button>' +
            '</div>' +
        '</div>' +
        '<div id="jf-qq-list" style="flex:1;overflow-y:auto;padding:8px"></div>' +
        '<div id="jf-qq-empty" style="padding:16px;text-align:center;color:#888;display:none">Queue is empty</div>';
    document.body.appendChild(panel);
    
    var toggleBtn = document.createElement('button');
    toggleBtn.id = 'jf-qq-header-toggle';
    toggleBtn.innerHTML = '📋 Queue';
    toggleBtn.style.cssText = 'background:' + accentColor + ';color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;margin-right:8px';
    var header = document.querySelector('.headerTabs') || document.querySelector('.mainDrawer');
    if (header) {
        header.insertBefore(toggleBtn, header.firstChild);
    }
    
    document.getElementById('jf-qq-toggle').onclick = togglePanel;
    document.getElementById('jf-qq-header-toggle').onclick = togglePanel;
    document.getElementById('jf-qq-clear').onclick = clearQueue;
    
    if (showButton) {
        injectAddToQueueButtons(accentColor);
    }
    
    ApiClient.addEventListener('message', function(e, msg) {
        if (msg.MessageType === 'JellyFrameNotification' && msg.Data && msg.Data.type === 'queue:update') {
            refreshQueueList();
        }
    });
    
    refreshQueueList();
    
    observeDomChanges(function() {
        if (showButton) {
            injectAddToQueueButtons(accentColor);
        }
    });
}

function togglePanel() {
    var panel = document.getElementById('jf-quick-queue-panel');
    var isOpen = panel.style.transform !== 'translateX(100%)';
    panel.style.transform = isOpen ? 'translateX(100%)' : 'translateX(0)';
    if (!isOpen) {
        refreshQueueList();
    }
}

function injectAddToQueueButtons(accentColor) {
    var items = document.querySelectorAll('[data-id][data-type]');
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.querySelector('.jf-qq-add-btn')) continue;
        
        var btn = document.createElement('button');
        btn.className = 'jf-qq-add-btn';
        btn.innerHTML = '+ Queue';
        btn.style.cssText = 'background:' + accentColor + ';color:#fff;border:none;padding:4px 8px;border-radius:3px;font-size:11px;cursor:pointer;margin-top:4px';
        
        btn.onclick = (function(itemId, itemName, itemType) {
            return function(e) {
                e.preventDefault();
                e.stopPropagation();
                addToQueue(itemId, itemName, itemType);
                btn.textContent = '✓ Added';
                btn.disabled = true;
                setTimeout(function() {
                    btn.textContent = '+ Queue';
                    btn.disabled = false;
                }, 1500);
            };
        })(item.getAttribute('data-id'), item.getAttribute('data-name') || 'Unknown', item.getAttribute('data-type'));
        
        var target = item.querySelector('.cardFooter') || item.querySelector('.itemActions') || item;
        target.appendChild(btn);
    }
}

function addToQueue(itemId, itemName, itemType) {
    var userId = ApiClient.getCurrentUserId();
    if (!userId) return;
    
    ApiClient.ajax({
        type: 'POST',
        url: '/JellyFrame/mods/quick-queue/api/queue?userId=' + userId,
        contentType: 'application/json',
        data: JSON.stringify({ itemId: itemId })
    }).then(function() {
        refreshQueueList();
    }).catch(function(err) {
        console.warn('Queue add failed:', err);
    });
}

function refreshQueueList() {
    var userId = ApiClient.getCurrentUserId();
    if (!userId) return;
    
    ApiClient.ajax({
        type: 'GET',
        url: '/JellyFrame/mods/quick-queue/api/queue?userId=' + userId
    }).then(function(response) {
        var data = JSON.parse(response);
        renderQueueList(data.items || []);
    }).catch(function(err) {
        console.warn('Queue fetch failed:', err);
    });
}

function renderQueueList(items) {
    var list = document.getElementById('jf-qq-list');
    var empty = document.getElementById('jf-qq-empty');
    list.innerHTML = '';
    
    if (!items.length) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var el = document.createElement('div');
        el.style.cssText = 'padding:8px;border-bottom:1px solid #222;display:flex;align-items:center;gap:8px';
        el.innerHTML = '' +
            '<div style="flex:1">' +
                '<div style="font-weight:500">' + escapeHtml(item.name) + '</div>' +
                '<div style="font-size:11px;color:#888">' + item.type + '</div>' +
            '</div>' +
            '<button data-index="' + i + '" class="jf-qq-remove" style="background:#f44;color:#fff;border:none;border-radius:3px;padding:2px 6px;cursor:pointer">×</button>';
        list.appendChild(el);
    }
    
    var removeBtns = list.querySelectorAll('.jf-qq-remove');
    for (var j = 0; j < removeBtns.length; j++) {
        removeBtns[j].onclick = (function(index) {
            return function() {
                removeFromQueue(index);
            };
        })(parseInt(removeBtns[j].getAttribute('data-index'), 10));
    }
}

function removeFromQueue(index) {
    var userId = ApiClient.getCurrentUserId();
    if (!userId) return;
    
    ApiClient.ajax({
        type: 'DELETE',
        url: '/JellyFrame/mods/quick-queue/api/queue/' + index + '?userId=' + userId
    }).then(function() {
        refreshQueueList();
    }).catch(function(err) {
        console.warn('Queue remove failed:', err);
    });
}

function clearQueue() {
    var userId = ApiClient.getCurrentUserId();
    if (!userId) return;
    
    if (!confirm('Clear entire queue?')) return;
    
    ApiClient.ajax({
        type: 'DELETE',
        url: '/JellyFrame/mods/quick-queue/api/queue?userId=' + userId
    }).then(function() {
        refreshQueueList();
    }).catch(function(err) {
        console.warn('Queue clear failed:', err);
    });
}

function observeDomChanges(callback) {
    var observer = new MutationObserver(function() {
        callback();
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
