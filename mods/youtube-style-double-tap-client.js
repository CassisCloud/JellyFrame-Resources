/**
 * YouTube-style Double-Tap Skip Mod
 * Skip video by repeatedly double-tapping the left or right side of the screen.
 */
(function() {
    var SKIP_SECONDS = parseInt('{{SKIP_SECONDS}}', 10) || 10;
    var TAP_THRESHOLD = parseInt('{{TAP_THRESHOLD}}', 10) || 300;

    var touchHandler = null;
    var lastTapTime = 0;
    var lastTapDirection = null;
    var tapCount = 0;
    var uiHideTimeout = null;

    if (window.__youtubeStyleDoubleTapCleanup) {
        window.__youtubeStyleDoubleTapCleanup();
    }

    function onLoad() {
        if (touchHandler) return;
        touchHandler = function(e) {
            handleTouch(e, SKIP_SECONDS, TAP_THRESHOLD);
        };
        document.addEventListener('touchstart', touchHandler, { passive: false });
        window.__youtubeStyleDoubleTapCleanup = onUnload;
    }

    function onUnload() {
        if (touchHandler) {
            document.removeEventListener('touchstart', touchHandler);
            touchHandler = null;
        }
        if (uiHideTimeout) {
            clearTimeout(uiHideTimeout);
            uiHideTimeout = null;
        }
        resetTapState();
        removeRipple();
        if (window.__youtubeStyleDoubleTapCleanup === onUnload) {
            window.__youtubeStyleDoubleTapCleanup = null;
        }
    }

    function resetTapState() {
        tapCount = 0;
        lastTapTime = 0;
        lastTapDirection = null;
    }

    function handleTouch(e, skipSeconds, tapThreshold) {
        if (window.location.href.indexOf('details') !== -1) return;
        if (!e || !e.touches || !e.touches.length) return;

        var video = document.querySelector('video');
        if (!video) return;

        var target = e.target;
        if (target && target.closest && target.closest('button, input, a, .osdControls, .sliderContainer, .videoOsdBottom, .skinHeader, .actions')) return;
        if (video.closest && (video.closest('.backgroundContainer') || video.closest('.backdropContainer'))) return;

        var now = Date.now();
        var touchX = e.touches[0].clientX;
        var width = window.innerWidth || 1;
        var timeSinceLastTap = now - lastTapTime;
        var direction = null;

        if (touchX < width * 0.3) {
            direction = 'left';
        } else if (touchX > width * 0.7) {
            direction = 'right';
        }

        if (!direction) {
            resetTapState();
            hideRippleSoon(0);
            return;
        }

        if (timeSinceLastTap < tapThreshold && lastTapDirection === direction) {
            tapCount++;
            applySkip(video, direction, skipSeconds);
            updateRipple(direction, (tapCount - 1) * skipSeconds);
            e.preventDefault();
        } else {
            tapCount = 1;
            clearRippleTimer();
            removeRipple();
        }

        lastTapTime = now;
        lastTapDirection = direction;
    }

    function applySkip(video, direction, skipSeconds) {
        if (direction === 'right') {
            video.currentTime = Math.min(video.duration || video.currentTime, video.currentTime + skipSeconds);
        } else {
            video.currentTime = Math.max(0, video.currentTime - skipSeconds);
        }
    }

    function removeRipple() {
        var existing = document.getElementById('yt-dtap-ripple');
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
        }
    }

    function clearRippleTimer() {
        if (uiHideTimeout) {
            clearTimeout(uiHideTimeout);
            uiHideTimeout = null;
        }
    }

    function updateRipple(direction, totalSkipSeconds) {
        var ripple = document.getElementById('yt-dtap-ripple');
        var isRight = direction === 'right';

        if (!ripple) {
            ripple = document.createElement('div');
            ripple.id = 'yt-dtap-ripple';
            document.body.appendChild(ripple);
        }

        var svgIcon = isRight
            ? '<svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>'
            : '<svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zM13 6v12l8.5-6L13 6z"/></svg>';

        ripple.style.cssText =
            'position:fixed;top:0;left:' + (isRight ? 'auto' : '0') + ';right:' + (isRight ? '0' : 'auto') + ';width:40vw;height:100vh;' +
            'display:flex;align-items:center;justify-content:center;' +
            'background:radial-gradient(circle at ' + (isRight ? 'right' : 'left') + ' center,rgba(255,255,255,0.15) 0%,rgba(255,255,255,0) 70%);' +
            'color:rgba(255,255,255,0.9);font-family:Roboto,Helvetica Neue,sans-serif;font-size:16px;font-weight:500;' +
            'z-index:9999;pointer-events:none;opacity:1;transition:opacity .2s ease-out';

        ripple.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">' + svgIcon + '<span id="yt-dtap-ripple-text" style="transition:transform .1s ease-out;">' + (isRight ? '+' : '-') + totalSkipSeconds + 's</span></div>';

        bumpRippleText();
        hideRippleSoon(800);
    }

    function bumpRippleText() {
        var textSpan = document.getElementById('yt-dtap-ripple-text');
        if (!textSpan) return;

        textSpan.style.transform = 'scale(1.2)';
        setTimeout(function() {
            if (textSpan) {
                textSpan.style.transform = 'scale(1)';
            }
        }, 100);
    }

    function hideRippleSoon(delay) {
        clearRippleTimer();

        uiHideTimeout = setTimeout(function() {
            var ripple = document.getElementById('yt-dtap-ripple');
            if (ripple) {
                ripple.style.opacity = '0';
            }
            setTimeout(function() {
                var currentRipple = document.getElementById('yt-dtap-ripple');
                if (currentRipple && currentRipple.style.opacity === '0' && currentRipple.parentNode) {
                    currentRipple.parentNode.removeChild(currentRipple);
                }
                resetTapState();
                uiHideTimeout = null;
            }, 220);
        }, delay);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onLoad);
    } else {
        onLoad();
    }
})();
