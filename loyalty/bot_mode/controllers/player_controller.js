// controllers/player_controller.js - OYUNCU KUMANDASI
import { GameCore } from '../core/game_core.js';
import { EventSystem } from '../core/event_system.js';
import { Renderer } from '../ui/renderer.js'; // Renderer'ı ekledik

export const PlayerController = {
    selectedSquare: null,

    init() {
        window.addEventListener('squareClicked', (e) => {
            this.handleInput(e.detail);
        });
    },

    handleInput(idx) {
        // Sıra beyazda değilse veya oyun bittiyse işlem yapma
        if (GameCore.turn !== 'w' || GameCore.checkGameOver()) return;

        const piece = GameCore.board[idx];

        // --- 1. SEÇİM MODU (Kendi taşımıza tıklarsak) ---
        if (piece && piece.startsWith('w')) {
            this.selectedSquare = idx;
            const legalMoves = GameCore.getLegalMoves(idx);
            
            EventSystem.add({ 
                type: 'triggerRender', 
                detail: { selected: idx, moves: legalMoves } 
            });
            return;
        }

        // --- 2. HAMLE MODU (Bir taş seçiliyse ve hedef kareye tıklandıysa) ---
        if (this.selectedSquare !== null) {
            const legalMoves = GameCore.getLegalMoves(this.selectedSquare);

            if (legalMoves.includes(idx)) {
                const movingPiece = GameCore.board[this.selectedSquare];
                const targetRow = 0; // Beyaz piyonlar için 0. satır (a8-h8 arası)

                // 🔴 TERFİ KONTROLÜ (Piyon son sıraya ulaştı mı?)
                if (movingPiece === 'w-p' && Math.floor(idx / 8) === targetRow) {
                    // Modal açılınca seçimi bekle
                    Renderer.showPromotionModal('w', (promotedPiece) => {
                        const moveData = GameCore.execute(this.selectedSquare, idx, promotedPiece);
                        this.selectedSquare = null;
                        EventSystem.add({ type: 'moveExecuted', detail: moveData });
                    });
                } else {
                    // ✅ NORMAL HAMLE
                    const moveData = GameCore.execute(this.selectedSquare, idx);
                    this.selectedSquare = null;
                    EventSystem.add({ type: 'moveExecuted', detail: moveData });
                }
            } else {
                // Geçersiz kareye tıklandı: Seçimi temizle
                this.selectedSquare = null;
                EventSystem.add({ 
                    type: 'triggerRender', 
                    detail: { selected: null, moves: [] } 
                });
            }
        }
    }
};