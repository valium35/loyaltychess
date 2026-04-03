// core/event_system.js - TEK YETKİLİ SİNİR SİSTEMİ

export const EventSystem = {
    queue: [],
    isProcessing: false,
    moveCounter: 1,

    // 1. Olay Ekleme
    add(event) {
        // Çakışmayı önlemek için: Eğer aynı hamle zaten kuyruktaysa ekleme (Opsiyonel Güvenlik)
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
                // Sadece seçim noktaları için
                window.dispatchEvent(new CustomEvent('triggerRender', { detail: event.detail }));
                break;

            case 'moveExecuted':
    // 1. Önce Logu yaz (Tek seferlik)
    this.updateLog(event.detail);
    
    // 2. Tahtayı çiz
    window.dispatchEvent(new CustomEvent('triggerRender'));
    
    // 3. ❗ BOTU VE DİĞERLERİNİ UYANDIR (BotController burayı dinliyor)
    // Artık controller'larda bunu manuel fırlatmana gerek kalmayacak
    window.dispatchEvent(new CustomEvent('moveFinished', { detail: event.detail }));
    
    await new Promise(resolve => setTimeout(resolve, 50));
    break;
        }
    },

    // 🟢 NOTASYON ÜRETİCİ
    generateNotation(moveData) {
        const pieceMap = { 'p': '', 'n': 'N', 'b': 'B', 'r': 'R', 'q': 'Q', 'k': 'K' };
        const pieceParts = moveData.piece.split('-');
        const pieceType = pieceParts[1] || pieceParts[0];
        let pChar = pieceMap[pieceType] || '';

        if (pieceType === 'k' && Math.abs(moveData.from - moveData.to) === 2) {
            return moveData.to > moveData.from ? "O-O" : "O-O-O";
        }

        if (moveData.captured) {
            if (pieceType === 'p') return moveData.fromSq[0] + 'x' + moveData.toSq;
            return pChar + 'x' + moveData.toSq;
        }
        return pChar + moveData.toSq;
    },

    // 🟢 MATRİKS LOG (Senkronize ve Tekil)
    updateLog(moveData) {
        const historyEl = document.getElementById('move-history');
        if (!historyEl || !moveData) return;

        const notation = this.generateNotation(moveData);
        const isWhite = moveData.color === 'w';
        
        // Mevcut hamle numarası için satırı bul
        const rowId = `move-row-${this.moveCounter}`;
        let rowEl = document.getElementById(rowId);

        if (isWhite) {
            // Beyaz oynadıysa HER ZAMAN yeni satır aç
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
            // Siyah oynadıysa mevcut satırı güncelle
            if (rowEl) {
                const blackSlot = rowEl.querySelector('.black-slot');
                if (blackSlot) {
                    blackSlot.innerText = notation;
                    blackSlot.style.color = "#fff";
                    blackSlot.style.fontWeight = "bold";
                }
                // Siyah işini bitirdi, bir sonraki numaraya geç
                this.moveCounter++;
            }
        }
    }
};