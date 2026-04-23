(function() {
    var MOD_ID = 'jelly-assistant';
    var API_ENDPOINT = '/JellyFrame/mods/' + MOD_ID + '/api/chat';
    
    var chatHistory = [
        { role: 'system', content: 'You are JellyAssistant, a helpful AI integrated into a Jellyfin media server. Answer concisely and prioritize media-related help if relevant.' }
    ];

    function initUI() {
        if (document.getElementById('jelly-assistant-btn')) {
            return;
        }

        var headerRight = document.querySelector('.headerRight');
        if (!headerRight) {
            return;
        }

        var btn = document.createElement('button');
        btn.id = 'jelly-assistant-btn';
        btn.className = 'paper-icon-button-light headerButton';
        btn.title = 'JellyAssistant';
        btn.style.marginRight = '8px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:currentColor;"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zm-7-5h-2v2h2v-2zm0-4h-2v2h2V7z"/></svg>';
        
        btn.onclick = function() {
            var chat = document.getElementById('jelly-assistant-chat');
            if (!chat) return;
            var isHidden = chat.style.display === 'none';
            chat.style.display = isHidden ? 'flex' : 'none';
            if (isHidden) {
                document.getElementById('jelly-assistant-input').focus();
            }
        };

        headerRight.insertBefore(btn, headerRight.firstChild);

        var chatContainer = document.createElement('div');
        chatContainer.id = 'jelly-assistant-chat';
        chatContainer.style.display = 'none';
        chatContainer.style.position = 'fixed';
        chatContainer.style.bottom = '80px';
        chatContainer.style.right = '20px';
        chatContainer.style.width = 'calc(100% - 40px)';
        chatContainer.style.maxWidth = '380px';
        chatContainer.style.height = '60vh';
        chatContainer.style.backgroundColor = '#101010';
        chatContainer.style.border = '1px solid #333';
        chatContainer.style.borderRadius = '16px';
        chatContainer.style.boxShadow = '0 12px 48px rgba(0,0,0,0.8)';
        chatContainer.style.zIndex = '99999';
        chatContainer.style.flexDirection = 'column';
        chatContainer.style.overflow = 'hidden';
        chatContainer.style.color = '#eee';

        var chatHeader = document.createElement('div');
        chatHeader.style.padding = '14px 18px';
        chatHeader.style.background = '#1a1a1a';
        chatHeader.style.borderBottom = '1px solid #333';
        chatHeader.style.display = 'flex';
        chatHeader.style.justifyContent = 'space-between';
        chatHeader.style.alignItems = 'center';
        chatHeader.innerHTML = '<span style="font-weight:600;font-size:14px;letter-spacing:0.5px">JELLY ASSISTANT</span>';
        
        var closeX = document.createElement('div');
        closeX.innerHTML = '✕';
        closeX.style.cursor = 'pointer';
        closeX.style.padding = '4px';
        closeX.onclick = function() {
            document.getElementById('jelly-assistant-chat').style.display = 'none';
        };
        chatHeader.appendChild(closeX);
        chatContainer.appendChild(chatHeader);

        var msgArea = document.createElement('div');
        msgArea.id = 'jelly-assistant-messages';
        msgArea.style.flex = '1';
        msgArea.style.overflowY = 'auto';
        msgArea.style.padding = '16px';
        msgArea.style.display = 'flex';
        msgArea.style.flexDirection = 'column';
        msgArea.style.gap = '10px';
        chatContainer.appendChild(msgArea);

        var inputRow = document.createElement('div');
        inputRow.style.padding = '12px';
        inputRow.style.background = '#1a1a1a';
        inputRow.style.display = 'flex';
        inputRow.style.gap = '8px';

        var field = document.createElement('input');
        field.id = 'jelly-assistant-input';
        field.placeholder = 'How can I help with your library?';
        field.style.flex = '1';
        field.style.background = '#252525';
        field.style.border = '1px solid #444';
        field.style.borderRadius = '20px';
        field.style.padding = '8px 16px';
        field.style.color = '#fff';
        field.style.outline = 'none';
        field.onkeypress = function(e) {
            if (e.key === 'Enter') sendMsg();
        };

        var sendBtn = document.createElement('button');
        sendBtn.innerText = 'Send';
        sendBtn.style.background = '#00a4dc';
        sendBtn.style.border = 'none';
        sendBtn.style.borderRadius = '20px';
        sendBtn.style.padding = '8px 16px';
        sendBtn.style.color = '#fff';
        sendBtn.style.cursor = 'pointer';
        sendBtn.onclick = sendMsg;

        inputRow.appendChild(field);
        inputRow.appendChild(sendBtn);
        chatContainer.appendChild(inputRow);

        document.body.appendChild(chatContainer);
    }

    function append(role, text) {
        var area = document.getElementById('jelly-assistant-messages');
        if (!area) return;
        var b = document.createElement('div');
        b.style.padding = '10px 14px';
        b.style.borderRadius = '14px';
        b.style.fontSize = '13.5px';
        b.style.lineHeight = '1.5';
        b.style.maxWidth = '85%';
        b.style.wordBreak = 'break-word';

        if (role === 'user') {
            b.style.alignSelf = 'flex-end';
            b.style.background = '#00a4dc';
            b.style.color = '#fff';
        } else {
            b.style.alignSelf = 'flex-start';
            b.style.background = '#2a2a2a';
            b.style.color = '#ddd';
        }

        b.innerText = text;
        area.appendChild(b);
        area.scrollTop = area.scrollHeight;
    }

    function sendMsg() {
        var input = document.getElementById('jelly-assistant-input');
        var val = input.value.trim();
        if (!val) return;

        input.value = '';
        input.disabled = true;
        append('user', val);
        chatHistory.push({ role: 'user', content: val });

        var area = document.getElementById('jelly-assistant-messages');
        var loading = document.createElement('div');
        loading.id = 'jelly-assistant-loading';
        loading.style.fontSize = '12px';
        loading.style.color = '#777';
        loading.innerText = 'JellyAssistant is thinking...';
        area.appendChild(loading);

        var token = window.ApiClient ? window.ApiClient.accessToken() : '';
        var headers = {
            'Content-Type': 'application/json',
            'X-MediaBrowser-Token': token,
            'Authorization': 'MediaBrowser Token="' + token + '"'
        };

        fetch(API_ENDPOINT, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ messagesJson: JSON.stringify(chatHistory) })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            input.disabled = false;
            var l = document.getElementById('jelly-assistant-loading');
            if (l) l.remove();

            if (data.error) {
                append('assistant', 'Error: ' + data.error);
                chatHistory.pop();
            } else if (data.choices && data.choices.length > 0) {
                var reply = data.choices[0].message.content;
                append('assistant', reply);
                chatHistory.push({ role: 'assistant', content: reply });
            }
            input.focus();
        })
        .catch(function() {
            input.disabled = false;
            var l = document.getElementById('jelly-assistant-loading');
            if (l) l.remove();
            append('assistant', 'Failed to reach the server mod.');
            chatHistory.pop();
        });
    }

    initUI();
    setInterval(function() {
        if (!document.getElementById('jelly-assistant-btn')) {
            initUI();
        }
    }, 2500);
})();
