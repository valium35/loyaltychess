// game_manager.js - ORKESTRA ŞEFİ
import { GameCore } from './core/game_core.js';
import { Renderer } from './ui/renderer.js';
import { PlayerController } from './controllers/player_controller.js';
import { BotController } from './controllers/bot_controller.js';
import { AI } from './bot/ai.js'; 

export const GameManager = {
    async init() {
        console.log("LoyaltyChess Başlatılıyor...");
        
        if (AI && typeof AI.initialize === 'function') {
            await AI.initialize(); 
            console.log("🧠 Botun hafızası hazır!");
        }

        GameCore.init();
        PlayerController.init();
        BotController.init();
        
        this.setupListeners();
        this.updateStatus(); 

        // İlk render: Her şeyin ekranda doğru göründüğünden emin olalım
        Renderer.render(null, []);
    },

    setupListeners() {
        // 1. Manuel Render Tetikleyici
        window.addEventListener('triggerRender', (e) => {
            const selected = e.detail?.selected !== undefined ? e.detail.selected : null;
            const moves = e.detail?.moves !== undefined ? e.detail.moves : [];
            Renderer.render(selected, moves);
        });

        // 2. Hamle Bittiğinde (Burada her şeyi tazelemeliyiz!)
        window.addEventListener('moveFinished', (e) => {
            // 🚩 KRİTİK: Hamle bitince tehditleri ve ihanet listesini 
            // GameCore zaten güncelliyor ama Renderer'ı zorla çağırmalıyız.
            this.updateStatus(false); 
            Renderer.render(null, []); // Hamle sonrası tahtayı (ve kırmızıları) tazele
            
            // Eğer sıra bota geçtiyse botu uyandır
            if (GameCore.turn === 'b') {
                BotController.makeMove(); 
            }
        });

        window.addEventListener('botThinking', () => {
            this.updateStatus(true); 
            Renderer.render(null, []); // Düşünürken de tahtayı güncel tut
        });
    },

    updateStatus(isThinking = false) {
        const statusEl = document.getElementById('status');
        if (!statusEl) return;

        const turn = GameCore.turn;
        const gameOver = GameCore.checkGameOver();

        if (gameOver) {
            statusEl.style.color = "#ff3333";
            statusEl.innerHTML = gameOver === "MAT" ? "🏁 CHECKMATE!" : "🤝 STALEMATE!";
            return; 
        }

        // Şah kontrolü
        if (GameCore.isCheck(turn)) {
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