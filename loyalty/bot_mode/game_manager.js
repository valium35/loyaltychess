// game_manager.js - ORKESTRA ŞEFİ
import { GameCore } from './core/game_core.js';
import { Renderer } from './ui/renderer.js';
import { PlayerController } from './controllers/player_controller.js';
import { BotController } from './controllers/bot_controller.js';
import { EventSystem } from './core/event_system.js';

export const GameManager = {
    init() {
        console.log("LoyaltyChess Başlatılıyor...");
        
        GameCore.init();
        PlayerController.init();
        BotController.init();
        
        this.setupListeners();
        this.updateStatus(); 

        // İlk açılışta tahtayı tertemiz çiz
        Renderer.render(null, []);
    },

    setupListeners() {
        // 1. Görsel Güncelleme Tetikleyicisi (Noktalar ve Seçimler)
        window.addEventListener('triggerRender', (e) => {
            // e.detail güvenli okuma (Optional Chaining kullanarak)
            const selected = e.detail?.selected !== undefined ? e.detail.selected : null;
            const moves = e.detail?.moves !== undefined ? e.detail.moves : [];
            
            console.log("Rendering Board... Selected:", selected, "Moves:", moves.length);
            
            // Renderer'ı her zaman güvenli parametrelerle çağır
            Renderer.render(selected, moves);
        });

        // 2. Hamle Tamamen Bittiğinde (Log yazıldı, her şey hazır)
        // EventSystem'den gelecek 'moveFinished' sinyalini dinleyelim
        window.addEventListener('moveFinished', (e) => {
            console.log("Move Finished. Updating status...");
            this.updateStatus(false); 
        });

        // 3. Bot düşünmeye başladığında
        window.addEventListener('botThinking', () => {
            this.updateStatus(true); 
        });
    },

    // 🟢 DURUM GÜNCELLEME MERKEZİ
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