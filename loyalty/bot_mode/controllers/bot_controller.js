// controllers/bot_controller.js - BOT KUMANDASI
import { GameCore } from '../core/game_core.js';
import { EventSystem } from '../core/event_system.js';
import { AI } from '../bot/ai.js';

export const BotController = {
    // 1. SIRA SİYAHA GEÇTİ Mİ DİNLE
    init() {
        window.addEventListener('moveExecuted', () => {
            console.log("BotController: Hamle yapıldı haberi geldi. Sıra şu an:", GameCore.turn);
            // Sadece sıra siyahtaysa (b) botu uyandır
            if (GameCore.turn === 'b') {
                this.thinkAndAct();
            }
        });
    },

    // 2. DÜŞÜN VE HAMLE YAP
    thinkAndAct() {
        // Oyun bitti mi kontrolü
        const status = GameCore.checkGameOver();
        if (status) {
            console.log("BOT: Oyun bitti, durum:", status);
            // İstersen burada bir alert veya UI mesajı verebilirsin
            return; 
        }

        console.log("LoyaltyBrain düşünüyor...");
        
        // 1 saniye gecikme ekliyoruz ki bot pat diye oynamasın
        setTimeout(() => {
            const bestMove = AI.getBestMove();
            
            if (bestMove) {
                // Hamleyi Core'da yap
                const moveData = GameCore.execute(bestMove.from, bestMove.to);
                
                // Hamle sonrası UI ve diğer sistemlerin haberi olsun diye event fırlatıyoruz
                window.dispatchEvent(new CustomEvent('moveExecuted', { detail: moveData }));
                EventSystem.add({ type: 'moveExecuted', detail: moveData });
            }
        }, 1000); 
    }
};