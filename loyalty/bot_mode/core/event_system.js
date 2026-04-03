// core/event_system.js - TRAFİK POLİSİ
export const EventSystem = {
    queue: [],
    isProcessing: false,

    // 1. YENİ BİR OLAY EKLE
    add(event) {
        this.queue.push(event);
        this.processNext();
    },

    // 2. SIRADAKİ OLAYI İŞLE
    async processNext() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const event = this.queue.shift();

        // Olayın tipine göre ilgili birime haber ver
        await this.handleEvent(event);

        this.isProcessing = false;
        this.processNext(); // Bir sonrakine geç
    },

    // 3. OLAYI YÖNET
    async handleEvent(event) {
        console.log("Event İşleniyor:", event.type, event);

        switch (event.type) {
            case 'squareClicked':
                // Bu haberi PlayerController duyacak (Birazdan kuracağız)
                window.dispatchEvent(new CustomEvent('handleLogic', { detail: event.detail }));
                break;

            case 'moveExecuted':
                // Hamle yapıldıysa Renderer'a "Ekranı Yenile" diyoruz
                // Buraya istersen 500ms gecikme (delay) koyabiliriz ki animasyon gibi dursun
                window.dispatchEvent(new CustomEvent('triggerRender', { detail: event.piece }));
                break;

            case 'betrayal':
                // İhanet kuralı tetiklendiğinde burası çalışacak
                console.warn("İHANET GERÇEKLEŞTİ!", event.from, event.to);
                break;
        }
    }
};