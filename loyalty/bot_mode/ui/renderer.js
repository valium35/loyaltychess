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
            loyaltyMap = {} // BetrayalJudge'dan gelen durum listesi
        } = renderData;

        boardEl.innerHTML = '';

        for (let i = 0; i < 64; i++) {
            const sq = document.createElement('div');
            const row = Math.floor(i / 8);
            const col = i % 8;

            // Temel kare sınıfı
            sq.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
            sq.dataset.idx = i;

            // --- 🚩 SADAKAT GÖRSELLERİ (Senin CSS Sınıflarınla Eşleşme) ---
            const state = loyaltyMap[i]; // 'PURPLE', 'BLUE' veya 'RED'

            if (state === 'PURPLE') {
                sq.classList.add('feda-purple'); // Mor: Feda
            } 
            else if (state === 'BLUE') {
                sq.classList.add('threat-blue'); // Mavi: Tehdit
            } 
            else if (state === 'RED') {
                sq.classList.add('betrayal-red'); // Kırmızı: İhanet Alarmı

                // ⚠️ CSS'indeki zıplayan ünlem ikonu
                const alertIcon = document.createElement('div');
                alertIcon.className = 'loyalty-alert-icon';
                alertIcon.innerHTML = '⚠️'; 
                sq.appendChild(alertIcon);
            }

            // 1. Son hamle highlight (Eğer kare feda/ihanet değilse daha belirgin olur)
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
                
                // Eğer taş KIRMIZI (İhanet) aşamasındaysa senin 'traitor-piece' efektini ekle
                if (state === 'RED') {
                    pEl.classList.add('traitor-piece');
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