window._parentalIsLocked = false;
window._parentalMaxRating = 'PG13';

var ratingOrder = ['G', 'TVY', 'TVG', 'TVY7', 'TVY7FV', 'PG', 'TVPG', 'PG13', 'TV14', 'R', 'TVMA', 'NC17'];

function isRatingAllowed(rating) {
    if (!rating) {
        return true;
    }
    var r = rating.toUpperCase().replace(/-/g, '').replace(/_/g, '').replace(/ /g, '');
    
    var maxIdx = ratingOrder.indexOf(window._parentalMaxRating);
    if (maxIdx === -1) {
        maxIdx = ratingOrder.indexOf('PG13');
    }
    
    var allowed = ratingOrder.slice(0, maxIdx + 1);
    for (var i = 0; i < allowed.length; i++) {
        if (r === allowed[i]) {
            return true;
        }
    }
    return false;
}

var origFetch = window.fetch;
window.fetch = function() {
    var reqPromise = origFetch.apply(this, arguments);

    if (window._parentalIsLocked) {
        return reqPromise.then(function(res) {
            var contentType = res.headers ? res.headers.get('content-type') : '';
            if (contentType && contentType.indexOf('application/json') !== -1) {
                var clone = res.clone();
                return clone.json().then(function(data) {
                    if (data && data.Items && Array.isArray(data.Items)) {
                        var allowed = [];
                        for (var i = 0; i < data.Items.length; i++) {
                            if (isRatingAllowed(data.Items[i].OfficialRating)) {
                                allowed.push(data.Items[i]);
                            }
                        }
                        data.Items = allowed;
                        return new Response(JSON.stringify(data), {
                            status: res.status,
                            statusText: res.statusText,
                            headers: res.headers
                        });
                    }
                    return res;
                }).catch(function() { return res; });
            }
            return res;
        });
    }
    return reqPromise;
};

var origXhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function() {
    this.addEventListener('load', function() {
        if (window._parentalIsLocked && this.responseText) {
            try {
                if (this.responseText.indexOf('"Items":') !== -1 || this.responseText.indexOf('"Items" :') !== -1) {
                    var data = JSON.parse(this.responseText);
                    if (data && data.Items && Array.isArray(data.Items)) {
                        var allowed = [];
                        for (var i = 0; i < data.Items.length; i++) {
                            if (isRatingAllowed(data.Items[i].OfficialRating)) {
                                allowed.push(data.Items[i]);
                            }
                        }
                        data.Items = allowed;
                        var newData = JSON.stringify(data);
                        Object.defineProperty(this, 'responseText', { value: newData, writable: true });
                        if (this.responseType === 'json') {
                            Object.defineProperty(this, 'response', { value: data, writable: true });
                        }
                    }
                }
            } catch(e) {}
        }
    });
    return origXhrSend.apply(this, arguments);
};

