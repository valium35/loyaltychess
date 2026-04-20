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
            loyaltyMap = {}
        } = renderData;

        boardEl.innerHTML = '';

        for (let i = 0; i < 64; i++) {
            const sq = document.createElement('div');
            const row = Math.floor(i / 8);
            const col = i % 8;

            sq.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
            sq.dataset.idx = i;

            // --- 🚩 YENİ SADAKAT ZİNCİRİ (Mor -> Mavi -> Kırmızı) ---
            const state = loyaltyMap[i]; 

            if (state === 'PURPLE') {
                sq.classList.add('feda-purple'); // Aktif Feda
            } 
            else if (state === 'BLUE') {
                sq.classList.add('threat-blue'); // Tehdit/Terk
            } 
            else if (state === 'RED') {
                sq.classList.add('betrayal-red'); // İHANET SINIRI

                // ⚠️ Kritik uyarı ikonu (Sadece Kırmızıda)
                const alertIcon = document.createElement('div');
                alertIcon.className = 'loyalty-alert-icon';
                alertIcon.innerHTML = '⚠️'; 
                sq.appendChild(alertIcon);
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

            // 3. Valid move noktaları
            if (moves.includes(i)) {
                const dot = document.createElement('div');
                dot.className = 'valid-move-dot';
                sq.appendChild(dot);
            }

            // 4. Taş çizimi
            if (piece) {
                const pEl = document.createElement('div');
                pEl.className = `piece ${piece}`;
                
                // Kırmızı aşamada taş titremeye başlar
                if (state === 'RED') {
                    pEl.classList.add('traitor-piece');
                }
                
                sq.appendChild(pEl);
            }

            // 5. Click event
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