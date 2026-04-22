function fetchAndInjectRecommendations(userId) {
    var url = '/JellyFrame/mods/smart-recommendations/api/recommendations?userId=' + userId;

    fetch(url)
        .then(function(response) { 
            return response.json(); 
        })
        .then(function(recommendations) {
            if (!recommendations || recommendations.length === 0) { return; }

            var homeSection = document.querySelector('.homePage-section1'); 
            if (!homeSection) { return; }

            var recContainer = document.createElement('div');
            recContainer.style = 'margin-top: 2em; padding: 0 5%;';
            
            var html = '<h2 style="font-size: 1.5em; margin-bottom: 10px;">Recommended For You</h2>';
            html += '<div style="display: flex; gap: 15px; overflow-x: auto; padding-bottom: 10px;">';
            
            recContainer.innerHTML = html;
            var itemsDiv = recContainer.querySelector('div');

            for (var i = 0; i < recommendations.length; i++) {
                var rec = recommendations[i];
                var card = document.createElement('div');
                card.style = 'min-width: 150px; cursor: pointer; transition: transform 0.2s;';
                
                var imgUrl = '/Items/' + rec.id + '/Images/Primary?quality=90&maxWidth=400';
                
                card.innerHTML = '<img src="' + imgUrl + '" style="width: 100%; border-radius: 8px; aspect-ratio: 2/3; object-fit: cover;" alt="poster">' + 
                                 '<div style="text-align: center; margin-top: 8px; font-weight: bold; font-size: 0.9em;">' + rec.name + '</div>';
                
                (function(itemId) {
                    card.addEventListener('click', function() {
                        window.location.hash = '#!/details?id=' + itemId;
                    });
                })(rec.id);

                card.addEventListener('mouseenter', function(e) { e.currentTarget.style.transform = 'scale(1.05)'; });
                card.addEventListener('mouseleave', function(e) { e.currentTarget.style.transform = 'scale(1)'; });

                itemsDiv.appendChild(card);
            }

            homeSection.insertAdjacentElement('afterend', recContainer);
        })
        .catch(function(error) {
            console.error('JellyFrame Recs Error: ', error);
        });
}

if (typeof ApiClient !== 'undefined') {
    var currentUserId = ApiClient.getCurrentUserId(); 
    if (currentUserId) {
        fetchAndInjectRecommendations(currentUserId);
    }
}
