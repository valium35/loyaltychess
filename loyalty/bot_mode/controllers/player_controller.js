// controllers/player_controller.js - CLEAN INPUT LAYER (Betrayal Proxy)

import { GameCore } from '../core/game_core.js';
import { EventBus } from '../core/event_bus.js';
import { BetrayalJudge } from '../core/betrayal_judge.js';

export const PlayerController = {
    selectedSquare: null,

    init() {
        window.addEventListener('squareClicked', (e) => {
            this.handleInput(e.detail);
        });
        console.log("⚪ Oyuncu Kumandası Aktif (Hain Gözlüğü + Kilit Koruması).");
    },

    handleInput(idx) {
        if (GameCore.turn !== 'w' || GameCore.checkGameOver()) return;

        const piece = GameCore.board[idx];
        const registryState = BetrayalJudge.neglectRegistry[idx];
        const isRed = (registryState === 'RED');
        const isLocked = (registryState === 'LOCKED');
        
        // --- 🚩 KRİTİK ENGEL: KİLİTLİ TAŞ KONTROLÜ ---
        if (isLocked) {
            console.warn("🛡️ Bu taş bir 'Saray Muhafızı' veya Şah Çatalı altında. Kontrol edilemiyor!");
            this.deselect(); // Eğer seçili bir şey varsa temizle
            return; 
        }

        const isMyPiece = piece && piece.startsWith('w');
        const canControl = isMyPiece || isRed;

        // SELECTION MODE (Seçim Aşaması)
        if (this.selectedSquare === null) {
            if (canControl) {
                // Hain ise özel filtreli hamleleri, değilse standart hamleleri al
                let moves = isRed ? this.getHainMoves(idx) : GameCore.getLegalMoves(idx);
                
                if (moves.length > 0) {
                    this.select(idx, moves);
                    if(isRed) console.warn(`💀 HAİN SEÇİLDİ: Operasyon serbest, direkt şah çekmek yasak!`);
                }
            }
            return;
        }

        // MOVE MODE (Hamle Aşaması)
        const currentRegistry = BetrayalJudge.neglectRegistry[this.selectedSquare];
        const isSelectedRed = (currentRegistry === 'RED');
        
        const legalMoves = isSelectedRed ? this.getHainMoves(this.selectedSquare) : GameCore.getLegalMoves(this.selectedSquare);

        if (legalMoves.includes(idx)) {
            this.executeMove(this.selectedSquare, idx);
        } else {
            // Tıklanan yer yeni bir kontrol edilebilir taş ise ona geç
            if (canControl) {
                let nextMoves = isRed ? this.getHainMoves(idx) : GameCore.getLegalMoves(idx);
                if (nextMoves.length > 0) this.select(idx, nextMoves);
            } else {
                this.deselect();
            }
        }
    },

    /**
     * HAİN HAREKET KISITLAMALARI
     */
    getHainMoves(idx) {
        const rawMoves = GameCore.getPieceMoves(idx, GameCore.board, true);
        
        return rawMoves.filter(toIdx => {
            const targetPiece = GameCore.board[toIdx];
            
            // 1. Kendi yeni efendisinin (Beyaz) taşlarını yiyemez
            if (targetPiece && targetPiece.startsWith('w')) return false;

            // 2. DİREKT ŞAH ÇEKEMEZ: Hedef karede şah varsa gidemez
            if (targetPiece && targetPiece.endsWith('-k')) return false;
            
            // 3. AÇARAK ŞAH ÇEKEMEZ: (Senin kararınla serbest bırakıldı)
            // if (this.checkIfMoveCausesCheck(idx, toIdx)) return false;

            return true;
        });
    },

    /**
     * Simülasyon: Hamle rakip şahı tehlikeye sokuyor mu?
     */
    checkIfMoveCausesCheck(from, to) {
        const tempTarget = GameCore.board[to];
        const tempSource = GameCore.board[from];
        
        GameCore.board[to] = tempSource;
        GameCore.board[from] = '';

        const causesCheck = GameCore.isCheck('b');

        GameCore.board[from] = tempSource;
        GameCore.board[to] = tempTarget;

        return causesCheck;
    },

    select(idx, moves) {
        this.selectedSquare = idx;
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
        if (piece === 'w-p' && Math.floor(to / 8) === 0) {
            EventBus.emit('requestPromotion', { from, to }, "PlayerController");
            return;
        }
        this.finalizeMove(from, to);
    },

    finalizeMove(from, to, promotion = null) {
        this.selectedSquare = null;
        EventBus.emit('requestPlayerMove', { from, to, promotion }, "PlayerController");
    }
};