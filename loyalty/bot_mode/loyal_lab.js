// loyal_lab.js - SAF AKIŞ MOTORU (Zaman Aşımı & İhanet İnfazı)
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
        console.log("🚀 Loyalty Lab: İhanet fırsatları artık tek hamlelik!");
    },

    /**
     * ANA OYUN DÖNGÜSÜ
     */
    async runCycle(from, to, promotion = null) {
        console.group(`🕹️ AKIŞ SEANSI: [${from} -> ${to}]`);

        // --- 🚩 HAİN İNFAZ KONTROLÜ ---
        // Hamle icra edilmeden önce taşın "siciline" bakıyoruz
        const isBetrayalMove = (BetrayalJudge.neglectRegistry[from] === 'RED');

        // 1. HAMLE UYGULA (CORE)
        const moveResult = this.core.applyMove(from, to, promotion);

        if (!moveResult) {
            console.error("❌ Hamle reddedildi.");
            console.groupEnd();
            return;
        }

        // --- 🚩 İNFAZ VE ZAMAN AŞIMI MANTIĞI ---
        if (isBetrayalMove) {
            console.warn("💀 İHANET BEDELİ: Taş görevini yaptı ve infaz ediliyor.");
            
            // Taş hedefe ulaştı, şimdi oradan siliyoruz
            this.core.board[to] = ''; 
            
            // Registry temizliği
            delete BetrayalJudge.neglectRegistry[from];
            delete BetrayalJudge.neglectRegistry[to];
        } 
        else {
            // 🚩 EĞER NORMAL BİR HAMLE YAPILDIYSA:
            // Piyasadaki tüm RED ve LOCKED durumlarını temizle (Fırsat Kaçtı!)
            for (const idx in BetrayalJudge.neglectRegistry) {
                const status = BetrayalJudge.neglectRegistry[idx];
                if (status === 'RED' || status === 'LOCKED') {
                    console.log(`⏳ [ZAMAN AŞIMI]: ${this.core.indexToCoord(idx)} için ihanet fırsatı sona erdi.`);
                    delete BetrayalJudge.neglectRegistry[idx];
                }
            }
        }

        // --- 🚩 KRİTİK DÜZELTME BAŞLANGICI ---
        
        // ÖNCE: Move paketini oluştur ve CORE'a işle
        const moveData = {
            ...moveResult,
            fromSq: this.core.indexToCoord(from),
            toSq: this.core.indexToCoord(to),
            hadBetrayals: false,
            isBetrayal: isBetrayalMove 
        };
        
        this.core.history.push(moveData); 
        this.core.lastMove = moveData; 

        // SONRA: İhanet sorgusunu yap (Yeni tur için radar taraması)
        const betrayalList = BetrayalJudge.evaluate(
            this.core.board, 
            this.core.turn, 
            this.core
        );

        if (betrayalList.length > 0) {
            moveData.hadBetrayals = true; 
            
            EventBus.emit('betrayalDetected', { 
                betrayals: betrayalList,
                atTurn: this.core.turn 
            }, "LoyalLab");

            betrayalList.forEach(b => {
                console.warn(`💀 RADAR: ${b.piece} ihanet sınırına ulaştı!`);
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