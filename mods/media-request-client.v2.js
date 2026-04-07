(function () {
    'use strict';

    var API         = '/JellyFrame/mods/media-request/api';
    var STYLE_ID    = 'jf-mr-style';
    var BTN_ID      = 'jf-mr-nav-btn';
    var OVERLAY_ID  = 'jf-mr-overlay';

    var MENU_LABEL  = '{{MENU_LABEL}}';
    if (!MENU_LABEL || MENU_LABEL.indexOf('{{') === 0) MENU_LABEL = 'Request Media';
    
    var ACCENT      = '{{ACCENT_COLOR}}';
    if (!ACCENT || ACCENT.indexOf('{{') === 0) ACCENT = '#00a4dc';
    
    var ALLOW_TYPES = '{{ALLOW_TYPES}}';
    var TYPES = [];
    
    if (!ALLOW_TYPES || ALLOW_TYPES.indexOf('{{') === 0) {
        TYPES = ['Movie', 'TV Show', 'Music', 'Other'];
    } else {
        var raw = ALLOW_TYPES.split(',');
        for (var t = 0; t < raw.length; t++) {
            var trimmed = raw[t].trim();
            if (trimmed) {
                TYPES.push(trimmed);
            }
        }
        if (TYPES.length === 0) {
            TYPES = ['Movie', 'TV Show', 'Music', 'Other'];
        }
    }

    function injectCSS() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '#' + OVERLAY_ID + ' {',
            '  position:fixed;inset:0;z-index:99999;',
            '  display:flex;align-items:center;justify-content:center;',
            '  background:rgba(0,0,0,0.72);',
            '}',
            '#' + OVERLAY_ID + ' .jfmr-dialog {',
            '  background:#1a1a2a;border:1px solid rgba(255,255,255,0.1);',
            '  border-radius:12px;padding:28px 28px 24px;width:100%;max-width:480px;',
            '  box-shadow:0 20px 60px rgba(0,0,0,0.7);',
            '  font-family:inherit;color:#e0e0f0; overflow:hidden;',
            '}',
            
            '#' + OVERLAY_ID + ' .jfmr-pane { display:none; flex-direction:column; }',
            '#' + OVERLAY_ID + ' .jfmr-dialog[data-stage="form"] .jfmr-pane-form { display:flex; }',
            '#' + OVERLAY_ID + ' .jfmr-dialog[data-stage="list"] .jfmr-pane-list { display:flex; }',
            '#' + OVERLAY_ID + ' .jfmr-dialog[data-stage="details"] .jfmr-pane-details { display:flex; }',
            
            '#' + OVERLAY_ID + ' .jfmr-title { font-size:1.15em;font-weight:700;margin:0 0 20px;color:#fff; }',
            '#' + OVERLAY_ID + ' .jfmr-field { margin-bottom:14px; }',
            '#' + OVERLAY_ID + ' .jfmr-label { display:block;font-size:.8em;font-weight:600;opacity:.6;margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em; }',
            
            '#' + OVERLAY_ID + ' .jfmr-input {',
            '  width:100%;box-sizing:border-box;padding:9px 12px;border-radius:6px;',
            '  background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);',
            '  color:#e0e0f0;font-size:.9em;font-family:inherit;',
            '}',
            '#' + OVERLAY_ID + ' .jfmr-select {',
            '  width:100%;box-sizing:border-box;padding:9px 12px;border-radius:6px;',
            '  background:#1a1a2a;border:1px solid rgba(255,255,255,0.12);',
            '  color:#fff;font-size:.9em;font-family:inherit;',
            '  appearance:none;-webkit-appearance:none;',
            '}',
            '#' + OVERLAY_ID + ' .jfmr-select option { background:#1a1a2a; color:#fff; }',
            '#' + OVERLAY_ID + ' .jfmr-input:focus, #' + OVERLAY_ID + ' .jfmr-select:focus { outline:none;border-color:' + ACCENT + '; }',
            
            '#' + OVERLAY_ID + ' .jfmr-actions { display:flex;gap:10px;justify-content:flex-end;margin-top:20px; align-items:center; }',
            '#' + OVERLAY_ID + ' .jfmr-btn { padding:9px 20px;border-radius:6px;border:none;cursor:pointer;font-size:.88em;font-weight:600;font-family:inherit; transition:0.2s; }',
            
            '#' + OVERLAY_ID + ' .jfmr-btn-view { background:rgba(255,255,255,0.08); color:#ccc; margin-right:auto; }',
            '#' + OVERLAY_ID + ' .jfmr-btn-view:hover { background:rgba(255,255,255,0.15); color:#fff; }',
            '#' + OVERLAY_ID + ' .jfmr-btn-cancel { background:rgba(255,255,255,0.08);color:#ccc; }',
            '#' + OVERLAY_ID + ' .jfmr-btn-cancel:hover { background:rgba(255,255,255,0.15);color:#fff; }',
            '#' + OVERLAY_ID + ' .jfmr-btn-submit { background:' + ACCENT + '; color:#ffffff !important; text-shadow:0 1px 3px rgba(0,0,0,0.8); border:1px solid rgba(0,0,0,0.3); }',
            '#' + OVERLAY_ID + ' .jfmr-btn-submit:hover { filter:brightness(1.1); }',
            
            '#' + OVERLAY_ID + ' .jfmr-msg { font-size:.83em;margin-top:12px;text-align:center;min-height:1.2em; }',
            '#' + OVERLAY_ID + ' .jfmr-msg-ok  { color:#4ade80; }',
            '#' + OVERLAY_ID + ' .jfmr-msg-err { color:#f87171; }',
            
            '#' + OVERLAY_ID + ' .jfmr-list-container { max-height:300px;overflow-y:auto;padding-right:8px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.2) transparent; margin-bottom:10px; }',
            '#' + OVERLAY_ID + ' .jfmr-list-container::-webkit-scrollbar { width:6px; }',
            '#' + OVERLAY_ID + ' .jfmr-list-container::-webkit-scrollbar-track { background:rgba(255,255,255,0.05); border-radius:3px; }',
            '#' + OVERLAY_ID + ' .jfmr-list-container::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.2); border-radius:3px; }',
            
            '#' + OVERLAY_ID + ' .jfmr-req-item { display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:6px;background:rgba(255,255,255,0.04);margin-bottom:6px;font-size:.85em; cursor:pointer; transition:background 0.2s, border 0.2s; border:1px solid transparent; }',
            '#' + OVERLAY_ID + ' .jfmr-req-item:hover { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.1); }',
            '#' + OVERLAY_ID + ' .jfmr-req-info { flex:1;min-width:0;display:flex;flex-direction:column; }',
            '#' + OVERLAY_ID + ' .jfmr-req-name { font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }',
            '#' + OVERLAY_ID + ' .jfmr-req-meta { font-size:.85em;opacity:.5;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }',
            '#' + OVERLAY_ID + ' .jfmr-req-actions { display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:10px; }',
            '#' + OVERLAY_ID + ' .jfmr-req-status { font-size:.78em;font-weight:600;padding:2px 7px;border-radius:3px; }',
            
            '#' + OVERLAY_ID + ' .jfmr-detail-header { display:flex; align-items:center; gap:10px; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:15px; }',
            '#' + OVERLAY_ID + ' .jfmr-back-btn { background:rgba(255,255,255,0.1); border:none; color:#fff; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:.9em; transition: 0.2s; display:flex; align-items:center; gap:4px; }',
            '#' + OVERLAY_ID + ' .jfmr-back-btn:hover { background:rgba(255,255,255,0.2); }',
            '#' + OVERLAY_ID + ' .jfmr-detail-title { font-size:1.2em; font-weight:bold; margin:0; color:#fff; }',
            '#' + OVERLAY_ID + ' .jfmr-detail-group { margin-bottom:12px; background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; }',
            '#' + OVERLAY_ID + ' .jfmr-detail-label { font-size:0.75em; text-transform:uppercase; opacity:0.5; font-weight:bold; margin-bottom:4px; letter-spacing:0.05em; }',
            '#' + OVERLAY_ID + ' .jfmr-detail-value { font-size:0.95em; color:#fff; white-space:pre-wrap; word-break:break-word; line-height:1.4; }',

            '#' + OVERLAY_ID + ' .jfmr-admin-sel { background:#1a1a2a;color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:5px 8px;font-size:.85em;font-family:inherit;appearance:none;-webkit-appearance:none;cursor:pointer; }',
            '#' + OVERLAY_ID + ' .jfmr-admin-sel option { background:#1a1a2a; color:#fff; }',
            '#' + OVERLAY_ID + ' .jfmr-admin-del { background:#ef4444;border:none;color:#fff;border-radius:4px;padding:5px 12px;cursor:pointer;font-weight:bold;font-size:.9em; }',
            '#' + OVERLAY_ID + ' .jfmr-admin-del:hover { background:#dc2626; }',

            '#' + OVERLAY_ID + ' .jfmr-status-pending   { background:rgba(251,191,36,0.15);color:#fbbf24; }',
            '#' + OVERLAY_ID + ' .jfmr-status-approved  { background:rgba(74,222,128,0.15);color:#4ade80; }',
            '#' + OVERLAY_ID + ' .jfmr-status-declined  { background:rgba(248,113,113,0.15);color:#f87171; }',
            '#' + OVERLAY_ID + ' .jfmr-status-available { background:rgba(96,165,250,0.15);color:#60a5fa; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    function getCurrentUser() {
        if (typeof ApiClient === 'undefined') {
            return { id: '', name: '', isAdmin: false };
        }
        var id   = ApiClient.getCurrentUserId()    || '';
        var info = ApiClient.getCurrentUser && ApiClient.getCurrentUser();
        var name = (info && info.Name) ? info.Name : '';
        var isAdmin = (info && info.Policy && info.Policy.IsAdministrator) === true;
        return { id: id, name: name, isAdmin: isAdmin };
    }

    function statusClass(status) {
        if (status === 'approved')  { return 'jfmr-status-approved'; }
        if (status === 'declined')  { return 'jfmr-status-declined'; }
        if (status === 'available') { return 'jfmr-status-available'; }
        return 'jfmr-status-pending';
    }

    function closeDialog() {
        var el = document.getElementById(OVERLAY_ID);
        if (el) {
            el.remove();
        }
    }

    function openDialog() {
        if (document.getElementById(OVERLAY_ID)) {
            return;
        }

        var user = getCurrentUser();

        var overlay = document.createElement('div');
        overlay.id  = OVERLAY_ID;

        var dialog = document.createElement('div');
        dialog.className = 'jfmr-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('data-stage', 'form');

        var formPane = document.createElement('div');
        formPane.className = 'jfmr-pane jfmr-pane-form';

        var titleEl = document.createElement('div');
        titleEl.className   = 'jfmr-title';
        titleEl.textContent = 'Request Media';
        formPane.appendChild(titleEl);

        function field(labelText, input) {
            var wrap  = document.createElement('div');
            wrap.className = 'jfmr-field';
            var lbl = document.createElement('label');
            lbl.className   = 'jfmr-label';
            lbl.textContent = labelText;
            wrap.appendChild(lbl);
            wrap.appendChild(input);
            return wrap;
        }

        var titleInput = document.createElement('input');
        titleInput.type        = 'text';
        titleInput.className   = 'jfmr-input';
        titleInput.placeholder = 'e.g. The Dark Knight';
        formPane.appendChild(field('Title *', titleInput));

        var typeSelect = document.createElement('select');
        typeSelect.className = 'jfmr-select';
        for (var i = 0; i < TYPES.length; i++) {
            var opt = document.createElement('option');
            opt.value       = TYPES[i];
            opt.textContent = TYPES[i];
            typeSelect.appendChild(opt);
        }
        formPane.appendChild(field('Type *', typeSelect));

        var yearInput = document.createElement('input');
        yearInput.type        = 'text';
        yearInput.className   = 'jfmr-input';
        yearInput.maxLength   = 4;
        yearInput.placeholder = 'e.g. 2024';
        formPane.appendChild(field('Year (optional)', yearInput));

        var noteInput = document.createElement('textarea');
        noteInput.className   = 'jfmr-input';
        noteInput.rows        = 2;
        noteInput.placeholder = 'Any extra details...';
        noteInput.style.resize = 'vertical';
        formPane.appendChild(field('Notes (optional)', noteInput));

        var msgEl = document.createElement('div');
        msgEl.className = 'jfmr-msg';
        formPane.appendChild(msgEl);

        var actions = document.createElement('div');
        actions.className = 'jfmr-actions';

        var viewReqBtn = document.createElement('button');
        viewReqBtn.type = 'button';
        viewReqBtn.className = 'jfmr-btn jfmr-btn-view';
        viewReqBtn.textContent = 'View Requests';
        viewReqBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            dialog.setAttribute('data-stage', 'list');
            loadMyRequests(listContainer, user, dialog);
        };

        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className   = 'jfmr-btn jfmr-btn-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            closeDialog();
        };

        var submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className   = 'jfmr-btn jfmr-btn-submit';
        submitBtn.textContent = 'Submit Request';
        submitBtn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            
            var titleVal = titleInput.value.trim();
            var typeVal  = typeSelect.value;
            if (!titleVal) {
                msgEl.className   = 'jfmr-msg jfmr-msg-err';
                msgEl.textContent = 'Please enter a title.';
                return;
            }
            submitBtn.disabled  = true;
            msgEl.className     = 'jfmr-msg';
            msgEl.textContent   = 'Submitting...';

            fetch(API + '/requests', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    title:    titleVal,
                    type:     typeVal,
                    year:     yearInput.value.trim(),
                    note:     noteInput.value.trim(),
                    userId:   user.id,
                    userName: user.name
                })
            }).then(function (r) {
                return r.json();
            }).then(function (data) {
                if (data.ok) {
                    msgEl.className   = 'jfmr-msg jfmr-msg-ok';
                    msgEl.textContent = 'Request submitted! We will review it soon.';
                    titleInput.value  = '';
                    yearInput.value   = '';
                    noteInput.value   = '';
                    submitBtn.disabled = false;
                } else {
                    msgEl.className   = 'jfmr-msg jfmr-msg-err';
                    msgEl.textContent = data.error || 'Submission failed.';
                    submitBtn.disabled = false;
                }
            }).catch(function () {
                msgEl.className   = 'jfmr-msg jfmr-msg-err';
                msgEl.textContent = 'Network error. Please try again.';
                submitBtn.disabled = false;
            });
        };

        actions.appendChild(viewReqBtn);
        actions.appendChild(cancelBtn);
        actions.appendChild(submitBtn);
        formPane.appendChild(actions);

        var listPane = document.createElement('div');
        listPane.className = 'jfmr-pane jfmr-pane-list';

        var listHeader = document.createElement('div');
        listHeader.className = 'jfmr-detail-header';

        var backToFormBtn = document.createElement('button');
        backToFormBtn.type = 'button';
        backToFormBtn.className = 'jfmr-back-btn';
        backToFormBtn.innerHTML = '<span class="material-icons" style="font-size:1.1em;">arrow_back</span> Back';
        backToFormBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            dialog.setAttribute('data-stage', 'form');
        };

        var listTitle = document.createElement('h3');
        listTitle.className = 'jfmr-detail-title';
        listTitle.textContent = user.isAdmin ? 'All Requests (Admin)' : 'Your Requests';

        listHeader.appendChild(backToFormBtn);
        listHeader.appendChild(listTitle);
        listPane.appendChild(listHeader);

        var listContainer = document.createElement('div');
        listContainer.className = 'jfmr-list-container';
        listPane.appendChild(listContainer);

        var detailsPane = document.createElement('div');
        detailsPane.className = 'jfmr-pane jfmr-pane-details';

        dialog.appendChild(formPane);
        dialog.appendChild(listPane);
        dialog.appendChild(detailsPane);
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                closeDialog();
            }
        });

        titleInput.focus();
    }

    function loadMyRequests(container, user, dialog) {
        container.innerHTML = '<div style="font-size:.8em;opacity:.4;padding:20px 0;text-align:center;">Loading database...</div>';
        
        fetch(API + '/requests?userId=' + encodeURIComponent(user.id))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var isServerAdmin = data.isAdmin || user.isAdmin;
                var list = data.requests || [];
                var filtered = [];
                
                for (var i = 0; i < list.length; i++) {
                    if (isServerAdmin || list[i].userId === user.id) {
                        filtered.push(list[i]);
                    }
                }

                if (filtered.length === 0) {
                    container.innerHTML = '<div style="font-size:.8em;opacity:.35;padding:20px 0;text-align:center;">No requests found.</div>';
                    return;
                }
                
                container.innerHTML = '';
                for (var j = filtered.length - 1; j >= 0; j--) {
                    var req = filtered[j];
                    
                    var row = document.createElement('div');
                    row.className = 'jfmr-req-item';

                    var infoCol = document.createElement('div');
                    infoCol.className = 'jfmr-req-info';

                    var nameEl = document.createElement('div');
                    nameEl.className = 'jfmr-req-name';
                    nameEl.textContent = req.title;

                    var metaEl = document.createElement('div');
                    metaEl.className = 'jfmr-req-meta';
                    var metaText = req.type;
                    if (req.year) { metaText += ' (' + req.year + ')'; }
                    if (isServerAdmin && req.userName) { metaText += ' • Req by: ' + req.userName; }
                    metaEl.textContent = metaText;

                    infoCol.appendChild(nameEl);
                    infoCol.appendChild(metaEl);
                    row.appendChild(infoCol);

                    var actionsCol = document.createElement('div');
                    actionsCol.className = 'jfmr-req-actions';

                    var badge = document.createElement('div');
                    badge.className = 'jfmr-req-status ' + statusClass(req.status);
                    badge.textContent = req.status.charAt(0).toUpperCase() + req.status.slice(1);
                    actionsCol.appendChild(badge);

                    var chevron = document.createElement('div');
                    chevron.innerHTML = '<span class="material-icons" style="opacity:0.5; font-size:1.2em; margin-left:4px;">chevron_right</span>';
                    actionsCol.appendChild(chevron);

                    row.appendChild(actionsCol);
                    container.appendChild(row);

                    (function(currentReq) {
                        row.onclick = function() {
                            showDetails(currentReq, { id: user.id, name: user.name, isAdmin: isServerAdmin }, dialog, container);
                            dialog.setAttribute('data-stage', 'details');
                        };
                    })(req);
                }
            }).catch(function () {
                container.innerHTML = '<div style="font-size:.8em;opacity:.35;padding:20px 0;text-align:center;">Could not load requests database.</div>';
            });
    }

    function showDetails(req, user, dialog, listContainer) {
        var detailsPane = dialog.querySelector('.jfmr-pane-details');
        detailsPane.innerHTML = '';

        var header = document.createElement('div');
        header.className = 'jfmr-detail-header';

        var backToListBtn = document.createElement('button');
        backToListBtn.type = 'button';
        backToListBtn.className = 'jfmr-back-btn';
        backToListBtn.innerHTML = '<span class="material-icons" style="font-size:1.1em;">arrow_back</span> Back';
        backToListBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            dialog.setAttribute('data-stage', 'list');
        };

        var title = document.createElement('h3');
        title.className = 'jfmr-detail-title';
        title.textContent = 'Request Details';

        header.appendChild(backToListBtn);
        header.appendChild(title);
        detailsPane.appendChild(header);

        function addGroup(label, value) {
            if (!value) return;
            var group = document.createElement('div');
            group.className = 'jfmr-detail-group';
            var lbl = document.createElement('div');
            lbl.className = 'jfmr-detail-label';
            lbl.textContent = label;
            var val = document.createElement('div');
            val.className = 'jfmr-detail-value';
            val.textContent = value;
            group.appendChild(lbl);
            group.appendChild(val);
            detailsPane.appendChild(group);
        }

        addGroup('Media Title', req.title);
        addGroup('Type & Year', req.type + (req.year ? ' (' + req.year + ')' : ''));
        addGroup('Requested By', req.userName || req.userId || 'Unknown User');
        addGroup('Date Requested', new Date(req.createdAt).toLocaleString());
        addGroup('Notes', req.note || 'No notes provided.');

        if (!user.isAdmin) {
            var statGroup = document.createElement('div');
            statGroup.className = 'jfmr-detail-group';
            statGroup.innerHTML = '<div class="jfmr-detail-label">Status</div><div class="jfmr-req-status ' + statusClass(req.status) + '" style="display:inline-block; margin-top:5px;">' + req.status.charAt(0).toUpperCase() + req.status.slice(1) + '</div>';
            detailsPane.appendChild(statGroup);
        } else {
            var adminGroup = document.createElement('div');
            adminGroup.className = 'jfmr-detail-group';
            adminGroup.style.border = '1px solid ' + ACCENT;
            adminGroup.style.background = 'rgba(0,0,0,0.2)';

            var adminLbl = document.createElement('div');
            adminLbl.className = 'jfmr-detail-label';
            adminLbl.textContent = 'Admin Actions';
            adminGroup.appendChild(adminLbl);

            var controls = document.createElement('div');
            controls.style.display = 'flex';
            controls.style.gap = '10px';
            controls.style.marginTop = '10px';

            var sel = document.createElement('select');
            sel.className = 'jfmr-admin-sel';
            sel.style.flex = '1';
            var opts = ['pending', 'approved', 'declined', 'available'];
            for (var o = 0; o < opts.length; o++) {
                var opt = document.createElement('option');
                opt.value = opts[o];
                opt.textContent = opts[o].charAt(0).toUpperCase() + opts[o].slice(1);
                sel.appendChild(opt);
            }
            sel.value = req.status;

            var updateBtn = document.createElement('button');
            updateBtn.type = 'button';
            updateBtn.className = 'jfmr-btn jfmr-btn-submit';
            updateBtn.textContent = 'Update';
            updateBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                updateBtn.disabled = true;
                updateBtn.textContent = 'Saving...';
                fetch(API + '/requests/' + req.id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: sel.value, adminId: user.id })
                }).then(function() {
                    loadMyRequests(listContainer, user, dialog);
                    dialog.setAttribute('data-stage', 'list');
                });
            };

            var delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'jfmr-admin-del';
            delBtn.innerHTML = '<span class="material-icons" style="font-size:1.1em; margin-top:2px;">delete</span>';
            delBtn.title = 'Delete Request';
            delBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (!confirm('Are you sure you want to delete this request permanently?')) return;
                delBtn.disabled = true;
                delBtn.innerHTML = '...';
                fetch(API + '/requests/' + req.id + '?adminId=' + encodeURIComponent(user.id), {
                    method: 'DELETE'
                }).then(function() {
                    loadMyRequests(listContainer, user, dialog);
                    dialog.setAttribute('data-stage', 'list');
                });
            };

            controls.appendChild(sel);
            controls.appendChild(updateBtn);
            controls.appendChild(delBtn);
            adminGroup.appendChild(controls);
            detailsPane.appendChild(adminGroup);
        }
    }

    function addNavButton() {
        if (document.getElementById(BTN_ID)) {
            return;
        }
        var libraryMenuOptions = document.querySelector('.libraryMenuOptions');
        if (!libraryMenuOptions) {
            return;
        }

        var btn = document.createElement('a');
        btn.id   = BTN_ID;
        btn.href = '#';
        btn.className = 'navMenuOption emby-button';

        var icon = document.createElement('span');
        icon.className   = 'material-icons navMenuOptionIcon';
        icon.textContent = 'add_box';
        icon.setAttribute('aria-hidden', 'true');

        var label = document.createElement('span');
        label.className   = 'navMenuOptionText';
        label.textContent = MENU_LABEL || 'Request Media';

        btn.appendChild(icon);
        btn.appendChild(label);

        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            openDialog();
        };

        libraryMenuOptions.appendChild(btn);
    }

    function init() {
        injectCSS();
        addNavButton();
    }

    var _observer = null;

    function watchForDrawer() {
        if (_observer) {
            return;
        }
        _observer = new MutationObserver(function () {
            addNavButton();
        });
        _observer.observe(document.body, { childList: true, subtree: true });
        init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', watchForDrawer);
    } else {
        setTimeout(watchForDrawer, 500);
    }

})();
