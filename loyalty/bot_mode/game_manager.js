// game_manager.js - KOORDİNASYON MERKEZİ (PATRON)
import { GameCore } from './core/game_core.js';
import { Renderer } from './ui/renderer.js';
import { PlayerController } from './controllers/player_controller.js';
import { BotController } from './controllers/bot_controller.js';
import { EventSystem } from './core/event_system.js'; 
import { AI } from './bot/ai.js'; 

export const GameManager = {
    async init() {
        console.log("🧩 LoyaltyChess v2.0 Başlatılıyor...");
        
        if (AI && typeof AI.initialize === 'function') await AI.initialize(); 
        
        GameCore.reset(); 
        PlayerController.init();
        BotController.init();
        
        this.setupListeners();
        this.updateStatus(); 
        
        // İlk çizim
        this.refreshUI();
    },

    /**
     * ANA HAMLE MOTORU
     */
    async processMove(from, to, promotionPiece = null) {
        // ADIM 1: Core içinde atomik commit
        const moveData = GameCore.commitMove(from, to, promotionPiece);

        if (moveData) {
            // ADIM 2: Görseli güncelle (Noktaları temizleyerek)
            this.refreshUI(null, []);

            // ADIM 3: Olayı duyur (Loglama vb.)
            EventSystem.emit('moveExecuted', moveData);

            // ADIM 4: Akışı sonlandır (Bot uyarısı vb.)
            this.finalizeMove();
        }
    },

    finalizeMove() {
        this.updateStatus(false);
        if (GameCore.turn === 'b' && !GameCore.checkGameOver()) {
            setTimeout(() => {
                BotController.makeMove(); 
            }, 100);
        }
    },

    /**
     * 🟢 REHBER NOKTALARIN ANAHTARI:
     * Renderer'a 'moves' parametresini buradan paslıyoruz.
     */
    refreshUI(selected = null, moves = []) {
        Renderer.render({
            board: GameCore.board,
            selected: selected,
            moves: moves, // valid-move-dot'lar buradan gidiyor
            threats: GameCore.threatHistory,
            betrayals: GameCore.activeBetrayals
        });
    },

    setupListeners() {
        // 🚩 NOKTALARI GETİREN DİNLEYİCİ:
        window.addEventListener('triggerRender', (e) => {
            // PlayerController'dan gelen detayları (selected ve legal moves) Renderer'a ilet
            this.refreshUI(
                e.detail?.selected || null, 
                e.detail?.moves || []
            );
        });

        window.addEventListener('botThinking', () => {
            this.updateStatus(true); 
            this.refreshUI(null, []); // Bot düşünürken noktaları temizle
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

        if (GameCore.isCheck(turn)) {
            statusEl.style.color = "#ff3333";
            statusEl.innerHTML = turn === 'w' ? "⚠️ ŞAH ALTINDASIN!" : "⚠️ BOT ŞAH ALTINDA!";
        } else {
            statusEl.style.color = "#f1c40f";
            statusEl.innerHTML = turn === 'w' ? "⚪ SIRA SENDE" : (isThinking ? "🧠 DÜŞÜNÜYORUM..." : "⚫ BOTUN SIRASI");
        }
    }
};

window.onload = () => GameManager.init();