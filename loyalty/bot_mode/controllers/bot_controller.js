// controllers/bot_controller.js - BOT KUMANDASI
import { GameCore } from '../core/game_core.js';
import { EventSystem } from '../core/event_system.js';
import { AI } from '../bot/ai.js';

export const BotController = {
    isThinking: false, // 🔴 Çakışmayı önlemek için kilit

    init() {
        window.addEventListener('moveFinished', () => {
            console.log("BotController: Sıra kontrol ediliyor. Sıra:", GameCore.turn);
            
            // Sıra siyahtaysa, oyun bitmediyse ve bot zaten düşünmüyorsa başla
            if (GameCore.turn === 'b' && !GameCore.checkGameOver() && !this.isThinking) {
                this.thinkAndAct();
            }
        });
    },

    thinkAndAct() {
        if (GameCore.checkGameOver() || this.isThinking) return;

        this.isThinking = true; // Kilidi kapat

        // 🟢 UI GÜNCELLEME: "Düşünüyorum..." yazısını yaktır
        window.dispatchEvent(new CustomEvent('botThinking'));

        // 🕒 DÜŞÜNME SÜRESİ (1 Saniye Gecikme - Botun "insansı" tepkisi)
        setTimeout(() => {
            try {
                // Hamle yapmadan önce oyunun bitip bitmediğine son bir kez bak
                if (GameCore.checkGameOver()) {
                    this.isThinking = false;
                    return;
                }

                // AI'DAN EN İYİ HAMLEYİ AL (Minimax burada devreye girer)
                const bestMove = AI.getBestMove();
                
                if (bestMove) {
                    // Hamleyi Core'da işlet
                    const moveData = GameCore.execute(bestMove.from, bestMove.to);
                    
                    // Veri bütünlüğü garantisi
                    if (moveData) {
                        moveData.color = 'b'; 
                        console.log("BOT: Hamle yapıldı:", moveData);

                        // EventSystem üzerinden log ve render tetikle
                        EventSystem.add({ 
                            type: 'moveExecuted', 
                            detail: moveData 
                        });
                    }
                }
            } catch (error) {
                console.error("Bot Hamle Hatası:", error);
            } finally {
                // Hamle bitti, kilidi aç
                this.isThinking = false;
            }
        }, 1000); 
    }
};