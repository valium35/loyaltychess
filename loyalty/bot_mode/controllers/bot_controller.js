// controllers/bot_controller.js - BOT KUMANDASI
import { GameCore } from '../core/game_core.js';
import { EventSystem } from '../core/event_system.js';
import { AI } from '../bot/ai.js';

export const BotController = {
    isThinking: false, 

    init() {
        window.addEventListener('moveFinished', () => {
            // Sıra siyahtaysa, oyun bitmediyse ve bot zaten düşünmüyorsa başla
            if (GameCore.turn === 'b' && !GameCore.checkGameOver() && !this.isThinking) {
                this.thinkAndAct();
            }
        });
    },

    thinkAndAct() {
        if (GameCore.checkGameOver() || this.isThinking) return;

        this.isProcessing = true; // Düşünme başladı kilidi
        this.isThinking = true;

        window.dispatchEvent(new CustomEvent('botThinking'));

        setTimeout(() => {
            try {
                if (GameCore.checkGameOver()) return;

                // AI'DAN EN İYİ HAMLEYİ AL
                const bestMove = AI.getBestMove();
                
                if (bestMove) {
                    const moveData = GameCore.execute(bestMove.from, bestMove.to);
                    
                    if (moveData) {
                        // EventSystem'e hamleyi gönder (Renderer ve Log burada tetiklenir)
                        EventSystem.add({ 
                            type: 'moveExecuted', 
                            detail: moveData 
                        });

                        // --- 🚨 İHANET ZİNCİRİ KONTROLÜ ---
                        // Eğer hamle sonrası GameCore 'isBetrayalPhase'e girdiyse 
                        // veya sıra hala siyahtaysa (saf değişimi olduysa), bot DURMAMALI.
                        if (GameCore.isBetrayalPhase || GameCore.turn === 'b') {
                            console.log("💣 BOT: İhanet tetiklendi, ajanla devam ediyorum...");
                            this.isThinking = false; // Kilidi aç
                            this.thinkAndAct();      // Hemen bir sonraki (ajan) hamlesini yap
                            return;
                        }
                    }
                }
            } catch (error) {
                console.error("Bot Hamle Hatası:", error);
            } finally {
                this.isThinking = false;
            }
        }, 600); // 1000ms biraz yavaştı, 600ms botu daha "seri" hissettirir
    }
};