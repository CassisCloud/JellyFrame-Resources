/**
 * YouTube-style Gesture Controls Mod
 * Adds double-tap skip, repeated tap combo, long-press speed, and vertical swipe controls.
 */
(function() {
    var ENABLE_DOUBLE_TAP = '{{ENABLE_DOUBLE_TAP}}' !== '0';
    var ENABLE_COMBO_TAP = '{{ENABLE_COMBO_TAP}}' !== '0';
    var ENABLE_LONG_PRESS = '{{ENABLE_LONG_PRESS}}' !== '0';
    var ENABLE_SWIPE = '{{ENABLE_SWIPE}}' !== '0';

    var SKIP_SECONDS = parseInt('{{SKIP_SECONDS}}', 10) || 10;
    var TAP_THRESHOLD = parseInt('{{TAP_THRESHOLD}}', 10) || 300;
    var COMBO_RESET_DELAY = parseInt('{{COMBO_RESET_DELAY}}', 10) || 800;
    var LONG_PRESS_THRESHOLD = parseInt('{{LONG_PRESS_THRESHOLD}}', 10) || 500;
    var LONG_PRESS_SPEED = parseFloat('{{LONG_PRESS_SPEED}}') || 2;
    var SWIPE_SENSITIVITY = parseInt('{{SWIPE_SENSITIVITY}}', 10) || 200;

    var handlers = null;
    var uiHideTimeout = null;
    var badgeHideTimeout = null;

    var state = {
        active: false,
        moved: false,
        startX: 0,
        startY: 0,
        startTime: 0,
        startVolume: 1,
        startBrightness: 1,
        brightness: 1,
        originalPlaybackRate: 1,
        longPressTimer: null,
        isLongPressing: false,
        swipeType: null,
        tapCount: 0,
        lastTapTime: 0,
        lastTapDirection: null
    };

    if (window.__youtubeStyleDoubleTapCleanup) {
        window.__youtubeStyleDoubleTapCleanup();
    }

    function onLoad() {
        if (handlers) return;

        handlers = {
            start: onTouchStart,
            move: onTouchMove,
            end: onTouchEnd
        };

        document.addEventListener('touchstart', handlers.start, { passive: false });
        document.addEventListener('touchmove', handlers.move, { passive: false });
        document.addEventListener('touchend', handlers.end, { passive: false });
        document.addEventListener('touchcancel', handlers.end, { passive: false });

        window.__youtubeStyleDoubleTapCleanup = onUnload;
    }

    function onUnload() {
        if (handlers) {
            document.removeEventListener('touchstart', handlers.start);
            document.removeEventListener('touchmove', handlers.move);
            document.removeEventListener('touchend', handlers.end);
            document.removeEventListener('touchcancel', handlers.end);
            handlers = null;
        }

        clearLongPressTimer();
        clearRippleTimer();
        clearBadgeTimer();
        restorePlaybackRate();
        removeRipple();
        removeCenterBadge();
        removeBrightnessOverlay();
        resetGestureState();

        if (window.__youtubeStyleDoubleTapCleanup === onUnload) {
            window.__youtubeStyleDoubleTapCleanup = null;
        }
    }

    function getValidVideo(e) {
        if (window.location.href.indexOf('details') !== -1) return null;

        var video = document.querySelector('video');
        if (!video) return null;
        if (video.closest && (video.closest('.backgroundContainer') || video.closest('.backdropContainer'))) return null;

        if (e && e.target && e.target.closest && e.target.closest('button, input, a, .osdControls, .sliderContainer, .videoOsdBottom, .skinHeader, .actions')) {
            return null;
        }

        return video;
    }

    function onTouchStart(e) {
        if (!e || !e.touches || e.touches.length !== 1) return;

        var video = getValidVideo(e);
        if (!video) return;

        var touch = e.touches[0];
        state.active = true;
        state.moved = false;
        state.startX = touch.clientX;
        state.startY = touch.clientY;
        state.startTime = Date.now();
        state.startVolume = typeof video.volume === 'number' ? video.volume : 1;
        state.startBrightness = state.brightness;
        state.originalPlaybackRate = video.playbackRate || 1;
        state.swipeType = null;
        state.isLongPressing = false;

        clearLongPressTimer();

        if (ENABLE_LONG_PRESS) {
            state.longPressTimer = setTimeout(function() {
                var currentVideo = getValidVideo(null);
                if (!state.active || state.moved || !currentVideo) return;

                state.isLongPressing = true;
                currentVideo.playbackRate = LONG_PRESS_SPEED;
                showCenterBadge('Speed ' + LONG_PRESS_SPEED + 'x');
            }, LONG_PRESS_THRESHOLD);
        }
    }

    function onTouchMove(e) {
        if (!state.active || !e || !e.touches || e.touches.length !== 1) return;

        var video = getValidVideo(e);
        if (!video) return;

        var touch = e.touches[0];
        var deltaX = touch.clientX - state.startX;
        var deltaY = touch.clientY - state.startY;
        var absX = Math.abs(deltaX);
        var absY = Math.abs(deltaY);

        if (absX > 10 || absY > 10) {
            state.moved = true;
            clearLongPressTimer();
        }

        if (state.isLongPressing || !ENABLE_SWIPE) return;

        if (absY > 20 && absY > absX) {
            e.preventDefault();

            if (!state.swipeType) {
                state.swipeType = state.startX > ((window.innerWidth || 1) / 2) ? 'volume' : 'brightness';
            }

            var change = -(deltaY / SWIPE_SENSITIVITY);

            if (state.swipeType === 'volume') {
                var newVolume = clamp(state.startVolume + change, 0, 1);
                video.volume = newVolume;
                showCenterBadge('Volume ' + Math.round(newVolume * 100) + '%');
            } else {
                state.brightness = clamp(state.startBrightness + change, 0.1, 1);
                updateBrightnessOverlay();
                showCenterBadge('Brightness ' + Math.round(state.brightness * 100) + '%');
            }
        }
    }

    function onTouchEnd(e) {
        if (!state.active) return;

        var video = getValidVideo(null);
        var now = Date.now();
        var touchDuration = now - state.startTime;

        clearLongPressTimer();

        if (state.isLongPressing) {
            if (video) {
                video.playbackRate = state.originalPlaybackRate || 1;
            }
            state.isLongPressing = false;
            hideCenterBadgeSoon(250);
            finishGestureOnly();
            return;
        }

        if (state.swipeType) {
            state.swipeType = null;
            hideCenterBadgeSoon(900);
            finishGestureOnly();
            return;
        }

        if (ENABLE_DOUBLE_TAP && video && !state.moved && touchDuration < 250) {
            if (handleDoubleTap(video, now) && e && e.preventDefault) {
                e.preventDefault();
            }
        } else if (state.moved) {
            resetTapState();
            hideRippleSoon(0);
        }

        finishGestureOnly();
    }

    function finishGestureOnly() {
        state.active = false;
        state.moved = false;
        state.swipeType = null;
    }

    function handleDoubleTap(video, now) {
        var width = window.innerWidth || 1;
        var direction = null;

        if (state.startX < width * 0.3) {
            direction = 'left';
        } else if (state.startX > width * 0.7) {
            direction = 'right';
        }

        if (!direction) {
            resetTapState();
            hideRippleSoon(0);
            return false;
        }

        if (now - state.lastTapTime < TAP_THRESHOLD && state.lastTapDirection === direction) {
            if (ENABLE_COMBO_TAP) {
                state.tapCount++;
            } else {
                state.tapCount = 2;
            }

            applySkip(video, direction, SKIP_SECONDS);
            updateRipple(direction, ENABLE_COMBO_TAP ? (state.tapCount - 1) * SKIP_SECONDS : SKIP_SECONDS);
            state.lastTapTime = now;
            state.lastTapDirection = direction;
            return true;
        } else {
            state.tapCount = 1;
            clearRippleTimer();
            removeRipple();
        }

        state.lastTapTime = now;
        state.lastTapDirection = direction;
        return false;
    }

    function applySkip(video, direction, skipSeconds) {
        if (direction === 'right') {
            video.currentTime = Math.min(video.duration || video.currentTime, video.currentTime + skipSeconds);
        } else {
            video.currentTime = Math.max(0, video.currentTime - skipSeconds);
        }
    }

    function resetGestureState() {
        state.active = false;
        state.moved = false;
        state.swipeType = null;
        state.isLongPressing = false;
        resetTapState();
    }

    function restorePlaybackRate() {
        if (!state.isLongPressing) return;

        var video = document.querySelector('video');
        if (video) {
            video.playbackRate = state.originalPlaybackRate || 1;
        }
        state.isLongPressing = false;
    }

    function resetTapState() {
        state.tapCount = 0;
        state.lastTapTime = 0;
        state.lastTapDirection = null;
    }

    function clearLongPressTimer() {
        if (state.longPressTimer) {
            clearTimeout(state.longPressTimer);
            state.longPressTimer = null;
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
        hideRippleSoon(ENABLE_COMBO_TAP ? COMBO_RESET_DELAY : 500);
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

    function updateBrightnessOverlay() {
        var overlay = document.getElementById('jf-gesture-brightness-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'jf-gesture-brightness-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:9998;pointer-events:none;opacity:0;transition:opacity .1s ease-out';
            document.body.appendChild(overlay);
        }
        overlay.style.opacity = String((1 - state.brightness) * 0.8);
    }

    function removeBrightnessOverlay() {
        var overlay = document.getElementById('jf-gesture-brightness-overlay');
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    function showCenterBadge(text) {
        var badge = document.getElementById('jf-gesture-center-badge');
        clearBadgeTimer();

        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'jf-gesture-center-badge';
            badge.style.cssText = 'position:fixed;top:10%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.65);color:#fff;padding:10px 18px;border-radius:999px;font-family:Roboto,Helvetica Neue,sans-serif;font-size:16px;font-weight:700;z-index:9999;pointer-events:none;opacity:0;transition:opacity .2s ease-out';
            document.body.appendChild(badge);
        }

        badge.textContent = text;
        badge.style.opacity = '1';
    }

    function hideCenterBadgeSoon(delay) {
        clearBadgeTimer();
        badgeHideTimeout = setTimeout(function() {
            var badge = document.getElementById('jf-gesture-center-badge');
            if (badge) {
                badge.style.opacity = '0';
            }
        }, delay);
    }

    function removeCenterBadge() {
        var badge = document.getElementById('jf-gesture-center-badge');
        if (badge && badge.parentNode) {
            badge.parentNode.removeChild(badge);
        }
    }

    function clearBadgeTimer() {
        if (badgeHideTimeout) {
            clearTimeout(badgeHideTimeout);
            badgeHideTimeout = null;
        }
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onLoad);
    } else {
        onLoad();
    }
})();
