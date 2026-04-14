// controllers/bot_controller.js - BOT KUMANDASI
import { GameCore } from '../core/game_core.js';
import { EventSystem } from '../core/event_system.js';
import { AI } from '../bot/ai.js';

export const BotController = {
    isThinking: false, 

    init() {
        // Kendi içindeki listener'ı sildik. 
        // Artık sadece GameManager emrettiğinde çalışacak.
        console.log("⚫ Bot Kumandası Aktif.");
    },

    // İsmini makeMove yaptık, GameManager artık burayı bulabilir
    makeMove() {
        if (GameCore.checkGameOver() || this.isThinking) return;
        if (GameCore.turn !== 'b') return; // Sıra botta değilse çalışma

        this.isThinking = true;
        window.dispatchEvent(new CustomEvent('botThinking'));

        setTimeout(() => {
            try {
                if (GameCore.checkGameOver()) return;

                const bestMove = AI.getBestMove();
                
                if (bestMove) {
                    const moveData = GameCore.execute(bestMove.from, bestMove.to);
                    
                    if (moveData) {
                        EventSystem.add({ 
                            type: 'moveExecuted', 
                            detail: moveData 
                        });

                        // İhanet hamlesinden sonra sıra hala bottaysa (zincir hamle)
                        if (GameCore.turn === 'b') {
                            console.log("💣 BOT: İhanet gerçekleşti, devam ediyorum...");
                            this.isThinking = false;
                            this.makeMove(); 
                            return;
                        }
                    }
                }
            } catch (error) {
                console.error("Bot Hamle Hatası:", error);
            } finally {
                this.isThinking = false;
            }
        }, 600);
    }
};