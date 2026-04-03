// ui/renderer.js - GÖRSEL MOTOR
import { GameCore } from '../core/game_core.js';

export const Renderer = {
    // 1. TAHTAYI SIFIRDAN ÇİZ (validMoves parametresini ekledik!)
    render(selectedSquare = null, validMoves = []) {
        const boardEl = document.getElementById('chess-board');
        if (!boardEl) return;

        boardEl.innerHTML = ''; // Eski tahtayı temizle

        for (let i = 0; i < 64; i++) {
            const sq = document.createElement('div');
            
            const row = Math.floor(i / 8);
            const col = i % 8;
            sq.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
            
            // Seçili kare parlaması
            if (selectedSquare === i) sq.classList.add('active');

            // 🟢 NOKTALARI ÇİZ (validMoves artık tanımlı!)
            if (validMoves && validMoves.includes(i)) {
                const dot = document.createElement('div');
                dot.className = 'valid-move-dot'; 
                sq.appendChild(dot);
            }

            // Taşı Çiz
            const piece = GameCore.board[i];
            if (piece) {
                const pEl = document.createElement('div');
                pEl.className = `piece ${piece}`;
                sq.appendChild(pEl);
            }

            // Tıklama Olayı
            sq.onclick = () => {
                window.dispatchEvent(new CustomEvent('squareClicked', { detail: i }));
            };

            boardEl.appendChild(sq);
        }
    },
    showPromotionModal(color, callback) {
    const modal = document.createElement('div');
    modal.className = 'promotion-modal';
    const pieces = ['q', 'r', 'b', 'n']; // Vezir, Kale, Fil, At
    
    pieces.forEach(type => {
        const btn = document.createElement('div');
        // CSS'te .piece.w-q gibi tanımların olduğunu varsayıyoruz
        btn.className = `piece ${color}-${type} promo-option`; 
        
        btn.onclick = () => {
            console.log("Seçilen Terfi Taşı:", type);
            modal.remove(); // Modalı kapat
            callback(`${color}-${type}`); // Seçilen taşı geri gönder
        };
        modal.appendChild(btn);
    });
    document.body.appendChild(modal);

}
};