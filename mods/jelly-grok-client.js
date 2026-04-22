(function() {
    var MOD_ID = 'ai-assistant';
    var API_ENDPOINT = '/JellyFrame/mods/' + MOD_ID + '/api/chat';
    
    var chatHistory = [
        { role: 'system', content: 'You are a helpful media assistant integrated into a Jellyfin server. Provide concise, friendly answers.' }
    ];

    function initUI() {
        if (document.getElementById('jellyframe-ai-btn')) {
            return;
        }

        var headerRight = document.querySelector('.headerRight');
        if (!headerRight) {
            return;
        }

        var btn = document.createElement('button');
        btn.id = 'jellyframe-ai-btn';
        btn.className = 'paper-icon-button-light headerButton';
        btn.style.marginRight = '8px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:currentColor;"><path d="M21 16.5C21 16.88 20.79 17.21 20.47 17.38L12.5 21.82C12.18 22.06 11.82 22.06 11.5 21.82L3.53 17.38C3.21 17.21 3 16.88 3 16.5V7.5C3 7.12 3.21 6.79 3.53 6.62L11.5 2.18C11.82 1.94 12.18 1.94 12.5 2.18L20.47 6.62C20.79 6.79 21 7.12 21 7.5V16.5ZM12 4.15L5 8.06V15.94L12 19.85L19 15.94V8.06L12 4.15Z"/><circle cx="12" cy="12" r="3"/></svg>';
        
        btn.addEventListener('click', toggleChat);
        headerRight.insertBefore(btn, headerRight.firstChild);

        var chatContainer = document.createElement('div');
        chatContainer.id = 'jellyframe-ai-chat';
        chatContainer.style.display = 'none';
        chatContainer.style.position = 'fixed';
        chatContainer.style.bottom = '20px';
        chatContainer.style.right = '20px';
        chatContainer.style.width = 'calc(100% - 40px)';
        chatContainer.style.maxWidth = '400px';
        chatContainer.style.height = '65vh';
        chatContainer.style.minHeight = '350px';
        chatContainer.style.maxHeight = '800px';
        chatContainer.style.backgroundColor = '#1e1e1e';
        chatContainer.style.border = '1px solid #333';
        chatContainer.style.borderRadius = '12px';
        chatContainer.style.boxShadow = '0 10px 40px rgba(0,0,0,0.6)';
        chatContainer.style.zIndex = '99999';
        chatContainer.style.display = 'flex';
        chatContainer.style.flexDirection = 'column';
        chatContainer.style.fontFamily = 'sans-serif';
        chatContainer.style.color = '#fff';
        
        chatContainer.style.display = 'none';

        var chatHeader = document.createElement('div');
        chatHeader.style.padding = '12px 16px';
        chatHeader.style.backgroundColor = '#151515';
        chatHeader.style.borderTopLeftRadius = '12px';
        chatHeader.style.borderTopRightRadius = '12px';
        chatHeader.style.borderBottom = '1px solid #333';
        chatHeader.style.fontWeight = 'bold';
        chatHeader.style.display = 'flex';
        chatHeader.style.justifyContent = 'space-between';
        chatHeader.style.alignItems = 'center';
        chatHeader.innerHTML = '<span>AI Assistant</span>';
        
        var closeBtn = document.createElement('button');
        closeBtn.innerHTML = 'X';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = '#aaa';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '16px';
        closeBtn.addEventListener('click', toggleChat);
        chatHeader.appendChild(closeBtn);
        chatContainer.appendChild(chatHeader);

        var messagesArea = document.createElement('div');
        messagesArea.id = 'jellyframe-ai-messages';
        messagesArea.style.flex = '1';
        messagesArea.style.overflowY = 'auto';
        messagesArea.style.padding = '16px';
        messagesArea.style.display = 'flex';
        messagesArea.style.flexDirection = 'column';
        messagesArea.style.gap = '12px';
        chatContainer.appendChild(messagesArea);

        var inputArea = document.createElement('div');
        inputArea.style.padding = '12px';
        inputArea.style.backgroundColor = '#151515';
        inputArea.style.borderBottomLeftRadius = '12px';
        inputArea.style.borderBottomRightRadius = '12px';
        inputArea.style.borderTop = '1px solid #333';
        inputArea.style.display = 'flex';
        inputArea.style.gap = '8px';

        var input = document.createElement('input');
        input.id = 'jellyframe-ai-input';
        input.type = 'text';
        input.placeholder = 'Ask something...';
        input.style.flex = '1';
        input.style.padding = '10px 14px';
        input.style.borderRadius = '20px';
        input.style.border = '1px solid #444';
        input.style.backgroundColor = '#2a2a2a';
        input.style.color = '#fff';
        input.style.outline = 'none';
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        var sendBtn = document.createElement('button');
        sendBtn.innerHTML = 'Send';
        sendBtn.style.padding = '8px 16px';
        sendBtn.style.borderRadius = '20px';
        sendBtn.style.border = 'none';
        sendBtn.style.backgroundColor = '#00a4dc';
        sendBtn.style.color = '#fff';
        sendBtn.style.cursor = 'pointer';
        sendBtn.style.fontWeight = 'bold';
        sendBtn.addEventListener('click', sendMessage);

        inputArea.appendChild(input);
        inputArea.appendChild(sendBtn);
        chatContainer.appendChild(inputArea);

        document.body.appendChild(chatContainer);
    }

    function toggleChat() {
        var chat = document.getElementById('jellyframe-ai-chat');
        if (chat.style.display === 'none') {
            chat.style.display = 'flex';
            document.getElementById('jellyframe-ai-input').focus();
        } else {
            chat.style.display = 'none';
        }
    }

    function appendMessage(role, text) {
        var messagesArea = document.getElementById('jellyframe-ai-messages');
        var bubble = document.createElement('div');
        bubble.style.maxWidth = '85%';
        bubble.style.padding = '10px 14px';
        bubble.style.borderRadius = '16px';
        bubble.style.lineHeight = '1.4';
        bubble.style.wordBreak = 'break-word';

        if (role === 'user') {
            bubble.style.alignSelf = 'flex-end';
            bubble.style.backgroundColor = '#00a4dc';
            bubble.style.color = '#fff';
            bubble.style.borderBottomRightRadius = '4px';
        } else {
            bubble.style.alignSelf = 'flex-start';
            bubble.style.backgroundColor = '#333';
            bubble.style.color = '#eaeaea';
            bubble.style.borderBottomLeftRadius = '4px';
        }

        bubble.innerText = text;
        messagesArea.appendChild(bubble);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function sendMessage() {
        var input = document.getElementById('jellyframe-ai-input');
        var text = input.value.trim();
        if (!text) return;

        input.value = '';
        input.disabled = true;

        appendMessage('user', text);
        chatHistory.push({ role: 'user', content: text });

        var messagesArea = document.getElementById('jellyframe-ai-messages');
        var loading = document.createElement('div');
        loading.id = 'jellyframe-ai-loading';
        loading.style.alignSelf = 'flex-start';
        loading.style.color = '#888';
        loading.style.fontSize = '12px';
        loading.style.fontStyle = 'italic';
        loading.innerText = 'Thinking...';
        messagesArea.appendChild(loading);
        messagesArea.scrollTop = messagesArea.scrollHeight;

        fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messagesJson: JSON.stringify(chatHistory) })
        })
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            input.disabled = false;
            var loadingEl = document.getElementById('jellyframe-ai-loading');
            if (loadingEl) {
                loadingEl.parentNode.removeChild(loadingEl);
            }

            if (data.error) {
                appendMessage('assistant', 'Error: ' + data.error);
                chatHistory.pop();
            } else if (data.choices && data.choices.length > 0) {
                var reply = data.choices[0].message.content;
                appendMessage('assistant', reply);
                chatHistory.push({ role: 'assistant', content: reply });
            } else {
                appendMessage('assistant', 'Received an empty response from the AI.');
            }
            input.focus();
        })
        .catch(function(err) {
            input.disabled = false;
            var loadingEl = document.getElementById('jellyframe-ai-loading');
            if (loadingEl) {
                loadingEl.parentNode.removeChild(loadingEl);
            }
            appendMessage('assistant', 'Network error reaching the local mod backend.');
            chatHistory.pop();
        });
    }

    initUI();
    
    setInterval(function() {
        if (!document.getElementById('jellyframe-ai-btn')) {
            initUI();
        }
    }, 2000);

})();
