(function() {
    // Variables replaced server-side by JellyFrame
    var tabName = '{{TAB_NAME}}';
    var topOffset = '{{TAB_TOP_OFFSET}}';
    
    // The exact mod ID from your mods.json
    var modId = 'custom-synthetic-tabs'; 
    
    // Jellyfin APIs require auth. An iframe won't send the Authorization header,
    // so we must pass the API key directly in the URL query string.
    var token = window.ApiClient ? window.ApiClient.accessToken() : '';
    var iframeUrl = '/JellyFrame/mods/' + modId + '/api/page';
    if (token) {
        iframeUrl += '?api_key=' + token;
    }

    // 1. Create the persistent overlay container
    var container = document.createElement('div');
    container.id = 'jellyframe-custom-tab-container';
    container.style.position = 'fixed';
    container.style.top = topOffset;
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = 'calc(100% - ' + topOffset + ')';
    container.style.zIndex = '999';
    container.style.display = 'none';
    container.style.background = 'var(--background-color, #101010)'; // Match Jellyfin background
    container.innerHTML = '<iframe src="' + iframeUrl + '" style="width:100%; height:100%; border:none; background:transparent;"></iframe>';
    document.body.appendChild(container);

    // 2. Watch the DOM for Jellyfin drawing tab sliders
    var observer = new MutationObserver(function(mutations) {
        var sliders = document.querySelectorAll('.emby-tabs-slider');
        for (var i = 0; i < sliders.length; i++) {
            var slider = sliders[i];
            // If we haven't injected into this specific slider yet
            if (!slider.querySelector('.custom-synthetic-tab-btn')) {
                injectCustomTab(slider);
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 3. Injecting the actual UI button
    function injectCustomTab(slider) {
        var index = slider.children.length;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'emby-tab-button emby-button custom-synthetic-tab-btn';
        btn.setAttribute('data-index', index);
        btn.innerHTML = '<div class="emby-button-foreground">' + tabName + '</div>';

        // When our custom tab is clicked
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Stop Jellyfin from processing this as a normal view switch

            // Deactivate all other tabs in this slider
            var siblings = slider.querySelectorAll('.emby-tab-button');
            for (var j = 0; j < siblings.length; j++) {
                siblings[j].classList.remove('emby-tab-button-active');
            }
            // Activate ours
            btn.classList.add('emby-tab-button-active');

            // Show the iframe overlay
            container.style.display = 'block';
        });

        // When ANY OTHER native tab is clicked, hide our overlay
        var otherTabs = slider.querySelectorAll('.emby-tab-button:not(.custom-synthetic-tab-btn)');
        for (var k = 0; k < otherTabs.length; k++) {
            otherTabs[k].addEventListener('click', function() {
                container.style.display = 'none';
                btn.classList.remove('emby-tab-button-active');
            });
        }

        slider.appendChild(btn);
    }

    // 4. Global navigation fallbacks
    // Ensure our overlay hides if the user navigates to a completely different page via sidebar
    window.addEventListener('popstate', function() {
         container.style.display = 'none';
    });
    window.addEventListener('hashchange', function() {
         container.style.display = 'none';
    });
    document.addEventListener('viewshow', function() {
         container.style.display = 'none';
    });

})();
