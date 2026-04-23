// ui/renderer.js - GÖRSEL MOTOR (Saf Boyacı)

export const Renderer = {
    /**
     * renderData: { board, turn, lastMove, selected, moves, loyaltyMap }
     */
    render(renderData = {}) {
        const boardEl = document.getElementById('chess-board');
        if (!boardEl) return;

        const {
            board = [],
            lastMove = null,
            selected = null,
            moves = [],
            loyaltyMap = {} // BetrayalJudge'dan gelen durum listesi (PURPLE, BLUE, RED, LOCKED)
        } = renderData;

        boardEl.innerHTML = '';

        for (let i = 0; i < 64; i++) {
            const sq = document.createElement('div');
            const row = Math.floor(i / 8);
            const col = i % 8;

            // Temel kare sınıfı
            sq.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
            sq.dataset.idx = i;

            // --- 🚩 SADAKAT GÖRSELLERİ ---
            const state = loyaltyMap[i]; 

            if (state === 'PURPLE') {
                sq.classList.add('feda-purple'); // Mor: Feda
            } 
            else if (state === 'BLUE') {
                sq.classList.add('threat-blue'); // Mavi: Tehdit
            } 
            else if (state === 'RED') {
                sq.classList.add('betrayal-red'); // Kırmızı: İhanet Alarmı

                // CSS'indeki zıplayan ünlem ikonu
                const alertIcon = document.createElement('div');
                alertIcon.className = 'loyalty-alert-icon';
                alertIcon.innerHTML = '⚠️'; 
                sq.appendChild(alertIcon);
            }
            // --- 🚩 YENİ: SARAY MUHAFIZI (LOCKED) GÖRSELİ ---
            else if (state === 'LOCKED') {
                sq.classList.add('locked'); // CSS'de özel efekt vermek istersen
                
                const lockIcon = document.createElement('div');
                lockIcon.className = 'loyalty-lock-icon';
                lockIcon.style.cssText = "position:absolute; font-size:1.5rem; z-index:10; pointer-events:none;";
                lockIcon.innerHTML = '🚫'; 
                sq.appendChild(lockIcon);
            }

            // 1. Son hamle highlight
            if (lastMove && (lastMove.from === i || lastMove.to === i)) {
                sq.classList.add('last-move');
            }

            const piece = board[i];

            // 2. Seçili kare
            if (selected === i) {
                sq.classList.add('active');
            }

            // 3. Geçerli hamle noktaları
            if (moves.includes(i)) {
                const dot = document.createElement('div');
                dot.className = 'valid-move-dot';
                sq.appendChild(dot);
            }

            // 4. Taş çizimi ve Hain Efektleri
            if (piece) {
                const pEl = document.createElement('div');
                pEl.className = `piece ${piece}`;
                
                // Eğer taş KIRMIZI aşamasındaysa traitor efektini ekle
                if (state === 'RED') {
                    pEl.classList.add('traitor-piece');
                }
                
                // Eğer kilitliyse taşı biraz şeffaf yapabiliriz (opsiyonel)
                if (state === 'LOCKED') {
                    pEl.style.opacity = "0.7";
                    pEl.style.filter = "grayscale(80%)";
                }
                
                sq.appendChild(pEl);
            }

            // 5. Tıklama Olayı
            sq.onclick = () => {
                window.dispatchEvent(
                    new CustomEvent('squareClicked', { detail: i })
                );
            };

            boardEl.appendChild(sq);
        }
    },

    showPromotionModal(color, callback) {
        const modal = document.createElement('div');
        modal.className = 'promotion-modal';

        const pieces = ['q', 'r', 'b', 'n'];

        pieces.forEach(type => {
            const btn = document.createElement('div');
            const pieceClass = `${color}-${type}`;

            btn.className = `piece ${pieceClass} promo-option`;

            btn.onclick = () => {
                modal.remove();
                callback(pieceClass);
            };

            modal.appendChild(btn);
        });

        document.body.appendChild(modal);
    }
};