function createModal(options) {
    var overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';

    var modal = document.createElement('div');
    modal.style.backgroundColor = '#202020';
    modal.style.padding = '24px';
    modal.style.borderRadius = '8px';
    modal.style.width = '320px';
    modal.style.color = '#fff';
    modal.style.fontFamily = 'sans-serif';
    modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';

    var titleEl = document.createElement('h2');
    titleEl.textContent = options.title;
    titleEl.style.marginTop = '0';
    modal.appendChild(titleEl);

    var bodyEl = document.createElement('p');
    bodyEl.textContent = options.body;
    bodyEl.style.lineHeight = '1.5';
    modal.appendChild(bodyEl);
    
    var ratingSelect = null;
    if (options.showRatingSelect) {
        var ratingLabel = document.createElement('label');
        ratingLabel.textContent = 'Maximum Allowed Rating:';
        ratingLabel.style.display = 'block';
        ratingLabel.style.marginBottom = '8px';
        ratingLabel.style.fontSize = '14px';
        ratingLabel.style.color = '#ccc';
        modal.appendChild(ratingLabel);

        ratingSelect = document.createElement('select');
        ratingSelect.style.width = '100%';
        ratingSelect.style.padding = '12px';
        ratingSelect.style.marginBottom = '16px';
        ratingSelect.style.boxSizing = 'border-box';
        ratingSelect.style.borderRadius = '4px';
        ratingSelect.style.border = '1px solid #444';
        ratingSelect.style.backgroundColor = '#101010';
        ratingSelect.style.color = '#fff';
        ratingSelect.style.fontSize = '14px';

        var selectOpts = [
            { v: 'G', l: 'G / TV-Y / TV-G (Kids Only)' },
            { v: 'PG', l: 'PG / TV-PG (Older Kids)' },
            { v: 'PG13', l: 'PG-13 / TV-14 (Teens)' },
            { v: 'R', l: 'R / TV-MA (Adults)' }
        ];

        for (var i = 0; i < selectOpts.length; i++) {
            var opt = document.createElement('option');
            opt.value = selectOpts[i].v;
            opt.textContent = selectOpts[i].l;
            if (selectOpts[i].v === 'PG13') {
                opt.selected = true;
            }
            ratingSelect.appendChild(opt);
        }
        modal.appendChild(ratingSelect);
    }

    var pinInput = null;
    if (options.showPin) {
        pinInput = document.createElement('input');
        pinInput.type = 'password';
        pinInput.maxLength = 4;
        pinInput.placeholder = '4-digit PIN';
        pinInput.style.width = '100%';
        pinInput.style.padding = '12px';
        pinInput.style.marginBottom = '16px';
        pinInput.style.boxSizing = 'border-box';
        pinInput.style.borderRadius = '4px';
        pinInput.style.border = '1px solid #444';
        pinInput.style.backgroundColor = '#101010';
        pinInput.style.color = '#fff';
        pinInput.style.fontSize = '16px';
        pinInput.style.textAlign = 'center';
        pinInput.style.letterSpacing = '10px';
        modal.appendChild(pinInput);
    }

    var errEl = document.createElement('div');
    errEl.style.color = '#ff4444';
    errEl.style.marginBottom = '16px';
    errEl.style.display = 'none';
    modal.appendChild(errEl);

    var btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.justifyContent = 'flex-end';
    btnContainer.style.flexWrap = 'wrap';
    btnContainer.style.gap = '10px';

    function close() {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    }

    function handleDone(errStr) {
        if (errStr) {
            errEl.textContent = errStr;
            errEl.style.display = 'block';
        } else {
            close();
        }
    }

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.padding = '8px 16px';
    cancelBtn.style.backgroundColor = 'transparent';
    cancelBtn.style.color = '#ccc';
    cancelBtn.style.border = 'none';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.onclick = close;
    btnContainer.appendChild(cancelBtn);

    if (options.extraBtnText && options.onExtra) {
        var extraBtn = document.createElement('button');
        extraBtn.textContent = options.extraBtnText;
        extraBtn.style.padding = '8px 16px';
        extraBtn.style.backgroundColor = '#444';
        extraBtn.style.color = '#fff';
        extraBtn.style.border = 'none';
        extraBtn.style.borderRadius = '4px';
        extraBtn.style.cursor = 'pointer';
        extraBtn.onclick = function() {
            options.onExtra(handleDone);
        };
        btnContainer.appendChild(extraBtn);
    }

    var confirmBtn = document.createElement('button');
    confirmBtn.textContent = options.confirmText;
    confirmBtn.style.padding = '8px 16px';
    confirmBtn.style.backgroundColor = '#00a4dc';
    confirmBtn.style.color = '#fff';
    confirmBtn.style.border = 'none';
    confirmBtn.style.borderRadius = '4px';
    confirmBtn.style.cursor = 'pointer';
    confirmBtn.onclick = function() {
        var val = pinInput ? pinInput.value : '';
        if (options.showPin && (!val || val.length !== 4)) {
            handleDone('PIN must be 4 digits.');
            return;
        }
        var maxRating = ratingSelect ? ratingSelect.value : null;
        options.onConfirm(val, maxRating, handleDone);
    };
    btnContainer.appendChild(confirmBtn);

    modal.appendChild(btnContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    if (pinInput) {
        pinInput.focus();
    }
}

function apiCall(endpoint, bodyParams, callback) {
    if (typeof ApiClient === 'undefined' || typeof ApiClient.getCurrentUserId !== 'function') {
        return callback('ApiClient not ready');
    }
    
    bodyParams.userId = ApiClient.getCurrentUserId();
    var url = '/JellyFrame/mods/parental-lock/api' + endpoint;
    
    origFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyParams)
    })
    .then(function(res) {
        return res.json().then(function(data) {
            if (!res.ok) {
                throw new Error(data.error || 'Server error');
            }
            return data;
        });
    })
    .then(function(data) {
        callback(null, data);
    })
    .catch(function(err) {
        callback(err.message);
    });
}

