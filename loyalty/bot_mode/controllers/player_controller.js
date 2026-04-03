// controllers/player_controller.js - OYUNCU KUMANDASI
import { GameCore } from '../core/game_core.js';
import { EventSystem } from '../core/event_system.js';

export const PlayerController = {
    selectedSquare: null,

    // 1. TIKLAMA OLAYINI DİNLE
    init() {
        window.addEventListener('squareClicked', (e) => {
            this.handleInput(e.detail);
        });
    },

    // 2. GİRİŞİ YÖNET (Eski handleSquareClick mantığı)
    handleInput(idx) {
        // Sıra beyazda değilse oyuncu bir şey yapamaz
        if (GameCore.turn !== 'w') return;

        if (this.selectedSquare === null) {
            // İlk tıklama: Kendi taşını mı seçti?
            if (GameCore.board[idx] && GameCore.board[idx].startsWith('w')) {
                this.selectedSquare = idx;
                // Renderer'a "bu kareyi parlat" haberi yolla
                EventSystem.add({ type: 'triggerRender', detail: idx });
            }
        } else {
            // İkinci tıklama: Hedef kare
            const legalMoves = GameCore.getLegalMoves(this.selectedSquare);

            if (legalMoves.includes(idx)) {
                // HAMLE YASAL! Core'a hamleyi yaptır
                const moveData = GameCore.execute(this.selectedSquare, idx);
               
                window.dispatchEvent(new CustomEvent('moveExecuted', { detail: moveData }));
                // Hamle yapıldı haberi fırlat
                EventSystem.add({ type: 'moveExecuted', detail: moveData });
                
                this.selectedSquare = null;
            } else {
                // Geçersiz hamle veya başka bir taş seçimi
                if (GameCore.board[idx] && GameCore.board[idx].startsWith('w')) {
                    this.selectedSquare = idx;
                    EventSystem.add({ type: 'triggerRender', detail: idx });
                } else {
                    this.selectedSquare = null;
                    EventSystem.add({ type: 'triggerRender', detail: null });
                }
            }
        }
    }
};