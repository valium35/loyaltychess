// core/event_system.js - HABERLEŞME VE KAYIT SEKRETERLİĞİ

export const EventSystem = {
    moveCounter: 1,

    /**
     * 🚩 ARTIK KUYRUK (QUEUE) YOK. 
     * Manager bir olay fırlattığında anında ilgili birimlere dağıtılır.
     */
    emit(type, detail) {
        // 1. Olayı pencere düzeyinde fırlat (Renderer ve Controller'lar için)
        const event = new CustomEvent(type, { detail });
        window.dispatchEvent(event);

        // 2. Eğer bir hamle yapıldıysa log defterine anında işle
        if (type === 'moveExecuted') {
            this.updateLog(detail);
        }
    },

    // 🟢 NOTASYON ÜRETİCİ (Mantık korundu, kod temizlendi)
    generateNotation(moveData) {
        if (!moveData || !moveData.piece) return "??";
        const fromSq = moveData.fromSq || "";
        const toSq = moveData.toSq || "";

        const pieceMap = { 'p': '', 'n': 'N', 'b': 'B', 'r': 'R', 'q': 'Q', 'k': 'K' };
        const [color, pieceType] = moveData.piece.split('-');
        let pChar = pieceMap[pieceType] || '';

        // Rok Kontrolü
        if (pieceType === 'k' && Math.abs(moveData.from - moveData.to) === 2) {
            return moveData.to > moveData.from ? "O-O" : "O-O-O";
        }

        // Alım veya İhanet İnfazı
        if (moveData.captured || moveData.isBetrayal) {
            if (pieceType === 'p' && fromSq) {
                return fromSq[0] + 'x' + toSq; 
            }
            return pChar + 'x' + toSq;
        }

        return pChar + toSq;
    },

    // 🟢 MATRİKS LOG (Görsel yapı korundu, asenkronluk kaldırıldı)
    updateLog(moveData) {
        const historyEl = document.getElementById('move-history');
        if (!historyEl || !moveData) return;

        const notation = this.generateNotation(moveData);
        const isWhite = moveData.color === 'w';
        
        const rowId = `move-row-${this.moveCounter}`;
        let rowEl = document.getElementById(rowId);

        if (isWhite) {
            rowEl = document.createElement('div');
            rowEl.id = rowId;
            rowEl.className = 'log-entry';
            rowEl.style.cssText = "display: grid; grid-template-columns: 35px 1fr 1fr; gap: 5px; padding: 4px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem;";

            rowEl.innerHTML = `
                <span style="color:#f1c40f; opacity:0.5;">${this.moveCounter}.</span>
                <span class="white-slot" style="color:#fff; font-weight:bold;">${notation}</span>
                <span class="black-slot" style="color:rgba(255,255,255,0.15)">...</span>
            `;
            
            historyEl.prepend(rowEl);
        } else {
            if (rowEl) {
                const blackSlot = rowEl.querySelector('.black-slot');
                if (blackSlot) {
                    blackSlot.innerText = notation;
                    blackSlot.style.color = "#fff";
                    blackSlot.style.fontWeight = "bold";
                }
                this.moveCounter++;
            }
        }
    }
};