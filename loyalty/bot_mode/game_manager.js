// game_manager.js - ORKESTRA ŞEFİ
import { GameCore } from './core/game_core.js';
import { Renderer } from './ui/renderer.js';
import { PlayerController } from './controllers/player_controller.js';
import { BotController } from './controllers/bot_controller.js';
import { EventSystem } from './core/event_system.js';
import { AI } from './bot/ai.js'; // ⬅️ 1. AI modülünü buraya ekledik

export const GameManager = {
    async init() { // ⬅️ 2. 'async' kelimesini ekledik (dosya yüklenmesini beklemek için)
        console.log("LoyaltyChess Başlatılıyor...");
        
        // 🚀 3. BOTUN HAFIZASINI YÜKLE (Kritik Hamle!)
        // Oyun başlamadan önce JSON dosyalarını (açılış kitabı ve ağırlıklar) okuyoruz.
        await AI.initialize(); 
        console.log("🧠 Botun hafızası ve usta verileri hazır!");

        GameCore.init();
        PlayerController.init();
        BotController.init();
        
        this.setupListeners();
        this.updateStatus(); 

        // İlk açılışta tahtayı tertemiz çiz
        Renderer.render(null, []);
    },

    setupListeners() {
        // ... (Senin mevcut listener kodların buraya gelecek, bir değişiklik yok)
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
            statusEl.style.textShadow = "0 0 20px #ff0000";
            statusEl.innerHTML = gameOver === "MAT" ? "🏁 CHECKMATE! (MAT)" : "🤝 STALEMATE! (PAT)";
            return; 
        }

        if (isCheck) {
            statusEl.style.color = "#ff3333";
            statusEl.style.textShadow = "0 0 15px #ff0000";
            statusEl.innerHTML = turn === 'w' ? "⚠️ CHECK! (ŞAH ALTINDASIN)" : "⚠️ BRAIN IN DANGER!";
        } else {
            statusEl.style.color = "#f1c40f";
            statusEl.style.textShadow = "none";
            statusEl.innerHTML = turn === 'w' ? "⚪ SIRA SENDE" : (isThinking ? "🧠 LOYALTYBRAIN DÜŞÜNÜYOR..." : "⚫ BOTUN SIRASI");
        }
    }
};

window.onload = () => {
    GameManager.init();
};