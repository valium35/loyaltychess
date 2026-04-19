// controllers/bot_controller.js - BOT KUMANDASI
import { GameCore } from '../core/game_core.js';
import { GameManager } from '../game_manager.js';
import { AI } from '../bot/ai.js';

export const BotController = {
    isThinking: false, 

    init() {
        console.log("⚫ Bot Kumandası Aktif.");
    },

    async makeMove() {
        // 1. GÜVENLİK KONTROLLERİ
        if (GameCore.checkGameOver() || this.isThinking) return;
        
        // Sıra botta mı? (Siyah: 'b')
        if (GameCore.turn !== 'b') return; 

        this.isThinking = true;
        
        // UI'ya botun düşündüğünü bildir (Manager bunu dinleyip Renderer'ı günceller)
        window.dispatchEvent(new CustomEvent('botThinking'));

        // Görsel bir bekleme (Botun anında oynaması insanı ürkütür)
        setTimeout(async () => {
            try {
                // Hamle öncesi son kontrol
                if (GameCore.checkGameOver()) return;

                // 2. AI'DAN KARAR AL
                const bestMove = AI.getBestMove();
                
                if (bestMove) {
                    console.log(`🤖 BOT: ${GameCore.indexToCoord(bestMove.from)} -> ${GameCore.indexToCoord(bestMove.to)} hamlesini yapıyor.`);
                    
                    // 3. MANAGER'A EMİR VER
                    // Manager artık commitMove kullanarak atomik bir işlem yapacak.
                    await GameManager.processMove(bestMove.from, bestMove.to);

                    // 4. İHANET EK HAMLESİ (DOUBLE MOVE) KONTROLÜ
                    // LoyaltyChess kuralı: Eğer yapılan hamle bir ihanet infazı ise turn değişmez, hala 'b' kalır.
                    if (GameCore.turn === 'b' && !GameCore.checkGameOver()) {
                        console.log("💣 BOT: İhanet infaz edildi, sıra hâlâ bende. Ek hamle yapılıyor...");
                        
                        // Kilidi açıp tekrar çağırıyoruz
                        this.isThinking = false;
                        this.makeMove(); 
                        return;
                    }
                } else {
                    console.warn("🤖 BOT: Yapacak yasal hamle bulamadım!");
                }
            } catch (error) {
                console.error("❌ Bot Hamle Hatası:", error);
            } finally {
                // İşlem bittiğinde düşünme kilidini kaldır
                this.isThinking = false;
            }
        }, 600);
    }
};