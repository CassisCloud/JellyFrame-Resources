(function () {
    'use strict';

    function injectStyles() {
        if (document.getElementById('jf-coin-flip-styles')) return;
        var style = document.createElement('style');
        style.id = 'jf-coin-flip-styles';
        style.textContent = [
            "#jf-coin-flip-card { display: flex; flex-direction: column; color: #fff; font-family: 'Inter', system-ui, sans-serif; transition: opacity 0.4s ease, transform 0.4s ease; background: rgba(0,0,0,0.25); padding: 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }",

            ".jf-cf-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px; }",
            ".jf-cf-title { font-size: 1.4rem; font-weight: 600; display: flex; align-items: center; gap: 8px; letter-spacing: -0.01em; }",
            ".jf-cf-title .material-icons { color: #00a4dc; font-size: 1.8rem; }",
            
            ".jf-cf-game-area { display: flex; flex-direction: column; align-items: center; gap: 15px; position: relative; }",
            
            ".jf-cf-coin-wrapper { width: 100px; height: 100px; perspective: 1000px; margin: 10px 0; }",
            ".jf-cf-coin { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 0.1s linear; }",
            ".jf-cf-coin .jf-cf-side { width: 100%; height: 100%; position: absolute; border-radius: 50%; display: flex; align-items: center; justify-content: center; backface-visibility: hidden; font-weight: 800; font-size: 2.2rem; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.4); border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 0 15px rgba(255,255,255,0.1); }",
            
            ".jf-cf-side.jf-cf-heads { background: radial-gradient(circle, #ffd700, #ff8c00); }",
            ".jf-cf-side.jf-cf-tails { background: radial-gradient(circle, #b0c4de, #708090); transform: rotateX(180deg); }",
            
            ".jf-cf-result { font-size: 2.5rem; font-weight: 700; min-height: 1em; opacity: 1; transition: opacity 0.2s ease; }",
            ".jf-cf-result.jf-cf-hidden { opacity: 0; }",

            ".jf-cf-flip-button { background-color: #00a4dc; color: #fff; border: none; padding: 12px 30px; border-radius: 5px; cursor: pointer; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; font-size: 1rem; transition: background-color 0.2s ease, transform 0.1s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }",
            ".jf-cf-flip-button:hover { background-color: #01c4ff; }",
            ".jf-cf-flip-button:active { transform: translateY(2px); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }",
            ".jf-cf-flip-button:disabled { background-color: #555; cursor: default; opacity: 0.6; }",
            
            ".jf-cf-coin-flip { animation: cf-spin 0.4s linear infinite; }",
            
            "@keyframes cf-spin { 0% { transform: rotateX(0deg); } 100% { transform: rotateX(360deg); } }",
            
            "@media(max-width: 768px) {",
            "  .jf-cf-title { font-size: 1.1rem; }",
            "  .jf-cf-coin-wrapper { width: 80px; height: 80px; }",
            "  .jf-cf-side { font-size: 1.8rem; }",
            "  .jf-cf-result { font-size: 2rem; }",
            "}"
        ].join('\n');
        document.head.appendChild(style);
    }

    var isFlipping = false;

    function handleFlipAction(coinEl, resultEl, buttonEl) {
        if (isFlipping) return;
        isFlipping = true;
        
        buttonEl.disabled = true;
        buttonEl.textContent = 'Flipping...';
        resultEl.classList.add('jf-cf-hidden');
        coinEl.classList.add('jf-cf-coin-flip');
        
        var flipResult = Math.random() < 0.5 ? 'Heads' : 'Tails';

        setTimeout(function() {
            coinEl.classList.remove('jf-cf-coin-flip');
            
            if (flipResult === 'Heads') {
                coinEl.style.transform = 'rotateX(0deg)';
            } else {
                coinEl.style.transform = 'rotateX(180deg)';
            }
            
            setTimeout(function() {
                resultEl.textContent = flipResult.toUpperCase();
                resultEl.classList.remove('jf-cf-hidden');
                
                buttonEl.disabled = false;
                buttonEl.textContent = 'FLIP AGAIN';
                isFlipping = false;
            }, 100);

        }, 1500);
    }

    function buildCard(targetContainer) {
        if (document.getElementById('jf-coin-flip-card')) return;
        
        var card = document.createElement('div');
        card.id = 'jf-coin-flip-card';
        card.className = 'app col-6';

        card.innerHTML = [
            '<div class="jf-cf-top">',
            '  <div class="jf-cf-title"><span class="material-icons">monetization_on</span> Heads or Tails</div>',
            '</div>',
            '<div class="jf-cf-game-area">',
            '  <div class="jf-cf-coin-wrapper">',
            '    <div class="jf-cf-coin" id="jf-cf-coin-visual">',
            '      <div class="jf-cf-side jf-cf-heads">H</div>',
            '      <div class="jf-cf-side jf-cf-tails">T</div>',
            '    </div>',
            '  </div>',
            '  <div class="jf-cf-result jf-cf-hidden" id="jf-cf-result-text">--</div>',
            '  <button class="jf-cf-flip-button" id="jf-cf-button">FLIP COIN</button>',
            '</div>'
        ].join('');
        
        targetContainer.appendChild(card);
        
        var buttonEl = document.getElementById('jf-cf-button');
        var coinEl = document.getElementById('jf-cf-coin-visual');
        var resultEl = document.getElementById('jf-cf-result-text');
        
        if (buttonEl && coinEl && resultEl) {
            buttonEl.addEventListener('click', function() {
                handleFlipAction(coinEl, resultEl, buttonEl);
            });
        }
    }

    function tryInject(attempts) {
        attempts = attempts || 0;
        if (document.getElementById('jf-coin-flip-card')) return;
        if (attempts > 20) return;

        var appArea = document.getElementById('app-area');

        if (!appArea) {
            setTimeout(function() { tryInject(attempts + 1); }, 500);
            return;
        }

        buildCard(appArea);
    }

    function init() {
        injectStyles();
        
        var checkPage = function() {
            if (window.location.hash.indexOf('home') !== -1 || window.location.hash === '' || window.location.hash === '#/') {
                tryInject(0);
            }
        };
        
        window.addEventListener('hashchange', checkPage);
        document.addEventListener('viewshow', checkPage);
        
        window.addEventListener('jfAppAreaReady', function() {
            tryInject(0);
        });
        
        checkPage();
    }

    init();

})();
