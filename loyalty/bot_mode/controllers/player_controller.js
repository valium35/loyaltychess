// controllers/player_controller.js - OYUNCU KUMANDASI
import { GameCore } from '../core/game_core.js';
import { EventSystem } from '../core/event_system.js';
import { Renderer } from '../ui/renderer.js';

export const PlayerController = {
    selectedSquare: null,

    init() {
        window.addEventListener('squareClicked', (e) => {
            this.handleInput(e.detail);
        });
    },

    handleInput(idx) {
        if (GameCore.turn !== 'w' || GameCore.checkGameOver()) return;

        const piece = GameCore.board[idx];
        const legalMovesForThisSquare = GameCore.getLegalMoves(idx);

        // --- 1. SEÇİM MODU (Kendi taşımız VEYA İhanet Eden taş) ---
        // Kilit buradaydı; artık sadece 'w'ye bakmıyoruz, hamle vizesi var mı ona bakıyoruz.
        if (legalMovesForThisSquare.length > 0 && this.selectedSquare === null) {
            this.selectedSquare = idx;
            
            EventSystem.add({ 
                type: 'triggerRender', 
                detail: { selected: idx, moves: legalMovesForThisSquare } 
            });
            return;
        }

        // --- 2. HAMLE MODU ---
        if (this.selectedSquare !== null) {
            const legalMoves = GameCore.getLegalMoves(this.selectedSquare);

            if (legalMoves.includes(idx)) {
                const movingPiece = GameCore.board[this.selectedSquare];
                // İhanet hamlesi mi? (Seçtiğim taş 'b' ile başlıyorsa evet)
                const isBetrayal = movingPiece.startsWith('b');

                // 🔴 TERFİ KONTROLÜ (Sadece kendi piyonun için geçerli)
                if (movingPiece === 'w-p' && Math.floor(idx / 8) === 0) {
                    Renderer.showPromotionModal('w', (promotedPiece) => {
                        const moveData = GameCore.execute(this.selectedSquare, idx, promotedPiece);
                        this.selectedSquare = null;
                        EventSystem.add({ type: 'moveExecuted', detail: moveData });
                    });
                } else {
                    // ✅ NORMAL VEYA İHANET HAMLESİ
                    const moveData = GameCore.execute(this.selectedSquare, idx);
                    this.selectedSquare = null;
                    EventSystem.add({ type: 'moveExecuted', detail: moveData });
                }
            } else {
                // Geçersiz yere tıklandıysa veya başka bir kendi taşına tıklandıysa:
                // Eğer tıkladığın yeni yer de geçerli bir başlangıçsa (kendi taşın veya hain), orayı seç.
                if (legalMovesForThisSquare.length > 0) {
                    this.selectedSquare = idx;
                    EventSystem.add({ 
                        type: 'triggerRender', 
                        detail: { selected: idx, moves: legalMovesForThisSquare } 
                    });
                } else {
                    this.selectedSquare = null;
                    EventSystem.add({ 
                        type: 'triggerRender', 
                        detail: { selected: null, moves: [] } 
                    });
                }
            }
        }
    }
};