// Smart Recommendations Frontend Injector (Native Layout)
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
        s.innerHTML = '.jf-recs-native-scroller { overflow-x: auto; scroll-behavior: smooth; }';
        document.head.appendChild(s);
    }

    function renderUI() {
        var container = document.querySelector('.sections.homeSectionsContainer');
        
        if (!container || container.children.length === 0) return;
        if (document.getElementById('jf-smart-recs-section')) return;
        if (!recData || recData.length === 0) return;

        var currentServerId = ApiClient.serverId();

        var section = document.createElement('div');
        section.id = 'jf-smart-recs-section';
        section.className = 'verticalSection emby-scroller-container';
        
        var html = '';

        html += '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left">';
        html += '<h2 class="sectionTitle sectionTitle-cards">Recommended For You</h2>';
        html += '</div>';

        html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale emby-scroller jf-recs-native-scroller" data-centerfocus="true" data-scroll-mode-x="custom">';
        html += '<div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x animatedScrollX" style="white-space: nowrap;">';

        for (var i = 0; i < recData.length; i++) {
            var rec = recData[i];
            var imgUrl = '/Items/' + rec.id + '/Images/Primary?fillHeight=424&fillWidth=282&quality=96';
            var itemUrl = '#/details?id=' + rec.id + '&serverId=' + currentServerId;
            
            html += '<div data-index="' + i + '" data-isfolder="false" data-serverid="' + currentServerId + '" data-id="' + rec.id + '" data-type="Movie" data-mediatype="Video" class="card overflowPortraitCard card-hoverable card-withuserdata">';
            html += '<div class="cardBox cardBox-bottompadded">';
            
            html += '<div class="cardScalable">';
            html += '<div class="cardPadder cardPadder-overflowPortrait lazy-hidden-children"><span class="cardImageIcon material-icons movie" aria-hidden="true"></span></div>';
            
            html += '<a href="' + itemUrl + '" data-action="link" class="cardImageContainer coveredImage cardContent itemAction lazy lazy-image-fadein-fast" aria-label="' + rec.name + '" role="img" style="background-image: url(\'' + imgUrl + '\');"></a>';
            
            html += '<div class="cardOverlayContainer itemAction" data-action="link">';
            
            html += '<button is="paper-icon-button-light" class="cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light cardOverlayFab-primary" data-action="resume" title="Play">';
            html += '<span class="material-icons cardOverlayButtonIcon cardOverlayButtonIcon-hover play_arrow" aria-hidden="true"></span>';
            html += '</button>';
            
            html += '<div class="cardOverlayButton-br flex">';
            
            html += '<button is="emby-playstatebutton" type="button" data-action="none" class="cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light emby-button" data-id="' + rec.id + '" data-serverid="' + currentServerId + '" data-itemtype="Movie" data-played="false" title="Mark played">';
            html += '<span class="material-icons cardOverlayButtonIcon cardOverlayButtonIcon-hover check playstatebutton-icon-unplayed" aria-hidden="true"></span>';
            html += '</button>';
            
            html += '<button is="emby-ratingbutton" type="button" data-action="none" class="cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light emby-button" data-id="' + rec.id + '" data-serverid="' + currentServerId + '" data-itemtype="Movie" data-likes="" data-isfavorite="false" title="Add to favorites">';
            html += '<span class="material-icons cardOverlayButtonIcon cardOverlayButtonIcon-hover favorite" aria-hidden="true"></span>';
            html += '</button>';
            
            html += '<button is="paper-icon-button-light" class="cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light" data-action="menu" title="More">';
            html += '<span class="material-icons cardOverlayButtonIcon cardOverlayButtonIcon-hover more_vert" aria-hidden="true"></span>';
            html += '</button>';
            
            html += '</div>'; 
            html += '</div>'; 
            html += '</div>'; 
            
            html += '<div class="cardText cardTextCentered cardText-first">';
            html += '<bdi><a href="' + itemUrl + '" data-id="' + rec.id + '" data-serverid="' + currentServerId + '" data-type="Movie" class="itemAction textActionButton" title="' + rec.name + '" data-action="link">' + rec.name + '</a></bdi>';
            html += '</div>';
            
            html += '<div class="cardText cardTextCentered cardText-secondary"><bdi></bdi></div>';
            
            html += '</div>'; 
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
