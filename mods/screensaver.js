(function() {
    var IDLE_TIMEOUT = 30 * 60 * 1000;
    var idleTimer = null;
    var isScreensaverActive = false;
    var interactionThrottle = false;
    var animationId = null;
    var x = 0, y = 0, dx = 2.5, dy = 2.5;
    var logoWidth = 200, logoHeight = 150;
    var colors = ['#00a4dc', '#8a2be2', '#e74c3c', '#2ecc71', '#f1c40f', '#e67e22', '#ff00ff'];
    var colorIdx = 0;
    var clockInterval = null;
    var matrixActive = false;
    var starActive = false;

    function getPreference() {
        return localStorage.getItem('jf-ss-type') || 'bouncing';
    }

    function injectDOM() {
        if (document.getElementById('jf-screensaver')) return;
        var s = document.createElement('style');
        s.id = 'jf-screensaver-css';
        s.innerHTML = '#jf-screensaver{position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:2147483647;opacity:0;pointer-events:none;transition:opacity .4s ease-in-out;overflow:hidden}#jf-screensaver.active{opacity:1;pointer-events:auto}#jf-ss-matrix,#jf-ss-starfield{display:none;position:absolute;top:0;left:0;width:100%;height:100%}#jf-ss-bouncing{position:absolute;top:0;left:0;width:'+logoWidth+'px;height:'+logoHeight+'px;display:none;flex-direction:column;align-items:center;justify-content:center;color:'+colors[0]+';will-change:transform;transition:color .3s}.jf-ss-icon{width:90px;height:90px;fill:currentColor}.jf-ss-text{font-family:"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:900;letter-spacing:6px;margin-top:10px;text-transform:uppercase}@keyframes clockDrift{0%,100%{transform:translate(-5vw,-5vh)}25%{transform:translate(5vw,-5vh)}50%{transform:translate(5vw,5vh)}75%{transform:translate(-5vw,5vh)}}#jf-ss-clock{display:none;align-items:center;justify-content:center;width:100%;height:100%;font-size:10vw;color:rgba(255,255,255,.4);font-family:monospace;animation:clockDrift 120s infinite linear;text-shadow:0 0 30px rgba(0,0,0,.8)}#jf-ss-modal{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,.8);z-index:2147483648;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s}#jf-ss-modal.open{opacity:1;pointer-events:auto}.jf-ss-dialog{background:var(--theme-background,#1a1a1a);padding:25px;border-radius:8px;border:1px solid rgba(255,255,255,.1);width:350px;color:#fff;box-shadow:0 10px 40px rgba(0,0,0,.8);font-family:inherit;transform:scale(.95);transition:transform .2s}#jf-ss-modal.open .jf-ss-dialog{transform:scale(1)}.jf-ss-select{width:100%;padding:10px;margin-bottom:25px;background:rgba(0,0,0,.5);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:4px;font-size:1rem;outline:0}.jf-ss-btn{padding:10px 20px;border:none;cursor:pointer;border-radius:4px;font-weight:700;transition:all .2s}.jf-ss-btn-cancel{background:0 0;color:#aaa;margin-right:10px}.jf-ss-btn-cancel:hover{color:#fff;background:rgba(255,255,255,.1)}.jf-ss-btn-save{background:var(--theme-primary-color,#00a4dc);color:#fff}.jf-ss-btn-save:hover{filter:brightness(1.2)}';
        document.head.appendChild(s);

        var overlay = document.createElement('div');
        overlay.id = 'jf-screensaver';
        overlay.innerHTML = '<div id="jf-ss-bouncing"><svg class="jf-ss-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg><div class="jf-ss-text">JELLYFIN</div></div><div id="jf-ss-clock">00:00</div><canvas id="jf-ss-matrix"></canvas><canvas id="jf-ss-starfield"></canvas>';
        document.body.appendChild(overlay);
        
        var modal = document.createElement('div');
        modal.id = 'jf-ss-modal';
        modal.innerHTML = '<div class="jf-ss-dialog"><h2 style="margin-top:0;margin-bottom:20px;font-weight:400">Screensaver Settings</h2><select id="jf-ss-select" class="jf-ss-select"><option value="bouncing">Bouncing Logo</option><option value="clock">Ambient Clock</option><option value="matrix">Matrix Digital Rain</option><option value="starfield">Starfield Warp</option><option value="disabled">Disabled</option></select><div style="display:flex;justify-content:flex-end"><button id="jf-ss-cancel" class="jf-ss-btn jf-ss-btn-cancel">Cancel</button><button id="jf-ss-save" class="jf-ss-btn jf-ss-btn-save">Save</button></div></div>';
        document.body.appendChild(modal);
        
        document.getElementById('jf-ss-cancel').addEventListener('click', function() {
            document.getElementById('jf-ss-modal').classList.remove('open');
        });
        
        document.getElementById('jf-ss-save').addEventListener('click', function() {
            localStorage.setItem('jf-ss-type', document.getElementById('jf-ss-select').value);
            document.getElementById('jf-ss-modal').classList.remove('open');
            resetIdleTimer();
        });
    }

    function checkAndInjectMenu() {
        if (window.location.hash.indexOf('#/mypreferencesmenu') === -1 || document.getElementById('jf-ss-menu-btn')) return;
        var targetSection = document.querySelector('.readOnlyContent .verticalSection');
        if (!targetSection) return;

        var btn = document.createElement('a');
        btn.id = 'jf-ss-menu-btn';
        btn.className = 'emby-button listItem-border';
        btn.href = '#';
        btn.style.cssText = 'display:block;margin:0;padding:0';
        btn.innerHTML = '<div class="listItem"><span class="material-icons listItemIcon listItemIcon-transparent desktop_windows" aria-hidden="true"></span><div class="listItemBody"><div class="listItemBodyText">Screensaver</div></div></div>';
            
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            var select = document.getElementById('jf-ss-select');
            if (select) select.value = getPreference();
            document.getElementById('jf-ss-modal').classList.add('open');
        });
        targetSection.appendChild(btn);
    }

    function isMediaPlaying() {
        var mediaElements = document.querySelectorAll('video, audio');
        for (var i = 0; i < mediaElements.length; i++) {
            if (!mediaElements[i].paused && !mediaElements[i].ended && mediaElements[i].readyState > 2) return true;
        }
        if (window.PlaybackManager && typeof window.PlaybackManager.isPlaying === 'function') {
            if (window.PlaybackManager.isPlaying()) return true; 
        } else if (window.PlaybackManager && window.PlaybackManager.getCurrentPlayer) {
            var player = window.PlaybackManager.getCurrentPlayer();
            if (player && !player.paused()) return true;
        }
        var videoPlayer = document.querySelector('.videoPlayerContainer');
        if (videoPlayer && !videoPlayer.classList.contains('hide') && videoPlayer.style.display !== 'none') return true;
        return false;
    }

    function animateBouncing() {
        if (!isScreensaverActive) return;
        var logo = document.getElementById('jf-ss-bouncing');
        if (!logo) return;
        var w = window.innerWidth, h = window.innerHeight, hitWall = false;
        x += dx; y += dy;
        if (x + logoWidth >= w || x <= 0) { dx = -dx; hitWall = true; x = Math.max(0, Math.min(x, w - logoWidth)); }
        if (y + logoHeight >= h || y <= 0) { dy = -dy; hitWall = true; y = Math.max(0, Math.min(y, h - logoHeight)); }
        if (hitWall) { colorIdx = (colorIdx + 1) % colors.length; logo.style.color = colors[colorIdx]; }
        logo.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
        animationId = requestAnimationFrame(animateBouncing);
    }
    
    function updateClock() {
        var clockEl = document.getElementById('jf-ss-clock');
        if (!clockEl) return;
        var d = new Date(), h = d.getHours(), m = d.getMinutes();
        if (h < 10) h = '0' + h;
        if (m < 10) m = '0' + m;
        clockEl.innerText = h + ':' + m;
    }
    
    function startMatrix() {
        var c = document.getElementById('jf-ss-matrix');
        if (!c) return;
        var ctx = c.getContext('2d'), letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*'.split(''), fontSize = 16;
        c.width = window.innerWidth; c.height = window.innerHeight;
        var columns = Math.floor(c.width / fontSize) + 1, drops = [], lastTime = 0;
        for(var x = 0; x < columns; x++) drops[x] = (Math.random() * -100); 
        matrixActive = true;

        function draw(time) {
            if (!matrixActive) return;
            requestAnimationFrame(draw);
            if (time - lastTime < 33) return;
            lastTime = time;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.fillStyle = '#0F0';
            ctx.font = fontSize + 'px monospace';
            for (var i = 0; i < drops.length; i++) {
                ctx.fillText(letters[Math.floor(Math.random() * letters.length)], i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > c.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        }
        requestAnimationFrame(draw);
    }

    function startStarfield() {
        var c = document.getElementById('jf-ss-starfield');
        if (!c) return;
        var ctx = c.getContext('2d'), numStars = 400, stars = [];
        c.width = window.innerWidth; c.height = window.innerHeight;
        for (var i = 0; i < numStars; i++) stars.push({ x: (Math.random() - 0.5) * c.width, y: (Math.random() - 0.5) * c.height, z: Math.random() * c.width });
        starActive = true;

        function draw() {
            if (!starActive) return;
            requestAnimationFrame(draw);
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, c.width, c.height);
            var cx = c.width / 2, cy = c.height / 2;
            ctx.fillStyle = 'white';
            for (var i = 0; i < numStars; i++) {
                var star = stars[i];
                star.z -= 4;
                if (star.z <= 0) { star.x = (Math.random() - 0.5) * c.width; star.y = (Math.random() - 0.5) * c.height; star.z = c.width; }
                var sx = star.x * (c.width / star.z) + cx, sy = star.y * (c.width / star.z) + cy, radius = Math.max(0, (1 - star.z / c.width) * 2.5);
                ctx.beginPath();
                ctx.arc(sx, sy, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        requestAnimationFrame(draw);
    }

    function showScreensaver() {
        if (isScreensaverActive || isMediaPlaying()) { resetIdleTimer(); return; }
        var type = getPreference();
        if (type === 'disabled') return;
        
        isScreensaverActive = true;
        var overlay = document.getElementById('jf-screensaver'), elBounce = document.getElementById('jf-ss-bouncing'), elClock = document.getElementById('jf-ss-clock'), elMatrix = document.getElementById('jf-ss-matrix'), elStarfield = document.getElementById('jf-ss-starfield');
        if (overlay) overlay.classList.add('active');
        if (elBounce) elBounce.style.display = 'none';
        if (elClock) elClock.style.display = 'none';
        if (elMatrix) elMatrix.style.display = 'none';
        if (elStarfield) elStarfield.style.display = 'none';
        
        if (type === 'bouncing' && elBounce) {
            elBounce.style.display = 'flex';
            x = Math.random() * (window.innerWidth - logoWidth); y = Math.random() * (window.innerHeight - logoHeight);
            dx = Math.random() > 0.5 ? 2.5 : -2.5; dy = Math.random() > 0.5 ? 2.5 : -2.5;
            if (animationId) cancelAnimationFrame(animationId);
            animateBouncing();
        } else if (type === 'clock' && elClock) {
            elClock.style.display = 'flex';
            updateClock();
            if (clockInterval) clearInterval(clockInterval);
            clockInterval = setInterval(updateClock, 10000);
        } else if (type === 'matrix' && elMatrix) {
            elMatrix.style.display = 'block';
            startMatrix();
        } else if (type === 'starfield' && elStarfield) {
            elStarfield.style.display = 'block';
            startStarfield();
        }
    }

    function hideScreensaver() {
        if (!isScreensaverActive) return;
        isScreensaverActive = false;
        var overlay = document.getElementById('jf-screensaver');
        if (overlay) overlay.classList.remove('active');
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
        matrixActive = false;
        starActive = false;
    }

    function resetIdleTimer() {
        if (idleTimer) clearTimeout(idleTimer);
        var modal = document.getElementById('jf-ss-modal');
        if (!isMediaPlaying() && !(modal && modal.classList.contains('open')) && getPreference() !== 'disabled') {
            idleTimer = setTimeout(showScreensaver, IDLE_TIMEOUT);
        } else {
            idleTimer = setTimeout(resetIdleTimer, 60000); 
        }
    }

    function handleInteraction() {
        if (isScreensaverActive) {
            hideScreensaver();
            resetIdleTimer();
        } else if (!interactionThrottle) {
            interactionThrottle = true;
            resetIdleTimer();
            setTimeout(function() { interactionThrottle = false; }, 500);
        }
    }

    injectDOM();
    resetIdleTimer();
    setInterval(checkAndInjectMenu, 1000);

    var evts = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'pointermove', 'click'];
    for (var i = 0; i < evts.length; i++) window.addEventListener(evts[i], handleInteraction, { passive: true });

})();
