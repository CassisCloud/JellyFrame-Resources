(function() {
    'use strict';

    var css = "#vsf-popup{position:fixed;bottom:90px;right:20px;width:300px;background:#1e1e1e;border:1px solid #444;border-radius:12px;z-index:999999;box-shadow:0 16px 60px rgba(0,0,0,.95);overflow:hidden;display:none;flex-direction:column}#vsf-popup.open{display:flex}#vsf-popup .hdr{padding:12px 16px;background:rgba(0,164,220,.1);border-bottom:1px solid #444;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#00a4dc}#vsf-popup .list{max-height:280px;overflow-y:auto;padding:6px}#vsf-popup .item{padding:10px 12px;border-radius:8px;cursor:pointer;border:1px solid transparent;display:flex;align-items:center;justify-content:space-between;gap:8px;color:#fff;transition:background .15s}#vsf-popup .item:hover{background:rgba(255,255,255,.07)}#vsf-popup .item.active{background:rgba(0,164,220,.15);border-color:rgba(0,164,220,.4)}#vsf-popup .item.active .iname{color:#00a4dc}#vsf-popup .iname{font-size:13px;font-weight:600;margin-bottom:2px}#vsf-popup .imeta{font-size:10px;color:#888}#vsf-popup .chk{width:18px;height:18px;border-radius:50%;background:#00dc7d;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;color:#000;font-weight:bold}#vsf-popup .unchk{width:18px;height:18px;border-radius:50%;border:1.5px solid #555;flex-shrink:0}#vsf-toast{position:fixed;bottom:140px;left:50%;transform:translateX(-50%) translateY(10px);background:rgba(0,0,0,.92);border:1px solid rgba(0,220,125,.45);color:#00dc7d;padding:9px 18px;border-radius:8px;font-size:12px;font-weight:700;z-index:999999;opacity:0;pointer-events:none;transition:all .3s ease;white-space:nowrap}#vsf-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}";
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var _fetchingId = null;
    var _validId = null; 
    var _lastId = null;
    var _popupTimer = null;
    var _btn = null;

    function initPopupDOM() {
        if (document.getElementById('vsf-popup')) return;
        
        var p = document.createElement('div');
        p.id = 'vsf-popup';
        document.body.appendChild(p);

        document.addEventListener('click', function(e) {
            var popup = document.getElementById('vsf-popup');
            var btn = document.getElementById('vsf-btn');
            
            if (popup && popup.classList.contains('open')) {
                if (!popup.contains(e.target) && (!btn || !btn.contains(e.target))) {
                    popup.classList.remove('open');
                }
            }
        });
    }

    function toast(m) {
        var t = document.getElementById('vsf-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'vsf-toast';
            document.body.appendChild(t);
        }
        clearTimeout(t._t);
        t.textContent = m;
        t.classList.add('show');
        t._t = setTimeout(function() {
            t.classList.remove('show');
        }, 2500);
    }

    function getItemId() {
        var ratingBtn = document.querySelector('.btnUserRating[data-id]');
        if (ratingBtn) {
            var dataId = ratingBtn.getAttribute('data-id');
            if (dataId && dataId.length >= 20) return dataId;
        }

        var h = (location.hash + location.search).match(/[?&](id|itemId)=([a-f0-9]{20,})/i);
        if (h) return h[2];

        var v = document.querySelector('video');
        if (v && v.src) {
            var m = v.src.match(/\/(Videos|Items)\/([a-f0-9]{20,})\//i);
            if (m) return m[2];
        }
        
        return null;
    }

    function getActiveMsId() {
        var v = document.querySelector('video');
        if (!v || !v.src) return null;
        var m = v.src.match(/mediaSourceId=([a-f0-9]{20,})/i) || v.src.match(/\/([a-f0-9]{20,})\/stream/i);
        if (m) return m[1];
        return null;
    }

    function verName(s, i, itemType) {
        if (itemType === 'Episode') {
            var parts = (s.Path || '').replace(/\\/g, '/').split('/');
            var filteredParts = [];
            for (var j = 0; j < parts.length; j++) {
                if (parts[j]) filteredParts.push(parts[j]);
            }
            if (filteredParts.length >= 2) return filteredParts[filteredParts.length - 2];
        } else {
            var r = (s.Name || '').trim().replace(/\btt\d{5,}\b/gi, '').replace(/\s{2,}/g, ' ').trim();
            if (r && !/^\d+$/.test(r) && !/^[a-f0-9]{20,}$/i.test(r)) return r;
            if (s.Path) {
                var pathParts = s.Path.split(/[/\\]/);
                var f = pathParts[pathParts.length - 1].replace(/\.[^.]+$/, '').replace(/\btt\d{5,}\b/gi, '').trim();
                var p = f.split(' - ');
                if (p.length > 1) return p[p.length - 1].trim();
                return f;
            }
        }
        return 'Version ' + (i + 1);
    }

    function switchVersion(msId) {
        var pp = document.getElementById('vsf-popup');
        if (pp) pp.classList.remove('open');
        
        var vid = document.querySelector('video');
        var ticks = vid ? vid.currentTime : 0;
        var id = getItemId();

        if (!id || !vid) {
            toast('[!] No video found');
            return;
        }

        var u = ApiClient.getCurrentUserId();
        var tok = ApiClient.accessToken();
        var base = ApiClient.serverAddress();

        fetch(base + '/Items/' + id + '/PlaybackInfo?userId=' + u + '&mediaSourceId=' + msId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Emby-Token': tok },
            body: JSON.stringify({
                UserId: u,
                MediaSourceId: msId,
                EnableDirectStream: true,
                EnableDirectPlay: true
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(info) {
            var src = null;
            if (info.MediaSources) {
                for (var i = 0; i < info.MediaSources.length; i++) {
                    if (info.MediaSources[i].Id === msId) {
                        src = info.MediaSources[i];
                        break;
                    }
                }
                if (!src) src = info.MediaSources[0];
            }

            if (!src) {
                toast('[!] Version not found');
                return;
            }

            var url = '';
            if (src.SupportsDirectStream) {
                url = base + '/Videos/' + id + '/stream.' + (src.Container || 'mp4') + '?MediaSourceId=' + msId + '&Static=true&api_key=' + tok;
            } else if (src.TranscodingUrl) {
                url = base + src.TranscodingUrl;
            } else {
                url = base + '/Videos/' + id + '/stream?MediaSourceId=' + msId + '&api_key=' + tok;
            }

            vid.src = url;
            vid.currentTime = ticks;
            
            var playPromise = vid.play();
            if (playPromise !== undefined) {
                playPromise.catch(function() {});
            }
            toast('[OK] Version switched');
        })
        .catch(function(e) {
            toast('[!] Error switching version');
        });
    }

    function openPopup() {
        var p = document.getElementById('vsf-popup');
        if (p && p.classList.contains('open')) {
            p.classList.remove('open');
            clearTimeout(_popupTimer);
            return;
        }

        var id = getItemId();
        if (!id) {
            toast('[!] No video found');
            return;
        }

        ApiClient.getItem(ApiClient.getCurrentUserId(), id)
        .then(function(item) {
            if (item.Type !== 'Movie' && item.Type !== 'Episode') return;

            var src = item.MediaSources || [];
            
            if (src.length <= 1) {
                toast('[!] Only one version available');
                return;
            }

            var activeId = getActiveMsId() || (src.length > 0 ? src[0].Id : null);
            
            var headerTitle = item.Type === 'Movie' ? 'Movie Versions' : 'Episode Versions';
            var html = '<div class="hdr">' + headerTitle + ' <span style="opacity:.5;font-weight:400;letter-spacing:0;margin-left:6px">' + src.length + ' available</span></div><div class="list">';

            for (var i = 0; i < src.length; i++) {
                var s = src[i];
                var a = s.Id === activeId;
                var vs = null;
                
                if (s.MediaStreams) {
                    for (var j = 0; j < s.MediaStreams.length; j++) {
                        if (s.MediaStreams[j].Type === 'Video') {
                            vs = s.MediaStreams[j];
                            break;
                        }
                    }
                }

                var metaParts = [];
                if (vs && vs.Height) metaParts.push(vs.Height + 'p');
                if (s.Size) metaParts.push((s.Size / 1073741824).toFixed(1) + ' GB');
                var meta = metaParts.join(' * ');

                html += '<div class="item' + (a ? ' active' : '') + '" data-ms="' + s.Id + '">';
                html += '<div style="min-width:0"><div class="iname">' + verName(s, i, item.Type) + '</div>';
                if (meta) html += '<div class="imeta">' + meta + '</div>';
                html += '</div>';
                
                if (a) {
                    html += '<div class="chk">OK</div>';
                } else {
                    html += '<div class="unchk"></div>';
                }
                html += '</div>';
            }
            
            html += '</div>';
            p.innerHTML = html;

            var items = p.querySelectorAll('.item');
            for (var k = 0; k < items.length; k++) {
                (function(el) {
                    el.addEventListener('click', function() {
                        switchVersion(el.dataset.ms);
                    });
                })(items[k]);
            }

            p.classList.add('open');
            clearTimeout(_popupTimer);
            _popupTimer = setTimeout(function() {
                p.classList.remove('open');
            }, 6000);
        })
        .catch(function(e) {
            toast('[!] Failed to load data');
        });
    }

    function getOrCreateBtn() {
        if (!_btn) {
            _btn = document.createElement('button');
            _btn.id = 'vsf-btn';
            _btn.setAttribute('is', 'paper-icon-button-light');
            _btn.className = 'autoSize paper-icon-button-light emby-button';
            _btn.title = 'Select version';
            _btn.setAttribute('aria-label', 'Select version');
            _btn.innerHTML = '<span class="xlargePaperIconButton material-icons" aria-hidden="true">video_library</span>';

            _btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openPopup();
            });
        }
        return _btn;
    }

    function tryInject() {
        initPopupDOM(); 

        var id = getItemId();
        
        var container = document.querySelector('.buttons.focuscontainer-x') || document.querySelector('.detailButtons, .mainDetailButtons');

        if (!container || !id) {
            if (_btn && _btn.parentNode) {
                _btn.parentNode.removeChild(_btn);
            }
            return;
        }

        if (id !== _lastId) {
            _lastId = id;
            _validId = null;
            _fetchingId = null;
            if (_btn && _btn.parentNode) _btn.parentNode.removeChild(_btn);
        }

        var btn = getOrCreateBtn();

        if (container.contains(btn)) return;

        if (_validId === id) {
            var anchor = container.querySelector('.btnSubtitles, .btnAudio, .btnVideoOsdSettings');
            if (anchor) {
                container.insertBefore(btn, anchor);
            } else {
                container.appendChild(btn);
            }
            return;
        }

        if (_fetchingId === id) return;

        _fetchingId = id;
        ApiClient.getItem(ApiClient.getCurrentUserId(), id).then(function(item) {
            if ((item.Type === 'Movie' || item.Type === 'Episode') && item.MediaSources && item.MediaSources.length > 1) {
                _validId = id;
                tryInject();
            } else {
                _validId = null;
            }
        }).catch(function() {
            _validId = null;
        });
    }

    setInterval(tryInject, 400);
    
    document.addEventListener('mousemove', function() {
        tryInject();
    }, { passive: true });

    var observer = new MutationObserver(function() {
        tryInject();
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

})();
