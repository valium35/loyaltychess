// controllers/bot_controller.js - BOT KUMANDASI (Hainlik + Hayatta Kalma Modu)

import { GameCore } from '../core/game_core.js';
import { AI } from '../bot/ai.js';
import { EventBus } from '../core/event_bus.js';
import { BetrayalJudge } from '../core/betrayal_judge.js';

export const BotController = {
    isThinking: false,

    init() {
        console.log("⚫ Bot Kumandası Aktif (Hainlik ve Mavi Alarm Radarı Çalışıyor).");
    },

    async makeMove() {
        if (this.isThinking) return;
        if (GameCore.checkGameOver()) return;
        if (GameCore.turn !== 'b') return;

        this.isThinking = true;
        EventBus.emit('botThinking', {}, "BotController");

        try {
            // --- 🚩 1. ÖNCELİK: İHANET FIRSATI (RED) ---
            const betrayalMove = this.findBetrayalMove();
            if (betrayalMove) {
                console.warn(`🤖 BOT: Hain bir taşı kullanıyorum!`);
                this.executeMoveRequest(betrayalMove.from, betrayalMove.to);
                return;
            }

            // --- 🚩 2. ÖNCELİK: MAVİ ALARM (BLUE) - TAŞI KURTARMA ---
            const rescueMove = this.findRescueMove();
            if (rescueMove) {
                console.log(`🤖 BOT: Mavi alarm! ${GameCore.indexToCoord(rescueMove.from)} karesindeki taşımı kurtarıyorum.`);
                this.executeMoveRequest(rescueMove.from, rescueMove.to);
                return;
            }

            // --- 🚩 3. ÖNCELİK: STANDART AI HAMLESİ ---
            const bestMove = AI.getBestMove();
            if (bestMove) {
                this.executeMoveRequest(bestMove.from, bestMove.to);
            } else {
                console.warn("🤖 BOT: Yasal hamle bulunamadı");
            }

        } catch (err) {
            console.error("❌ Bot hatası:", err);
        } finally {
            this.isThinking = false;
        }
    },

    /**
     * İhanet fırsatı (RED) olan rakip taşları bulur.
     */
    findBetrayalMove() {
        const registry = BetrayalJudge.neglectRegistry;
        for (const idx in registry) {
            const index = parseInt(idx);
            const piece = GameCore.board[index];
            if (registry[index] === 'RED' && piece && piece.startsWith('w')) {
                const moves = this.getHainMovesForBot(index);
                if (moves.length > 0) {
                    const captureMove = moves.find(to => GameCore.board[to] !== '');
                    return { from: index, to: captureMove || moves[0] };
                }
            }
        }
        return null;
    },

    /**
     * Mavi (BLUE) alarmı veren kendi taşını güvenli bir yere kaçmaya çalışır.
     */
    findRescueMove() {
        const registry = BetrayalJudge.neglectRegistry;
        for (const idx in registry) {
            const index = parseInt(idx);
            const piece = GameCore.board[index];

            // Eğer Botun kendi taşı BLUE (tehdit altında ve korumasız) ise
            if (registry[index] === 'BLUE' && piece && piece.startsWith('b')) {
                const legalMoves = GameCore.getLegalMoves(index);
                
                if (legalMoves.length > 0) {
                    // Kaçacağı yerin güvenli olup olmadığına bak (Basit kontrol)
                    const safeMove = legalMoves.find(to => !GameCore.isSquareAttacked(to, 'w', GameCore.board));
                    return { from: index, to: safeMove || legalMoves[0] };
                }
            }
        }
        return null;
    },

    /**
     * Hain taş için kural filtresi.
     */
    getHainMovesForBot(idx) {
        const rawMoves = GameCore.getPieceMoves(idx, GameCore.board, true);
        return rawMoves.filter(toIdx => {
            const targetPiece = GameCore.board[toIdx];
            if (targetPiece && targetPiece.startsWith('b')) return false;
            if (targetPiece && targetPiece.endsWith('-k')) return false;
            return true;
        });
    },

    executeMoveRequest(from, to) {
        EventBus.emit('requestPlayerMove', { from, to, promotion: 'q' }, "BotController");
    }
};