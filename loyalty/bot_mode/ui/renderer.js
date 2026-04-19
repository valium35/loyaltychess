// ui/renderer.js - GÖRSEL MOTOR (Logic'ten Arındırılmış)
import { GameCore } from '../core/game_core.js';

export const Renderer = {
    /**
     * Manager artık tek bir obje gönderiyor: { selected, moves }
     * Biz bu objeyi parçalayarak (destructuring) içeri alıyoruz.
     */
    render(renderData = {}) {
        const boardEl = document.getElementById('chess-board');
        if (!boardEl) return;

        // 🚩 PARAMETRE DÜZELTMESİ: Objeden verileri çekiyoruz
        const selectedSquare = renderData.selected !== undefined ? renderData.selected : null;
        const validMoves = renderData.moves || [];

        boardEl.innerHTML = ''; 

        // Core'an taze verileri alıyoruz
        const board = GameCore.board;
        const activeBetrayals = GameCore.activeBetrayals;
        const threatHistory = GameCore.threatHistory;
        const lastMove = GameCore.lastMove;

        for (let i = 0; i < 64; i++) {
            const sq = document.createElement('div');
            const row = Math.floor(i / 8);
            const col = i % 8;
            
            sq.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
            sq.dataset.idx = i;

            // 1. Son Hamle İşareti (Fiziksel iz)
            if (lastMove && (lastMove.from === i || lastMove.to === i)) {
                sq.classList.add('last-move');
            }

            // 2. İhanet ve Tehdit Renkleri
            const piece = board[i];
            const betrayalEntry = activeBetrayals.find(b => b.sq === i);
            const hasRawThreat = threatHistory[i] !== null;

            if (piece) {
                if (betrayalEntry) {
                    sq.classList.add('betrayal-active'); 
                    sq.classList.add(`target-${betrayalEntry.target}`);
                } 
                else if (hasRawThreat) {
                    sq.classList.add('raw-threat'); 
                }
            }

            // 3. 🚩 SEÇİLİ VE NOKTALAR (BURASI DÜZELDİ)
            if (selectedSquare === i) sq.classList.add('active');

            if (validMoves && validMoves.includes(i)) {
                const dot = document.createElement('div');
                dot.className = 'valid-move-dot'; 
                sq.appendChild(dot);
            }

            // 4. Taş Çizimi
            if (piece) {
                const pEl = document.createElement('div');
                pEl.className = `piece ${piece}`;
                if (betrayalEntry) pEl.classList.add('hain-piece');
                sq.appendChild(pEl);
            }

            // 5. Tıklama Olayı
            sq.onclick = () => {
                window.dispatchEvent(new CustomEvent('squareClicked', { detail: i }));
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