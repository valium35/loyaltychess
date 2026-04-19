// ui/renderer.js - GÖRSEL MOTOR (Saf Boyacı)

export const Renderer = {
    /**
     * renderData: { board, turn, lastMove, selected, moves }
     */
    render(renderData = {}) {
        const boardEl = document.getElementById('chess-board');
        if (!boardEl) return;

        const {
            board = [],
            lastMove = null,
            selected = null,
            moves = []
        } = renderData;

        boardEl.innerHTML = '';

        for (let i = 0; i < 64; i++) {
            const sq = document.createElement('div');
            const row = Math.floor(i / 8);
            const col = i % 8;

            sq.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
            sq.dataset.idx = i;

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
                sq.appendChild(pEl);
            }

            // 5. Click event
            sq.onclick = () => {
                console.log("Kareye tıklandı:", i); // Test için bunu ekle
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