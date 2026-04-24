(function () {
    'use strict';

    var CAL_ICON = '<span class="jf-tab-icon" style="margin-right:6px;vertical-align:middle;"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" fill="currentColor"/></svg></span>';

    var DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    function pad(n) { 
        return String(n).length < 2 ? '0' + String(n) : String(n); 
    }
    
    function toKey(d) { 
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); 
    }
    
    function fmtDayLabel(d) { 
        return { 
            day: DAYS_EN[d.getDay()], 
            date: pad(d.getDate()) + '.' + pad(d.getMonth() + 1) 
        }; 
    }

    var CSS = 
        "#jf-overlay { position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,.55); backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4); display:flex; flex-direction:column; overflow:hidden; }" +
        "#jf-overlay-header { display:flex; align-items:center; justify-content:space-between; padding:14px 3.5%; border-bottom:1px solid rgba(255,255,255,.12); flex-shrink:0; background:rgba(0,0,0,.2); gap:12px; }" +
        "#jf-overlay-title { font-size:1.2em; font-weight:300; letter-spacing:.03em; display:flex; align-items:center; gap:10px; color:rgba(255,255,255,.95); flex-shrink:0; }" +
        "#jf-overlay-close { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); color:rgba(255,255,255,.85); border-radius:50%; width:34px; height:34px; font-size:1em; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background .2s; }" +
        "#jf-overlay-close:hover { background:rgba(255,255,255,.22); color:#fff; }" +
        "#jf-day-nav { display:flex; gap:6px; flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; flex:1; justify-content:center; }" +
        "#jf-day-nav::-webkit-scrollbar { display:none; }" +
        ".jf-day-btn { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.14); color:rgba(255,255,255,.7); border-radius:8px; padding:5px 10px; cursor:pointer; flex-shrink:0; font-size:.78em; line-height:1.3; text-align:center; transition:background .15s, border-color .15s, color .15s; min-width:56px; }" +
        ".jf-day-btn:hover { background:rgba(255,255,255,.14); color:#fff; }" +
        ".jf-day-btn.active { background:rgba(255,255,255,.22); border-color:rgba(255,255,255,.5); color:#fff; font-weight:500; }" +
        ".jf-day-btn.empty { opacity:.4; }" +
        ".jf-day-btn .btn-day { display:block; }" +
        ".jf-day-btn .btn-date { display:block; font-size:.9em; opacity:.6; }" +
        "#jf-overlay-body { flex:1; overflow-y:auto; padding:0 3.5% 3em; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,.2) transparent; }" +
        "#jf-overlay-body::-webkit-scrollbar { width:4px; }" +
        "#jf-overlay-body::-webkit-scrollbar-thumb { background:rgba(255,255,255,.2); border-radius:2px; }" +
        ".jf-day-section { padding-top:36px; }" +
        ".jf-day-section h2 { font-size:1.2em; font-weight:300; letter-spacing:.04em; margin:0 0 .6em; color:rgba(255,255,255,.9); }" +
        ".jf-cards { display:flex; flex-wrap:wrap; gap:12px; }" +
        ".jf-card { width:150px; flex-shrink:0; cursor:pointer; transition:transform .2s, opacity .2s; }" +
        ".jf-card:hover { transform:scale(1.05); opacity:.85; }" +
        ".jf-card-img { width:150px; height:225px; border-radius:8px; overflow:hidden; background:rgba(255,255,255,.06); position:relative; border:1px solid rgba(255,255,255,.08); }" +
        ".jf-card-img img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }" +
        ".jf-card-t { font-size:.82em; margin-top:6px; text-align:center; color:rgba(255,255,255,.9); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }" +
        ".jf-card-ep { font-size:.74em; margin-top:2px; text-align:center; color:rgba(255,255,255,.45); white-space:nowrap; }" +
        ".jf-no-ep { padding:1.5em 0; color:rgba(255,255,255,.25); font-size:.88em; font-style:italic; }" +
        ".jf-spinner { padding:3em; text-align:center; color:rgba(255,255,255,.4); }" +
        ".jf-error { padding:2em; color:#f88; font-size:.9em; line-height:1.6; background:rgba(255,80,80,.08); border-radius:8px; margin:2em 0; }" +
        "@media(max-width:600px){ .jf-card,.jf-card-img { width:calc(33vw - 14px); height:calc((33vw - 14px)*1.5); } .jf-day-btn { min-width:44px; padding:4px 5px; font-size:.72em; } }";

    function injectCSS() {
        if (document.getElementById('jf-cal-css')) return;
        var s = document.createElement('style');
        s.id = 'jf-cal-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function escHandler(e) { 
        if (e.key === 'Escape') closeCalendar(); 
    }

    function closeCalendar() {
        document.removeEventListener('keydown', escHandler);
        var o = document.getElementById('jf-overlay');
        if (o) o.remove();
        
        var tab = document.getElementById('jf-cal-tab-btn');
        if (tab) {
            tab.classList.remove('emby-tab-button-active');
        }
    }

    function fallbackFetch(server, path, params, token) {
        var url = server + '/' + path + '?' + new URLSearchParams(params).toString();
        return fetch(url, {
            headers: {
                'Authorization': 'MediaBrowser Token="' + token + '"',
                'X-Emby-Authorization': 'MediaBrowser Token="' + token + '"'
            }
        }).then(function (resp) {
            if (!resp.ok) {
                return resp.text().then(function (text) {
                    throw new Error('HTTP ' + resp.status + ' - ' + text.substring(0, 300));
                });
            }
            return resp.json();
        });
    }

    function jfFetch(server, path, params, token) {
        if (typeof ApiClient !== 'undefined' && typeof ApiClient.getJSON === 'function') {
            try {
                return ApiClient.getJSON(ApiClient.getUrl(path, params)).then(function(data) {
                    if (data && Array.isArray(data.Items)) return data;
                    return fallbackFetch(server, path, params, token);
                }).catch(function() {
                    return fallbackFetch(server, path, params, token);
                });
            } catch (e) {
                console.warn('[JF-Cal] ApiClient.getJSON failed, falling back to fetch()', e);
            }
        }
        return fallbackFetch(server, path, params, token);
    }

    function fmtEpLabel(item) {
        var s = item.ParentIndexNumber;
        var e = item.IndexNumber;
        if (s != null && e != null) return 'S' + s + ' E' + e;
        if (e != null) return 'E' + e;
        return '';
    }

    function dedup(items) {
        var seen = {};
        var result = [];
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var key = item.SeriesId || item.Id;
            if (!seen[key]) {
                seen[key] = true;
                result.push(item);
            }
        }
        return result;
    }

    function buildCards(items, server, token) {
        if (!items || !items.length) return '<div class="jf-no-ep">No episodes scheduled.</div>';
        
        var html = '';
        var deduped = dedup(items);
        
        for (var i = 0; i < deduped.length; i++) {
            var item = deduped[i];
            var sid = item.SeriesId || item.Id;
            var tag = item.SeriesPrimaryImageTag || (item.ImageTags && item.ImageTags.Primary) || '';
            var img = sid ? (server + '/Items/' + sid + '/Images/Primary?maxHeight=300&quality=85' + (tag ? '&tag=' + tag : '') + '&api_key=' + token) : '';
            var title = item.SeriesName || item.Name || '';
            var epLbl = fmtEpLabel(item);

            html += '<div class="jf-card" onclick="document.getElementById(\'jf-overlay\').remove();window.location.hash=\'/details?id=' + sid + '\'">';
            html += '<div class="jf-card-img">';
            if (img) {
                html += '<img src="' + img + '" alt="" onerror="this.style.display=\'none\'">';
            }
            html += '</div>';
            html += '<div class="jf-card-t">' + title + '</div>';
            if (epLbl) {
                html += '<div class="jf-card-ep">' + epLbl + '</div>';
            }
            html += '</div>';
        }
        return html;
    }

    function renderAll(days, groups, server, token) {
        var body = document.getElementById('jf-overlay-body');
        if (!body) return;
        
        var html = '';
        for (var i = 0; i < days.length; i++) {
            var d = days[i];
            var k = toKey(d);
            var lbl = fmtDayLabel(d);
            
            html += '<div class="jf-day-section" id="jf-sec-' + k + '">';
            html += '<h2>' + lbl.day + ' ' + lbl.date + '</h2>';
            html += '<div class="jf-cards">' + buildCards(groups[k] || [], server, token) + '</div>';
            html += '</div>';
        }
        body.innerHTML = html;
        body.scrollTop = 0;
    }

    function renderOne(key, label, groups, server, token) {
        var body = document.getElementById('jf-overlay-body');
        if (!body) return;
        
        var html = '<div class="jf-day-section">';
        html += '<h2>' + label + '</h2>';
        html += '<div class="jf-cards">' + buildCards(groups[key] || [], server, token) + '</div>';
        html += '</div>';
        
        body.innerHTML = html;
        body.scrollTop = 0;
    }

    function openCalendar() {
        injectCSS();

        var days = [];
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        
        var yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        for (var i = -1; i < 8; i++) {
            var d = new Date(today);
            d.setDate(today.getDate() + i);
            days.push(d);
        }
        var cutoff = new Date(days[days.length - 1]);
        cutoff.setHours(23, 59, 59, 999);

        var navHTML = '';
        for (var j = 0; j < days.length; j++) {
            var dj = days[j];
            var k = toKey(dj);
            var l = fmtDayLabel(dj);
            var isYest = (toKey(dj) === toKey(yesterday));
            
            navHTML += '<button class="jf-day-btn" data-key="' + k + '" data-label="' + l.day + ' ' + l.date + '">';
            navHTML += '<span class="btn-day">' + (isYest ? 'Yest.' : l.day.substring(0, 3)) + '</span>';
            navHTML += '<span class="btn-date">' + l.date + '</span>';
            navHTML += '</button>';
        }

        var overlay = document.createElement('div');
        overlay.id = 'jf-overlay';
        
        var headerHTML = '<div id="jf-overlay-header">';
        headerHTML += '<div id="jf-overlay-title"><svg viewBox="0 0 24 24" width="20" height="20" style="flex-shrink:0;opacity:.9"><path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" fill="currentColor"/></svg>Coming Up</div>';
        headerHTML += '<div id="jf-day-nav">' + navHTML + '</div>';
        headerHTML += '<button id="jf-overlay-close">✕</button></div>';
        
        var bodyHTML = '<div id="jf-overlay-body"><div class="jf-spinner">Loading…</div></div>';
        
        overlay.innerHTML = headerHTML + bodyHTML;

        document.body.appendChild(overlay);
        document.getElementById('jf-overlay-close').onclick = closeCalendar;
        document.addEventListener('keydown', escHandler);

        var userId = ApiClient.getCurrentUserId();
        var server = ApiClient.serverAddress().replace(/\/$/, '');
        var token = ApiClient.accessToken();

        jfFetch(server, 'Shows/Upcoming', {
            UserId: userId,
            Limit: 500,
            Fields: 'PremiereDate,SeriesInfo,PrimaryImageAspectRatio,SeriesPrimaryImageTag',
            ImageTypeLimit: 1,
            EnableImageTypes: 'Primary'
        }, token).then(function (data) {
            var body = document.getElementById('jf-overlay-body');
            if (!body) return;

            var groups = {};
            var items = data.Items || [];
            
            for (var m = 0; m < items.length; m++) {
                var item = items[m];
                var raw = item.PremiereDate || item.StartDate || '';
                if (!raw) continue;
                
                var dateObj = new Date(raw);
                if (isNaN(dateObj.getTime())) continue;
                
                dateObj.setHours(0, 0, 0, 0);
                if (dateObj < yesterday || dateObj > cutoff) continue;
                
                var key = toKey(dateObj);
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            }

            for (var n = 0; n < days.length; n++) {
                var dKey = toKey(days[n]);
                var btn = overlay.querySelector('.jf-day-btn[data-key="' + dKey + '"]');
                if (btn && !groups[dKey]) {
                    btn.classList.add('empty');
                }
            }

            renderAll(days, groups, server, token);

            var filterActive = false;
            var bodyEl = document.getElementById('jf-overlay-body');

            var observer;
            if (typeof IntersectionObserver !== 'undefined') {
                observer = new IntersectionObserver(function (entries) {
                    if (filterActive) return;
                    for (var e = 0; e < entries.length; e++) {
                        var entry = entries[e];
                        if (entry.isIntersecting) {
                            var targetKey = entry.target.id.replace('jf-sec-', '');
                            var buttons = overlay.querySelectorAll('.jf-day-btn');
                            for (var b = 0; b < buttons.length; b++) {
                                if (buttons[b].dataset.key === targetKey) {
                                    buttons[b].classList.add('active');
                                } else {
                                    buttons[b].classList.remove('active');
                                }
                            }
                        }
                    }
                }, { root: bodyEl, threshold: 0.4 });
            }

            function observeAll() {
                if (!observer) return;
                for (var o = 0; o < days.length; o++) {
                    var sec = document.getElementById('jf-sec-' + toKey(days[o]));
                    if (sec) observer.observe(sec);
                }
            }
            observeAll();

            var dayBtns = overlay.querySelectorAll('.jf-day-btn');
            for (var p = 0; p < dayBtns.length; p++) {
                (function(btn) {
                    btn.addEventListener('click', function () {
                        var alreadyActive = btn.classList.contains('active') && filterActive;
                        
                        var allBtns = overlay.querySelectorAll('.jf-day-btn');
                        for (var x = 0; x < allBtns.length; x++) {
                            allBtns[x].classList.remove('active');
                        }

                        if (alreadyActive) {
                            filterActive = false;
                            renderAll(days, groups, server, token);
                            setTimeout(observeAll, 100);
                        } else {
                            filterActive = true;
                            btn.classList.add('active');
                            renderOne(btn.dataset.key, btn.dataset.label, groups, server, token);
                        }
                    });
                })(dayBtns[p]);
            }

        }).catch(function (e) {
            console.error('[JF-Cal]', e);
            var body = document.getElementById('jf-overlay-body');
            if (body) {
                body.innerHTML = '<div class="jf-error"><strong>Failed to load schedule.</strong><br>' + e.message + '<br><br><small>Open the browser console (F12) and look for [JF-Cal] for details.</small></div>';
            }
        });
    }

    function createCalTab() {
        if (document.getElementById('jf-cal-tab-btn')) return;

        var slider = document.querySelector('.headerTabs .emby-tabs-slider') || document.querySelector('.emby-tabs-slider');
        if (!slider) return;

        var btn = document.createElement('button');
        btn.id = 'jf-cal-tab-btn';
        btn.setAttribute('is', 'emby-button');
        btn.className = 'emby-tab-button emby-button';
        
        var inner = document.createElement('div');
        inner.className = 'emby-button-foreground';
        inner.innerHTML = CAL_ICON + '<span class="emby-tab-button-text" style="vertical-align:middle;">Calendar</span>';
        
        btn.appendChild(inner);

        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            
            var existingOverlay = document.getElementById('jf-overlay');
            if (existingOverlay) {
                closeCalendar();
            } else {
                var siblings = slider.querySelectorAll('.emby-tab-button');
                for (var i = 0; i < siblings.length; i++) {
                    siblings[i].classList.remove('emby-tab-button-active');
                }
                btn.classList.add('emby-tab-button-active');
                openCalendar();
            }
        }, true);

        slider.appendChild(btn);
    }

    setInterval(function () {
        if (typeof ApiClient !== 'undefined') {
            injectCSS();
            createCalTab();
        }
    }, 400);

})();
