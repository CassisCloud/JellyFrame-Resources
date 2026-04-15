(function () {
    'use strict';

    var RAW_VIDEO = '{{VIDEO_URL}}';
    var RAW_IMAGE = '{{IMAGE_URL}}';
    var DEFAULT_VIMEO = 'https://motionbgs.com/dl/4k/9423';
    var DEFAULT_IMAGE = 'https://i.redd.it/j4to3vfsazrg1.png';

    if (!RAW_VIDEO || RAW_VIDEO === '{{' + 'VIDEO_URL}}' || RAW_VIDEO.trim() === '') { RAW_VIDEO = DEFAULT_VIMEO; }
    if (!RAW_IMAGE || RAW_IMAGE === '{{' + 'IMAGE_URL}}' || RAW_IMAGE.trim() === '') { RAW_IMAGE = DEFAULT_IMAGE; }

    var STYLE_ID   = 'jf-lw-styles';
    var PLAYER_ID  = 'jf-lw-player';
    var IMAGE_ID   = 'jf-lw-image';
    var OVERLAY_ID = 'jf-lw-overlay';
    var GRAIN_ID   = 'jf-lw-grain';
    var BTN_ID     = 'jf-lw-toggle';

    var liveEnabled = localStorage.getItem('jf_lw_live') !== 'false';
    var lastOnHome  = null;
    var playerReady = false;
    var resolvedSrc = null;

    function extractVimeoId(str) {
        if (!str) { return null; }
        var m = str.match(/vimeo\.com\/(?:.*\/)?([0-9]{6,12})(?:[/?#]|$)/);
        if (m) { return m[1]; }
        if (/^[0-9]{6,12}$/.test(str.trim())) { return str.trim(); }
        return null;
    }

    function isJellyfinItemId(str) {
        return str && /^[a-f0-9]{32}$/i.test(str.trim());
    }

    function resolveVideoSource(cb) {
        var val = RAW_VIDEO.trim();
        if (isJellyfinItemId(val)) {
            resolveJellyfinItem(val, function (url) {
                cb(url ? { type: 'video', value: url } : { type: 'vimeo', value: extractVimeoId(DEFAULT_VIMEO) });
            });
            return;
        }
        var vimeoId = extractVimeoId(val);
        if (vimeoId) { cb({ type: 'vimeo', value: vimeoId }); return; }
        cb({ type: 'video', value: val });
    }

    function resolveJellyfinItem(itemId, cb) {
        var attempt = 0;
        function tryResolve() {
            attempt++;
            if (typeof ApiClient === 'undefined' || !ApiClient.getCurrentUserId()) {
                if (attempt < 20) { setTimeout(tryResolve, 300); } else { cb(null); }
                return;
            }
            try {
                var userId = ApiClient.getCurrentUserId();
                ApiClient.getJSON(ApiClient.getUrl('Users/' + userId + '/Items/' + itemId)).then(function (item) {
                    if (!item || !item.Id) { cb(null); return; }
                    cb(ApiClient.getUrl('Videos/' + item.Id + '/stream', {
                        Static: true, MediaSourceId: item.Id, api_key: ApiClient.accessToken()
                    }));
                }).catch(function () { cb(null); });
            } catch (e) { cb(null); }
        }
        tryResolve();
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) { return; }
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '#' + IMAGE_ID + '{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-10;pointer-events:none;',
            'background-size:cover;background-position:center;background-repeat:no-repeat;',
            'opacity:0;transition:opacity 1.4s cubic-bezier(.16,1,.3,1);}',
            '#' + IMAGE_ID + '.lw-visible{opacity:1;}',

            '#' + PLAYER_ID + '{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-10;pointer-events:none;',
            'opacity:0;transition:opacity 1.8s cubic-bezier(.16,1,.3,1);}',
            '#' + PLAYER_ID + '.lw-video{object-fit:cover;}',
            '#' + PLAYER_ID + '.lw-iframe{width:177.78vh;min-width:100vw;height:56.25vw;min-height:100vh;',
            'top:50%;left:50%;transform:translate(-50%,-50%);border:none;}',
            '#' + PLAYER_ID + '.lw-visible{opacity:1;}',

            '#' + OVERLAY_ID + '{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-9;pointer-events:none;',
            'background:radial-gradient(ellipse at center,rgba(0,0,0,.05) 0%,rgba(0,0,0,.45) 100%);',
            'opacity:0;transition:opacity 1.4s cubic-bezier(.16,1,.3,1);}',
            '#' + OVERLAY_ID + '.lw-visible{opacity:1;}',

            '#' + GRAIN_ID + '{position:fixed;top:-50%;left:-50%;width:200%;height:200%;z-index:-8;',
            'pointer-events:none;opacity:.03;animation:lw-grain .12s steps(1) infinite;',
            'background-image:url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E");',
            'background-size:256px 256px;}',
            '@keyframes lw-grain{0%{transform:translate(0,0)}10%{transform:translate(-2%,-3%)}',
            '20%{transform:translate(3%,1%)}30%{transform:translate(-1%,4%)}40%{transform:translate(4%,-2%)}',
            '50%{transform:translate(-3%,3%)}60%{transform:translate(2%,-4%)}70%{transform:translate(-4%,2%)}',
            '80%{transform:translate(1%,3%)}90%{transform:translate(3%,-1%)}100%{transform:translate(0,0)}}',

            'body.lw-active .backgroundContainer,body.lw-active .backdropContainer{',
            'background:transparent!important;background-image:none!important;z-index:-11!important;}',
            
            'body.lw-active .tmla-mask, body.lw-active .backdrop { z-index: -5 !important; pointer-events: none !important; }',
            
            'body.lw-active #indexPage{background:transparent!important;}',
            'body.lw-active #reactRoot{position:relative;z-index:1;}',

            '#' + BTN_ID + '{position:fixed;bottom:32px;left:32px;z-index:99;',
            'display:flex;align-items:center;justify-content:center;width:44px;height:44px;',
            'background:rgba(0,0,0,.6);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);',
            'border:1px solid rgba(255,255,255,.1);border-radius:50%;cursor:pointer;',
            'color:rgba(255,255,255,.6);transition:background .2s,color .2s,transform .2s;}',
            '#' + BTN_ID + ':hover{background:rgba(255,255,255,.15);color:#fff;transform:scale(1.05);}',
            '#' + BTN_ID + ' .material-icons{font-size:22px;line-height:1;}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function getOrCreateOverlay() {
        var o = document.getElementById(OVERLAY_ID);
        if (!o) { o = document.createElement('div'); o.id = OVERLAY_ID; document.body.insertBefore(o, document.body.firstChild); }
        return o;
    }

    function getOrCreateGrain() {
        var g = document.getElementById(GRAIN_ID);
        if (!g) { g = document.createElement('div'); g.id = GRAIN_ID; document.body.insertBefore(g, document.body.firstChild); }
        return g;
    }

    function getOrCreateImageEl() {
        var el = document.getElementById(IMAGE_ID);
        if (!el) {
            el = document.createElement('div');
            el.id = IMAGE_ID;
            el.style.backgroundImage = 'url(' + RAW_IMAGE + ')';
            document.body.insertBefore(el, document.body.firstChild);
        }
        return el;
    }

    function showImage() {
        var player = document.getElementById(PLAYER_ID);
        if (player) { player.classList.remove('lw-visible'); }
        if (player && player.tagName === 'VIDEO') { player.pause(); }
        var el = getOrCreateImageEl();
        getOrCreateOverlay();
        getOrCreateGrain();
        document.body.classList.add('lw-active');
        el.classList.add('lw-visible');
        document.getElementById(OVERLAY_ID).classList.add('lw-visible');
    }

    function hideImage() {
        var el = document.getElementById(IMAGE_ID);
        if (el) { el.classList.remove('lw-visible'); }
    }

    function createPlayer(src, cb) {
        var old = document.getElementById(PLAYER_ID);
        if (old && old.parentNode) { old.parentNode.removeChild(old); }

        if (src.type === 'vimeo') {
            var iframe = document.createElement('iframe');
            iframe.id = PLAYER_ID;
            iframe.className = 'lw-iframe';
            iframe.src = 'https://player.vimeo.com/video/' + src.value +
                '?background=1&autoplay=1&loop=1&muted=1&autopause=0&dnt=1';
            iframe.allow = 'autoplay; fullscreen; picture-in-picture';
            iframe.setAttribute('allowfullscreen', '');
            document.body.insertBefore(iframe, document.body.firstChild);
            var fired = false;
            function doneIframe() { if (fired) { return; } fired = true; if (cb) { cb(iframe); } }
            iframe.addEventListener('load', function () { setTimeout(doneIframe, 400); });
            setTimeout(doneIframe, 3000);
        } else {
            var video = document.createElement('video');
            video.id = PLAYER_ID;
            video.className = 'lw-video';
            video.src = src.value;
            video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true;
            video.setAttribute('autoplay', ''); video.setAttribute('loop', '');
            video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
            document.body.insertBefore(video, document.body.firstChild);
            var fired = false;
            function doneVideo() { if (fired) { return; } fired = true; if (cb) { cb(video); } }
            video.addEventListener('canplay', doneVideo, { once: true });
            video.addEventListener('loadeddata', doneVideo, { once: true });
            setTimeout(doneVideo, 4000);
            video.load();
            video.play().catch(function () {});
        }
    }

    function showLive() {
        hideImage();
        var player = document.getElementById(PLAYER_ID);
        getOrCreateOverlay();
        getOrCreateGrain();
        document.body.classList.add('lw-active');
        document.getElementById(OVERLAY_ID).classList.add('lw-visible');
        if (player) {
            player.classList.add('lw-visible');
            if (player.tagName === 'VIDEO') {
                player.muted = true; player.loop = true;
                if (player.paused) { player.play().catch(function () {}); }
            }
        }
    }

    function hideLive() {
        var player = document.getElementById(PLAYER_ID);
        if (player) { player.classList.remove('lw-visible'); }
        if (player && player.tagName === 'VIDEO') { player.pause(); }
    }

    function hideAll() {
        hideImage();
        hideLive();
        document.body.classList.remove('lw-active');
        var overlay = document.getElementById(OVERLAY_ID);
        if (overlay) { overlay.classList.remove('lw-visible'); }
    }

    function ensurePlayer(onReady) {
        if (playerReady && document.getElementById(PLAYER_ID)) { if (onReady) { onReady(); } return; }
        if (!resolvedSrc) {
            resolveVideoSource(function (src) {
                resolvedSrc = src;
                createPlayer(src, function () { playerReady = true; if (onReady) { onReady(); } });
            });
        } else {
            createPlayer(resolvedSrc, function () { playerReady = true; if (onReady) { onReady(); } });
        }
    }

    function updateBtn() {
        var btn = document.getElementById(BTN_ID);
        if (!btn) { return; }
        var expectedIcon = liveEnabled ? 'play_circle' : 'wallpaper';
        var expectedTitle = liveEnabled ? 'Live Wallpaper Active (Click for Static)' : 'Static Wallpaper Active (Click for Live)';
        if (btn.title !== expectedTitle) { btn.title = expectedTitle; }
        var iconSpan = btn.querySelector('.material-icons');
        if (iconSpan) {
            if (iconSpan.textContent !== expectedIcon) { iconSpan.textContent = expectedIcon; }
        } else {
            btn.innerHTML = '<span class="material-icons">' + expectedIcon + '</span>';
        }
    }

    function injectBtn() {
        if (document.getElementById(BTN_ID)) { updateBtn(); return; }
        var btn = document.createElement('button');
        btn.id = BTN_ID;
        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            liveEnabled = !liveEnabled;
            localStorage.setItem('jf_lw_live', liveEnabled ? 'true' : 'false');
            if (liveEnabled) { hideImage(); ensurePlayer(showLive); } else { hideLive(); showImage(); }
            updateBtn();
        };
        document.body.appendChild(btn);
        updateBtn();
    }

    function removeBtn() {
        var btn = document.getElementById(BTN_ID);
        if (btn && btn.parentNode) { btn.parentNode.removeChild(btn); }
    }

    function isHomePage() {
        var hash = window.location.hash || '';
        if (hash === '' || hash === '#/' || hash === '#/home') { return true; }
        if (hash.indexOf('#/home?') === 0 || hash.indexOf('#!/home') === 0) { return true; }
        var ip = document.getElementById('indexPage');
        return !!(ip && !ip.classList.contains('hide'));
    }

    function tick() {
        injectStyles();
        var onHome = isHomePage();
        if (onHome !== lastOnHome) {
            lastOnHome = onHome;
            if (!onHome) { hideAll(); removeBtn(); return; }
        }
        if (!onHome) { return; }
        injectBtn();
        if (liveEnabled) {
            hideImage();
            var player = document.getElementById(PLAYER_ID);
            if (!player) { ensurePlayer(showLive); } 
            else if (!player.classList.contains('lw-visible') && playerReady) { showLive(); } 
            else if (player.tagName === 'VIDEO' && player.paused && playerReady) {
                player.muted = true; player.loop = true;
                player.play().catch(function () {});
            }
        } else {
            hideLive();
            var img = document.getElementById(IMAGE_ID);
            if (!img || !img.classList.contains('lw-visible')) { showImage(); }
        }
    }

    setInterval(tick, 600);
    tick();
})();
