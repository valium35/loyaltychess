// ui/renderer.js - GÖRSEL MOTOR
console.log("RENDERER TETİKLENDİ - Tahta Çiziliyor...");
import { GameCore } from '../core/game_core.js';
import { BetrayalJudge } from '../core/betrayal_judge.js';

export const Renderer = {
    // 1. TAHTAYI SIFIRDAN ÇİZ
    render(selectedSquare = null, validMoves = []) {
        const boardEl = document.getElementById('chess-board');
        if (!boardEl) return;

        boardEl.innerHTML = ''; // Eski tahtayı temizle

        for (let i = 0; i < 64; i++) {
            const sq = document.createElement('div');
            
            const row = Math.floor(i / 8);
            const col = i % 8;
            
            // --- 1. TEMEL SINIFLAR ---
            sq.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
            
            // --- 2. SON HAMLE İŞARETLEYİCİ ---
            const lastMove = GameCore.lastMove; 
            if (lastMove && (lastMove.from === i || lastMove.to === i)) {
                sq.classList.add('last-move');
            }

            // --- 3. İHANET VE TEHDİT DURUMU (RENKLENDİRME) ---
            // Bu kısım BetrayalJudge dedektifinden bilgi alır
            const status = BetrayalJudge.getSquareStatus(GameCore, i);
            if (GameCore.board[i] && status > 0) {
    console.log(`Kare ${i}: Taş ${GameCore.board[i]}, Durum: ${status}`);
}
            if (status === 1) {
                sq.classList.add('raw-threat');      // Mavi (Tehdit var ama korunuyor)
            } else if (status === 2) {
                sq.classList.add('threatened-square'); // Koyu Kırmızı (İhanet Riski!)
            console.log(`Kare ${i} KIRMIZI, ama listede mi?: ${GameCore.activeBetrayals.includes(i)}`);
            }

            // --- 4. SEÇİLİ KARE PARLAMASI ---
            if (selectedSquare === i) sq.classList.add('active');

            // --- 5. İHANET İPUCU (AKTİF AJAN İŞARETİ) ---
            if (GameCore.betrayalPieceIdx === i) {
                sq.classList.add('betrayal-hint');
            }

            // --- 6. GEÇERLİ HAMLE NOKTALARI ---
            if (validMoves && validMoves.includes(i)) {
                const dot = document.createElement('div');
                dot.className = 'valid-move-dot'; 
                sq.appendChild(dot);
            }

            // --- 7. TAŞI ÇİZ ---
            const piece = GameCore.board[i];
            if (piece) {
                const pEl = document.createElement('div');
                pEl.className = `piece ${piece}`;
                sq.appendChild(pEl);
            }

            // --- 8. TIKLAMA OLAYI ---
            sq.onclick = () => {
                window.dispatchEvent(new CustomEvent('squareClicked', { detail: i }));
            };

            boardEl.appendChild(sq);
        }
    },

    // 2. TERFİ MODALINI GÖSTER
    showPromotionModal(color, callback) {
        const modal = document.createElement('div');
        modal.className = 'promotion-modal';
        const pieces = ['q', 'r', 'b', 'n']; 
        
        pieces.forEach(type => {
            const btn = document.createElement('div');
            btn.className = `piece ${color}-${type} promo-option`; 
            
            btn.onclick = () => {
                modal.remove(); 
                callback(`${color}-${type}`); 
            };
            modal.appendChild(btn);
        });
        document.body.appendChild(modal);
    }
};