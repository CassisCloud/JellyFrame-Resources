(function() {
    var tabName = '{{TAB_NAME}}';
    var topOffset = '{{TAB_TOP_OFFSET}}';
    
    var modId = 'custom-synthetic-tabs'; 
    var iframeUrl = '/JellyFrame/mods/' + modId + '/api/page.html';

    var container = document.createElement('div');
    container.id = 'jellyframe-custom-tab-container';
    container.style.position = 'fixed';
    container.style.top = topOffset;
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = 'calc(100% - ' + topOffset + ')';
    container.style.zIndex = '999';
    container.style.display = 'none';
    container.style.background = 'var(--background-color, #101010)';
    container.innerHTML = '<iframe src="' + iframeUrl + '" style="width:100%; height:100%; border:none; background:transparent;"></iframe>';
    document.body.appendChild(container);

    var observer = new MutationObserver(function(mutations) {
        var sliders = document.querySelectorAll('.emby-tabs-slider');
        for (var i = 0; i < sliders.length; i++) {
            var slider = sliders[i];
            if (!slider.querySelector('.custom-synthetic-tab-btn')) {
                injectCustomTab(slider);
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function injectCustomTab(slider) {
        var index = slider.children.length;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'emby-tab-button emby-button custom-synthetic-tab-btn';
        btn.setAttribute('data-index', index);
        btn.innerHTML = '<div class="emby-button-foreground">' + tabName + '</div>';

        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            var siblings = slider.querySelectorAll('.emby-tab-button');
            for (var j = 0; j < siblings.length; j++) {
                siblings[j].classList.remove('emby-tab-button-active');
            }
            btn.classList.add('emby-tab-button-active');

            container.style.display = 'block';
        });

        var otherTabs = slider.querySelectorAll('.emby-tab-button:not(.custom-synthetic-tab-btn)');
        for (var k = 0; k < otherTabs.length; k++) {
            otherTabs[k].addEventListener('click', function() {
                container.style.display = 'none';
                btn.classList.remove('emby-tab-button-active');
            });
        }

        slider.appendChild(btn);
    }

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
