// loyal_lab.js - SAF AKIŞ MOTORU

import { Renderer } from './ui/renderer.js';
import { BotController } from './controllers/bot_controller.js';
import { EventBus } from './core/event_bus.js';
import { LogSystem } from './ui/log_system.js';

export const LoyalLab = {
    core: null,

    init(liveCore) {
        this.core = liveCore;
        window.LabCore = liveCore;
        console.log("🚀 Loyalty Lab: Saf akış moduna geçildi.");
    },

    /**
     * ANA OYUN DÖNGÜSÜ
     */
    async runCycle(from, to, promotion = null) {
        console.group(`🕹️ AKIŞ SEANSI: [${from} -> ${to}]`);

        // 1. HAMLE UYGULA (CORE)
        const moveResult = this.core.applyMove(from, to, promotion);

        if (!moveResult) {
            console.error("❌ Hamle reddedildi.");
            console.groupEnd();
            return;
        }

        // 2. MOVE PAKETİ OLUŞTUR
        const moveData = {
            ...moveResult,
            fromSq: this.core.indexToCoord(from),
            toSq: this.core.indexToCoord(to)
        };
        this.core.history.push(moveData); // Deftere kaydet
        this.core.lastMove = moveData;    // Son hamle olarak işaretle

        // 3. EVENT + LOG (YAN ETKİLER)
        EventBus.emit('moveExecuted', moveData, "LoyalLab");
        EventBus.emit('moveExecuted', moveData);
        LogSystem.update(moveData);

        // 4. STATE GÜNCELLE (EN DOĞRU NOKTA)
        this.core.turn = (this.core.turn === 'w') ? 'b' : 'w';
        console.log(`✅ Sıra: ${this.core.turn}`);

        // 5. GÖRSEL GÜNCELLEME
        this.syncView();

        // 6. SONRAKİ AKIŞ (BOT / GAME OVER)
        this.finalizeCycle();

        console.groupEnd();
    },

    /**
     * BOT + GAME STATE SONRASI
     */
    finalizeCycle() {
        const gameOver = this.core.checkGameOver();

        // UI status event
        window.dispatchEvent(new CustomEvent('updateStatus'));

        // Bot hamlesi
        if (!gameOver && this.core.turn === 'b') {
            setTimeout(() => BotController.makeMove(), 150);
        }
    },

    /**
     * RENDER PAKETİ (SADE VE TUTARLI)
     */
    syncView(selected = null, moves = []) {
        if (!this.core) return;

        Renderer.render({
            board: this.core.board,
            turn: this.core.turn,
            lastMove: this.core.lastMove,
            history: this.core.history,

            selected,
            moves
        });
    }
};