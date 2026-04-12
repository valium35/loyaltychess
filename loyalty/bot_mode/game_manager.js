// game_manager.js - ORKESTRA ŞEFİ
import { GameCore } from './core/game_core.js';
import { Renderer } from './ui/renderer.js';
import { PlayerController } from './controllers/player_controller.js';
import { BotController } from './controllers/bot_controller.js';
import { AI } from './bot/ai.js'; 

export const GameManager = {
    async init() {
        console.log("LoyaltyChess Başlatılıyor...");
        
        // 🚨 HATA BURADAYDI: AI nesnesinin içinde 'initialize' fonksiyonu 
        // olup olmadığını kontrol ederek çağıralım.
        if (AI && typeof AI.initialize === 'function') {
            await AI.initialize(); 
            console.log("🧠 Botun hafızası hazır!");
        } else {
            console.error("❌ HATA: AI.initialize bulunamadı! AI.js dosyasını kontrol et.");
        }

        GameCore.init();
        PlayerController.init();
        BotController.init();
        
        this.setupListeners();
        this.updateStatus(); 

        Renderer.render(null, []);
    },

    setupListeners() {
        window.addEventListener('triggerRender', (e) => {
            const selected = e.detail?.selected !== undefined ? e.detail.selected : null;
            const moves = e.detail?.moves !== undefined ? e.detail.moves : [];
            Renderer.render(selected, moves);
        });

        window.addEventListener('moveFinished', (e) => {
            this.updateStatus(false); 
        });

        window.addEventListener('botThinking', () => {
            this.updateStatus(true); 
        });
    },

    updateStatus(isThinking = false) {
        const statusEl = document.getElementById('status');
        if (!statusEl) return;

        const turn = GameCore.turn;
        const isCheck = GameCore.isCheck(turn);
        const gameOver = GameCore.checkGameOver();

        if (gameOver) {
            statusEl.style.color = "#ff3333";
            statusEl.innerHTML = gameOver === "MAT" ? "🏁 CHECKMATE!" : "🤝 STALEMATE!";
            return; 
        }

        if (isCheck) {
            statusEl.style.color = "#ff3333";
            statusEl.innerHTML = turn === 'w' ? "⚠️ ŞAH ALTINDASIN!" : "⚠️ BOT ŞAH ALTINDA!";
        } else {
            statusEl.style.color = "#f1c40f";
            statusEl.innerHTML = turn === 'w' ? "⚪ SIRA SENDE" : (isThinking ? "🧠 DÜŞÜNÜYORUM..." : "⚫ BOTUN SIRASI");
        }
    }
};

window.onload = () => {
    GameManager.init();
};