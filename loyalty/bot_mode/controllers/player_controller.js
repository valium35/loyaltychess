// controllers/player_controller.js - CLEAN INPUT LAYER

import { GameCore } from '../core/game_core.js';
import { EventBus } from '../core/event_bus.js'; // 🚩 EventBus'ı import etmeyi unutma!

export const PlayerController = {
    selectedSquare: null,

    init() {
        // Renderer'dan gelen saf tıklamayı dinliyoruz
        window.addEventListener('squareClicked', (e) => {
            this.handleInput(e.detail);
        });

        console.log("⚪ Oyuncu Kumandası Aktif (EventBus Modu).");
    },

    handleInput(idx) {
        if (GameCore.turn !== 'w' || GameCore.checkGameOver()) return;

        const legalMovesForSquare = GameCore.getLegalMoves(idx);

        // SELECTION MODE
        if (this.selectedSquare === null) {
            if (legalMovesForSquare.length > 0) {
                this.select(idx, legalMovesForSquare);
            }
            return;
        }

        // MOVE MODE
        const legalMoves = GameCore.getLegalMoves(this.selectedSquare);

        if (legalMoves.includes(idx)) {
            this.executeMove(this.selectedSquare, idx);
        } else {
            if (legalMovesForSquare.length > 0) {
                this.select(idx, legalMovesForSquare);
            } else {
                this.deselect();
            }
        }
    },

    select(idx, moves) {
        this.selectedSquare = idx;

        // 🔥 Güzelleştirme: window.dispatchEvent yerine EventBus
        EventBus.emit('triggerRender', {
            selected: idx,
            moves: moves
        }, "PlayerController");
    },

    deselect() {
        this.selectedSquare = null;

        EventBus.emit('triggerRender', {
            selected: null,
            moves: []
        }, "PlayerController");
    },

    executeMove(from, to) {
        const piece = GameCore.board[from];

        // promotion check
        if (piece === 'w-p' && Math.floor(to / 8) === 0) {
            EventBus.emit('requestPromotion', { from, to }, "PlayerController");
            return;
        }

        this.finalizeMove(from, to);
    },

    finalizeMove(from, to, promotion = null) {
        this.selectedSquare = null;

        // 🔥 En kritik nokta: Hamle talebini otobüse bindiriyoruz
        EventBus.emit('requestPlayerMove', { 
            from, 
            to, 
            promotion 
        }, "PlayerController");
    }
};