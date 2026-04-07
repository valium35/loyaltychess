// core/event_system.js - TEK YETKİLİ SİNİR SİSTEMİ
export const EventSystem = {
    queue: [],
    isProcessing: false,
    moveCounter: 1,

    // 1. Olay Ekleme
    add(event) {
        this.queue.push(event);
        this.processNext();
    },

    // 2. İşleme Kuyruğu
    async processNext() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;
        const event = this.queue.shift();
        await this.handleEvent(event);
        this.isProcessing = false;
        this.processNext();
    },

    // 3. Olay Yönetimi
    async handleEvent(event) {
        switch (event.type) {
            case 'triggerRender':
                window.dispatchEvent(new CustomEvent('triggerRender', { detail: event.detail }));
                break;

            case 'moveExecuted':
                // 1. Logu (Notasyonu) yaz
                this.updateLog(event.detail);
                
                // 2. Tahtayı çiz ve Tehdit Renklerini (Judge) tetikle
                window.dispatchEvent(new CustomEvent('triggerRender', { 
                    detail: { selected: null, moves: [] } 
                }));
                
                // 3. Botu ve Oyun Sonu Kontrolünü Uyandır
                window.dispatchEvent(new CustomEvent('moveFinished', { detail: event.detail }));
                
                await new Promise(resolve => setTimeout(resolve, 50));
                break;
        }
    },

    // 🟢 NOTASYON ÜRETİCİ (Hata Korumalı)
    generateNotation(moveData) {
        // SAVUNMA HATTI: Eğer veri eksik gelirse oyun çökmesin
        if (!moveData || !moveData.piece) return "??";
        const fromSq = moveData.fromSq || "";
        const toSq = moveData.toSq || "";

        const pieceMap = { 'p': '', 'n': 'N', 'b': 'B', 'r': 'R', 'q': 'Q', 'k': 'K' };
        const pieceParts = moveData.piece.split('-');
        const pieceType = pieceParts[1] || pieceParts[0];
        let pChar = pieceMap[pieceType] || '';

        // Rok Notasyonu
        if (pieceType === 'k' && Math.abs(moveData.from - moveData.to) === 2) {
            return moveData.to > moveData.from ? "O-O" : "O-O-O";
        }

        // Taş Alma Notasyonu
        if (moveData.captured) {
            // Piyon ile taş alma: 'exd5' gibi
            if (pieceType === 'p' && fromSq) {
                return fromSq[0] + 'x' + toSq; 
            }
            // Diğer taşlarla alma: 'Bxf3' gibi
            return pChar + 'x' + toSq;
        }

        // Standart hamle: 'e4', 'Nf3' gibi
        return pChar + toSq;
    },

    // 🟢 MATRİKS LOG (Senkronize ve Tekil)
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
            rowEl.style.display = "grid";
            rowEl.style.gridTemplateColumns = "35px 1fr 1fr";
            rowEl.style.gap = "5px";
            rowEl.style.padding = "4px 8px";
            rowEl.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
            rowEl.style.fontSize = "0.9rem";

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