// controllers/bot_controller.js - BOT KUMANDASI (CLEAN)

import { GameCore } from '../core/game_core.js';
import { AI } from '../bot/ai.js';
import { EventBus } from '../core/event_bus.js'; // 🚩 Artık otobüsümüz var

export const BotController = {
    isThinking: false,

    init() {
        console.log("⚫ Bot Kumandası Aktif.");
    },

    async makeMove() {
        // 1. GÜVENLİK KONTROLLERİ
        if (this.isThinking) return;
        if (GameCore.checkGameOver()) return;
        if (GameCore.turn !== 'b') return;

        this.isThinking = true;

        // UI bildirimi (Otobüs üzerinden haber verelim)
        EventBus.emit('botThinking', {}, "BotController");

        try {
            // 2. AI KARAR AŞAMASI
            // AI'ya hamle hesaplatırken GameCore'un son halini referans alıyoruz
            const bestMove = AI.getBestMove();

            if (!bestMove) {
                console.warn("🤖 BOT: Yasal hamle bulunamadı");
                return;
            }

            // Konsola şık bir log bırakalım
            const fromCoord = GameCore.indexToCoord(bestMove.from);
            const toCoord = GameCore.indexToCoord(bestMove.to);
            console.log(`🤖 BOT KARARI: ${fromCoord} → ${toCoord}`);

            // 3. EXECUTION REQUEST (Hamle Talebi)
            // 🚩 ÖNEMLİ: Artık 'requestBotMove' demiyoruz. 
            // GameManager için hamlenin 'bot' veya 'oyuncu'dan gelmesi fark etmez.
            // Sadece "bir hamle talebi var" diyoruz.
            EventBus.emit('requestPlayerMove', { 
                from: bestMove.from, 
                to: bestMove.to, 
                promotion: 'q' // Bot piyon çıkarırsa hep vezir yapsın
            }, "BotController");

        } catch (err) {
            console.error("❌ Bot hatası:", err);
        } finally {
            this.isThinking = false;
        }
    }
};