// Smart Recommendations Frontend Injector
// Strictly ES5 compliant.

(function() {
    var currentUserId = null;
    var isFetching = false;
    var recData = null;
    var lastFetchTime = 0;

    function getUserId() {
        if (currentUserId) return currentUserId;
        if (typeof ApiClient !== 'undefined') {
            currentUserId = ApiClient.getCurrentUserId();
        }
        return currentUserId;
    }

    function injectStyles() {
        if (document.getElementById('jf-recs-css')) return;
        var s = document.createElement('style');
        s.id = 'jf-recs-css';
        s.innerHTML = 
            '.jf-recs-card { flex: 0 0 auto; min-width: 150px; max-width: 200px; cursor: pointer; transition: transform 0.2s ease-out; } ' +
            '.jf-recs-card:hover { transform: scale(1.05); } ' +
            '.jf-recs-img { width: 100%; border-radius: 8px; aspect-ratio: 2/3; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.4); } ' +
            '.jf-recs-title { text-align: center; margin-top: 8px; font-weight: 500; font-size: 0.9em; white-space: normal; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } ' +
            '.jf-recs-container { white-space: nowrap; display: flex; gap: 15px; padding-bottom: 20px; padding-left: 3.3%; padding-right: 3.3%; }';
        document.head.appendChild(s);
    }

    function renderUI() {
        var container = document.querySelector('.sections.homeSectionsContainer');
        
        if (!container || container.children.length === 0) return;
        
        if (document.getElementById('jf-smart-recs-section')) return;
        
        if (!recData || recData.length === 0) return;

        var section = document.createElement('div');
        section.id = 'jf-smart-recs-section';
        section.className = 'verticalSection emby-scroller-container';
        
        var html = '';
        html += '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left">';
        html += '<h2 class="sectionTitle sectionTitle-cards">Recommended For You</h2>';
        html += '</div>';

        html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale emby-scroller" data-centerfocus="true" data-scroll-mode-x="custom" style="overflow-x: auto; scroll-behavior: smooth;">';
        html += '<div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x animatedScrollX jf-recs-container">';

        for (var i = 0; i < recData.length; i++) {
            var rec = recData[i];
            var imgUrl = '/Items/' + rec.id + '/Images/Primary?fillHeight=455&fillWidth=304&quality=96';
            var itemUrl = '#/details?id=' + rec.id;

            html += '<div class="jf-recs-card">';
            html += '<a href="' + itemUrl + '" style="text-decoration: none; color: inherit;">';
            html += '<img src="' + imgUrl + '" class="jf-recs-img" alt="poster">';
            html += '<div class="jf-recs-title">' + rec.name + '</div>';
            html += '</a>';
            html += '</div>';
        }

        html += '</div></div>';
        section.innerHTML = html;

        container.insertBefore(section, container.firstChild);
    }

    function fetchRecommendations() {
        var uid = getUserId();
        if (!uid) return;

        var now = Date.now();
        if (recData && (now - lastFetchTime < 900000)) {
            renderUI();
            return;
        }

        if (isFetching) return;
        isFetching = true;

        var url = '/JellyFrame/mods/smart-recommendations/api/recommendations?userId=' + uid;

        fetch(url)
            .then(function(res) { 
                return res.json(); 
            })
            .then(function(data) {
                isFetching = false;
                recData = data;
                lastFetchTime = Date.now();
                renderUI();
            })
            .catch(function(err) {
                isFetching = false;
                console.error('Smart Recs Fetch Error:', err);
            });
    }

    function monitorDOM() {
        var container = document.querySelector('.sections.homeSectionsContainer');
        if (container && container.children.length > 0) {
            if (!document.getElementById('jf-smart-recs-section')) {
                fetchRecommendations();
            }
        }
    }

    function start() {
        injectStyles();
        
        var observer = new MutationObserver(function() {
            monitorDOM();
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        monitorDOM();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
