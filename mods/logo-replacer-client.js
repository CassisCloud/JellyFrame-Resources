(function() {
    'use strict';
  
    var logoUrl = '{{CUSTOM_LOGO_URL}}';

    if (!logoUrl || logoUrl.trim() === '' || logoUrl === '{{' + 'CUSTOM_LOGO_URL' + '}}') {
        logoUrl = 'https://cdn.jsdelivr.net/gh/Jellyfin-PG/JellyFrame-Resources@main/mods/media-logo.png';
    }

    var css = '.pageTitleWithDefaultLogo { ' +
              'background-image: url("' + logoUrl + '") !important; ' +
              'background-size: contain !important; ' +
              'background-repeat: no-repeat !important; ' +
              'background-position: center left !important; ' +
              '}';

    var style = document.createElement('style');
    style.id = 'jf-custom-logo-style';
    style.textContent = css;

    document.head.appendChild(style);
})();