function showMenu(isSetup, isLocked) {
    if (!isSetup) {
        createModal({
            title: 'Setup Parental Lock',
            body: 'Select the maximum allowed rating and set a 4-digit PIN to restrict content.',
            showPin: true,
            showRatingSelect: true,
            confirmText: 'Setup',
            onConfirm: function(pin, maxRating, done) {
                apiCall('/setup', { pin: pin, maxRating: maxRating }, function(err) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                        window.location.reload();
                    }
                });
            }
        });
    } else if (isLocked) {
        createModal({
            title: 'Unlock Content',
            body: 'Enter your 4-digit PIN to unlock all content.',
            showPin: true,
            confirmText: 'Unlock',
            onConfirm: function(pin, maxRating, done) {
                apiCall('/unlock', { pin: pin }, function(err) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                        window.location.reload();
                    }
                });
            }
        });
    } else {
        createModal({
            title: 'Manage Parental Lock',
            body: 'Your account is currently unlocked. Enter your PIN to remove the lock entirely, or click Lock Account to instantly restrict content again.',
            showPin: true,
            confirmText: 'Remove Lock',
            extraBtnText: 'Lock Account',
            onConfirm: function(pin, maxRating, done) {
                apiCall('/remove', { pin: pin }, function(err) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                        window.location.reload();
                    }
                });
            },
            onExtra: function(done) {
                apiCall('/lock', {}, function(err) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                        window.location.reload();
                    }
                });
            }
        });
    }
}

function injectHeaderIcon(isSetup, isLocked) {
    var existing = document.getElementById('parental-lock-btn');
    if (existing) {
        existing.parentNode.removeChild(existing);
    }

    var headerRight = document.querySelector('.headerRight');
    if (!headerRight) {
        setTimeout(function() { injectHeaderIcon(isSetup, isLocked); }, 1000);
        return;
    }

    var btn = document.createElement('button');
    btn.id = 'parental-lock-btn';
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.color = isLocked ? '#ff4444' : (isSetup ? '#00a4dc' : '#aaa');
    btn.style.cursor = 'pointer';
    btn.style.padding = '10px';
    btn.style.marginRight = '5px';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.fontSize = '24px';
    btn.title = 'Parental Lock Settings';
    
    // Fallback emoji icons
    btn.innerHTML = isLocked ? '&#128274;' : '&#128275;';

    btn.onclick = function() {
        showMenu(isSetup, isLocked);
    };

    headerRight.insertBefore(btn, headerRight.firstChild);
}

function updateState() {
    if (typeof ApiClient === 'undefined' || typeof ApiClient.getCurrentUserId !== 'function') {
        return;
    }
    
    var userId = ApiClient.getCurrentUserId();
    var url = '/JellyFrame/mods/parental-lock/api/status?userId=' + userId;
    
    origFetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            window._parentalIsLocked = data.isLocked;
            window._parentalMaxRating = data.maxRating || 'PG13';
            injectHeaderIcon(data.isSetup, data.isLocked);
        });
}

function init() {
    if (typeof ApiClient === 'undefined' || typeof ApiClient.getCurrentUserId !== 'function') {
        setTimeout(init, 500);
        return;
    }
    updateState();
}

init();
