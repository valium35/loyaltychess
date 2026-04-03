// controllers/bot_controller.js - BOT KUMANDASI
import { GameCore } from '../core/game_core.js';
import { EventSystem } from '../core/event_system.js';
import { AI } from '../bot/ai.js';

export const BotController = {
    // 1. SIRA SİYAHA GEÇTİ Mİ DİNLE
    init() {
        // 'moveExecuted' yerine 'moveFinished' dinliyoruz (EventSystem'den gelen temiz sinyal)
        window.addEventListener('moveFinished', () => {
            console.log("BotController: Sıra kontrol ediliyor. Sıra:", GameCore.turn);
            
            // Sıra siyahtaysa ve oyun bitmediyse botu uyandır
            if (GameCore.turn === 'b' && !GameCore.checkGameOver()) {
                this.thinkAndAct();
            }
        });
    },

    // 2. DÜŞÜN VE HAMLE YAP
    thinkAndAct() {
        // Güvenlik: Oyun bittiyse (Mat/Pat) hiçbir şey yapma
        if (GameCore.checkGameOver()) return;

        // 🟢 ŞEFE HABER VER: "Düşünüyorum..." yazısını yaktır
        window.dispatchEvent(new CustomEvent('botThinking'));

        // 3. DÜŞÜNME SÜRESİ (1 Saniye Gecikme)
        setTimeout(() => {
            // Hamle yapmadan hemen önce oyunun bitip bitmediğine son bir kez bak
            const isGameOver = GameCore.checkGameOver();
            if (isGameOver) return;

            const bestMove = AI.getBestMove();
            
            if (bestMove) {
                // Hamleyi Core'da işlet (Piyon terfisi dahil her şey burada olur)
                const moveData = GameCore.execute(bestMove.from, bestMove.to);
                
                // Color garantisi (Log sistemi için)
                if (!moveData.color) moveData.color = 'b'; 

                console.log("BOT: Hamle yapıldı:", moveData);

                // ❗ KRİTİK: Burada dispatchEvent YAPMIYORUZ! 
                // Sadece EventSystem'e ekliyoruz. 
                // EventSystem logu yazar, tahtayı çizer ve 'moveFinished' diyerek döngüyü tamamlar.
                if (typeof EventSystem !== 'undefined' && EventSystem.add) {
                    EventSystem.add({ 
                        type: 'moveExecuted', 
                        detail: moveData 
                    });
                }
            }
        }, 1000); 
    }
};