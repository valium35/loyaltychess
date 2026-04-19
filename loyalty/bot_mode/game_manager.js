// game_manager.js - KOORDİNASYON MERKEZİ (CLEAN)

import { GameCore } from './core/game_core.js';
import { PlayerController } from './controllers/player_controller.js';
import { BotController } from './controllers/bot_controller.js';
import { LoyalLab } from './loyal_lab.js';
import { LogSystem } from './ui/log_system.js';

export const GameManager = {

    async init() {
        console.log("🧩 Manager Başlatılıyor...");

        // 1. Core reset
        GameCore.reset();
        
        // Log sistemini başlat (move-history div'ini bağla)
        LogSystem.init('move-history');

        // 2. Controllers
        PlayerController.init();
        BotController.init();

        // 3. LAB (Sıra ve kuralları yöneten motor)
        LoyalLab.init(GameCore);

        // 4. Dinleyicileri kur
        this.setupListeners();

        // 5. İlk Görünümü Hazırla
        this.updateStatus();
        LoyalLab.syncView();
    },

    /**
     * TEK HAMLE GİRİŞ NOKTASI
     */
    async processMove(from, to, promotionPiece = null) {
        await LoyalLab.runCycle(
            Number(from),
            Number(to),
            promotionPiece
        );
    },

    refreshUI(selected = null, moves = []) {
        LoyalLab.syncView(selected, moves);
    },

    setupListeners() {
        // --- 🚩 KRİTİK EKSİK BURASIYDI: HAMLE TALEPLERİNİ YAKALA ---
        window.addEventListener('requestPlayerMove', async (e) => {
            const { from, to, promotion } = e.detail;
            console.log(`📡 [${e.detail.__source || 'Bilinmiyor'}] Hamle Talebi İşleniyor...`);
            await this.processMove(from, to, promotion);
        });

        // Görsel güncelleme talebi
        window.addEventListener('triggerRender', (e) => {
            this.refreshUI(
                e.detail?.selected ?? null,
                e.detail?.moves ?? []
            );
        });

        // Durum güncelleme talebi
        window.addEventListener('updateStatus', () => {
            this.updateStatus();
        });

        // Bot düşünme bildirimi
        window.addEventListener('botThinking', () => {
            this.updateStatus(true);
            this.refreshUI(null, []);
        });

        // Hamle icra edildiğinde (Lab'dan gelir)
        window.addEventListener('moveExecuted', (e) => {
            // LogSystem Lab içinde de çağrılabilir ama buradan yönetmek daha merkezi
            // LogSystem.update(e.detail); // Eğer Lab içinde yapmıyorsan burayı aç

            // Sıra bota geçtiyse bota emir ver
            if (GameCore.turn === 'b' && !GameCore.checkGameOver()) {
                setTimeout(() => BotController.makeMove(), 250); 
            }
        });
    },

    updateStatus(isThinking = false) {
        const statusEl = document.getElementById('status');
        if (!statusEl) return;

        // Core üzerinden taze bilgileri al
        const turn = GameCore.turn;
        const gameOver = GameCore.checkGameOver();

        if (gameOver) {
            statusEl.style.color = "#ff3333";
            statusEl.innerHTML =
                gameOver === "MAT"
                    ? "🏁 CHECKMATE!"
                    : "🤝 STALEMATE!";
            return;
        }

        if (GameCore.isCheck(turn)) {
            statusEl.style.color = "#ff3333";
            statusEl.innerHTML =
                turn === 'w'
                    ? "⚠️ ŞAH ALTINDASIN!"
                    : "⚠️ BOT ŞAH ALTINDA!";
        } else {
            statusEl.style.color = "#f1c40f";
            statusEl.innerHTML =
                turn === 'w'
                    ? "⚪ SIRA SENDE"
                    : (isThinking
                        ? "🧠 DÜŞÜNÜYORUM..."
                        : "⚫ BOTUN SIRASI");
        }
    }
};

window.onload = () => GameManager.init();