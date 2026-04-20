// loyal_lab.js - SAF AKIŞ MOTORU (Düzeltilmiş Sıralama)
import { BetrayalJudge } from './core/betrayal_judge.js';
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

        // --- 🚩 KRİTİK DÜZELTME BAŞLANGICI ---
        
        // ÖNCE: Move paketini oluştur ve CORE'a işle
        const moveData = {
            ...moveResult,
            fromSq: this.core.indexToCoord(from),
            toSq: this.core.indexToCoord(to),
            hadBetrayals: false // Şimdilik false, birazdan güncellenecek
        };
        
        this.core.history.push(moveData); 
        this.core.lastMove = moveData; // Hakem artık 'to' karesini görebilir!

        // SONRA: İhanet sorgusunu yap (Hakem artık güncel lastMove'u biliyor)
        const betrayalList = BetrayalJudge.evaluate(
            this.core.board, 
            this.core.turn, 
            this.core
        );

        if (betrayalList.length > 0) {
            moveData.hadBetrayals = true; // Veriyi güncelle
            
            EventBus.emit('betrayalDetected', { 
                betrayals: betrayalList,
                atTurn: this.core.turn 
            }, "LoyalLab");

            betrayalList.forEach(b => {
                // this.core.board[b.index] = ''; // Kural gereği silme aktif edilebilir
                console.warn(`💀 İHANET: ${b.piece} tahtadan ayrıldı.`);
            });
        }

        // --- 🚩 KRİTİK DÜZELTME BİTİŞİ ---

        // 3. EVENT + LOG (YAN ETKİLER)
        EventBus.emit('moveExecuted', moveData, "LoyalLab");
        EventBus.emit('moveExecuted', moveData);
        LogSystem.update(moveData);

        // 4. STATE GÜNCELLE (Sıra değişimi)
        this.core.turn = (this.core.turn === 'w') ? 'b' : 'w';
        console.log(`✅ Sıra: ${this.core.turn}`);

        // 5. GÖRSEL GÜNCELLEME
        this.syncView();

        // 6. SONRAKİ AKIŞ (BOT / GAME OVER)
        this.finalizeCycle();

        console.groupEnd();
    },

    finalizeCycle() {
        const gameOver = this.core.checkGameOver();
        window.dispatchEvent(new CustomEvent('updateStatus'));

        if (!gameOver && this.core.turn === 'b') {
            setTimeout(() => BotController.makeMove(), 1200);
        }
    },

    syncView(selected = null, moves = []) {
        if (!this.core) return;

        Renderer.render({
            board: this.core.board,
            turn: this.core.turn,
            lastMove: this.core.lastMove,
            history: this.core.history,
            loyaltyMap: BetrayalJudge.neglectRegistry || {},
            selected,
            moves
        });
    }
};