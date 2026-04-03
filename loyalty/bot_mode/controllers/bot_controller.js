// controllers/bot_controller.js - BOT KUMANDASI
import { GameCore } from '../core/game_core.js';
import { EventSystem } from '../core/event_system.js';
import { AI } from '../bot/ai.js';

export const BotController = {
    // 1. SIRA SİYAHA GEÇTİ Mİ DİNLE
    init() {
        window.addEventListener('moveExecuted', () => {
            console.log("BotController: Hamle yapıldı haberi geldi. Sıra şu an:", GameCore.turn);
            if (GameCore.turn === 'b') {
                this.thinkAndAct();
            }
        });
    },

    // 2. DÜŞÜN VE HAMLE YAP (Gecikmeli ki gerçekçi olsun)
    thinkAndAct() {
        console.log("LoyaltyBrain düşünüyor...");
        
        setTimeout(() => {
            const bestMove = AI.getBestMove();
            
            if (bestMove) {
                // Hamleyi Core'da yap
                const moveData = GameCore.execute(bestMove.from, bestMove.to);
                
                // Hamle bitti haberini fırlat (Renderer bu sayede tahtayı güncelleyecek)
                EventSystem.add({ type: 'moveExecuted', detail: moveData });
            }
        }, 1000); // 1 saniye düşünme süresi
    }
};