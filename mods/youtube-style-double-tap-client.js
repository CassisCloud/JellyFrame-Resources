/**
 * YouTube-style Double-Tap Skip Mod
 * Skip video by double-tapping the left or right side of the screen.
 */
(function() {
    var SKIP_SECONDS = parseInt('{{SKIP_SECONDS}}', 10) || 10;
    var TAP_THRESHOLD = parseInt('{{TAP_THRESHOLD}}', 10) || 300;

    var touchHandler = null;
    var lastTapTime = 0;

    function onLoad() {
        touchHandler = function(e) {
            handleTouch(e, SKIP_SECONDS, TAP_THRESHOLD);
        };
        document.addEventListener('touchstart', touchHandler, { passive: false });
    }

    function onUnload() {
        if (touchHandler) {
            document.removeEventListener('touchstart', touchHandler);
            touchHandler = null;
        }
    }

    function handleTouch(e, skipSeconds, tapThreshold) {
        if (window.location.href.indexOf('details') !== -1) return;

        var video = document.querySelector('video');
        if (!video) return;

        var target = e.target;
        if (target.closest && target.closest('button, input, a, .osdControls, .sliderContainer, .videoOsdBottom, .skinHeader, .actions')) return;
        if (video.closest('.backgroundContainer') || video.closest('.backdropContainer')) return;

        var now = Date.now();
        var timeSinceLastTap = now - lastTapTime;

        if (timeSinceLastTap < tapThreshold) {
            var touchX = e.touches[0].clientX;
            var width = window.innerWidth;

            if (touchX < width * 0.3) {
                video.currentTime = Math.max(0, video.currentTime - skipSeconds);
                showRipple('left', skipSeconds);
                e.preventDefault();
            } else if (touchX > width * 0.7) {
                video.currentTime = Math.min(video.duration, video.currentTime + skipSeconds);
                showRipple('right', skipSeconds);
                e.preventDefault();
            }
        }

        lastTapTime = now;
    }

    function showRipple(direction, skipSeconds) {
        var existing = document.getElementById('yt-dtap-ripple');
        if (existing) existing.remove();

        var ripple = document.createElement('div');
        ripple.id = 'yt-dtap-ripple';
        var isRight = direction === 'right';

        var svgIcon = isRight
            ? '<svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>'
            : '<svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zM13 6v12l8.5-6L13 6z"/></svg>';

        ripple.style.cssText =
            'position:fixed;top:0;' + (isRight ? 'right' : 'left') + ':0;width:40vw;height:100vh;' +
            'display:flex;align-items:center;justify-content:center;' +
            'background:radial-gradient(circle at ' + (isRight ? 'right' : 'left') + ' center,rgba(255,255,255,0.15) 0%,rgba(255,255,255,0) 70%);' +
            'color:rgba(255,255,255,0.9);font-family:sans-serif;font-size:14px;font-weight:500;' +
            'z-index:9999;pointer-events:none;opacity:0;transition:opacity .2s ease-out';

        ripple.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;">' + svgIcon + '<span>' + (isRight ? '+' : '-') + skipSeconds + 's</span></div>';

        document.body.appendChild(ripple);

        requestAnimationFrame(function() {
            ripple.style.opacity = '1';
            setTimeout(function() {
                ripple.style.opacity = '0';
                setTimeout(function() {
                    if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
                }, 300);
            }, 300);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onLoad);
    } else {
        onLoad();
    }

    window.addEventListener('jf-unload', onUnload);
})();