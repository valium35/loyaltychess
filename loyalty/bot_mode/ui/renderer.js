// ui/renderer.js - GÖRSEL MOTOR
import { GameCore } from '../core/game_core.js';

export const Renderer = {
    // 1. TAHTAYI SIFIRDAN ÇİZ
    render(selectedSquare = null) {
        const boardEl = document.getElementById('chess-board');
        if (!boardEl) return;

        boardEl.innerHTML = ''; // Eski tahtayı temizle

        for (let i = 0; i < 64; i++) {
            const sq = document.createElement('div');
            
            // Kare rengi (Senin eski mantığın)
            const row = Math.floor(i / 8);
            const col = i % 8;
            sq.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
            
            // Seçili kare parlaması
            if (selectedSquare === i) sq.classList.add('active');

            // Taşı Çiz
            const piece = GameCore.board[i];
            if (piece) {
                const pEl = document.createElement('div');
                pEl.className = `piece ${piece}`;
                sq.appendChild(pEl);
            }

            // Tıklama olayını PlayerController'a paslayacağız (Birazdan)
            sq.onclick = () => {
                // Bu kısım 4. adımda (Player Controller) dolacak
                window.dispatchEvent(new CustomEvent('squareClicked', { detail: i }));
            };

            boardEl.appendChild(sq);
        }
        
        this.updateStatus();
    },

    // 2. DURUM PANELİNİ GÜNCELLE
    updateStatus() {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerText = GameCore.turn === 'w' ? "SIRA BEYAZDA" : "LOYALTYBRAIN DÜŞÜNÜYOR...";
        }
    }
};