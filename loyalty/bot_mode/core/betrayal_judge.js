/**
 * BETRAYAL JUDGE (İHANET HAKİMİ)
 * LoyaltyChess kurallarının sahadaki uygulayıcısıdır.
 */
export const BetrayalJudge = {
    // İhanet edebilecek rütbeli askerler (At, Fil, Kale)
    betrayableTypes: ['n', 'b', 'r'],

    /**
     * 🚩 ÖNEMLİ GÜNCELLEME: 
     * Artık rengi tersine çevirmiyoruz. Taşın rengi her zaman orijinaldir.
     * Bu fonksiyon sadece görselleştirme veya loglama için taşın "kimin hizmetinde" olduğunu söyler.
     */
    getServantColor(core, idx) {
        const piece = core.board[idx];
        if (!piece) return null;
        const [originalColor] = piece.split('-');
        
        // Bu taşın kime ihanet ettiğini (target) bul
        const betrayal = core.activeBetrayals.find(b => b.sq === idx);
        
        // Eğer hedef vizesi varsa, o oyuncunun rengini döndür, yoksa orijinalini.
        return betrayal ? betrayal.target : originalColor;
    },

    /**
     * Renderer ve AI için her karenin ihanet statüsünü belirler.
     * 0: Normal
     * 1: Tehdit Altında (Mavi) -> Rakip istiyor, korunuyor veya henüz sıra geçmedi.
     * 2: İhanet Riski (Kırmızı) -> Sahibi tarafından korunmadı ve terk edildi!
     */
    getSquareStatus(core, idx) {
        // 🛡️ Emniyet Kontrolü
        if (!core || idx === null || idx === undefined || idx < 0 || idx > 63) return 0;

        const piece = core.board[idx];
        if (!piece) return 0;

        const [color, type] = piece.split('-');
        
        // Kural 1: Sadece rütbeli askerler ihanet edebilir
        if (!this.betrayableTypes.includes(type)) return 0;

        // Kural 2: Şah altındayken ihanet mekanizması dondurulur (Savunma önceliği)
        if (core.isCheck(color)) return 0;

        const opponent = (color === 'w' ? 'b' : 'w');

        // ⚔️ 1. ADIM: Aktif Tehdit Kontrolü
        const isAttacked = core.isSquareAttacked(idx, opponent, core.board, true);
        if (!isAttacked) return 0;

        // 🛡️ 2. ADIM: Dost Koruması Kontrolü
        const isProtected = core.isSquareAttacked(idx, color, core.board, true);
        
        // ⏳ 3. ADIM: Sabıka (Zamanlama) Kontrolü
        const threatStartedAtMove = (core.threatHistory && core.threatHistory[idx] !== null) 
                                    ? core.threatHistory[idx] : null;

        // --- KARAR MANTIĞI ---

        // A) Eğer taş dost bir birim tarafından korunuyorsa, vadesi asla dolmaz -> DAİMA MAVİ (1)
        if (isProtected) return 1;

        // B) Taş korunmuyorsa, zamanlama şartlarına bak:
        if (threatStartedAtMove !== null) {
            /**
             * ⚖️ İHANETİN KESİNLEŞME ŞARTLARI:
             * 1. Tehdit başladığından beri en az bir hamle yapılmış olmalı (threatStartedAtMove < history.length)
             * 2. VE şu an hamle sırası bu taşın sahibinde OLMAMALI (core.turn !== color)
             * Yani sahibi hamle hakkını kullandı ama bu taşı korumadı veya kaçmadı.
             */
            const hasOwnerMissedHisChance = threatStartedAtMove < core.history.length;
            const isNotOwnersTurn = core.turn !== color;

            if (hasOwnerMissedHisChance && isNotOwnersTurn) {
                return 2; // 🔴 DURUM 2: KIRMIZI (İnfaz yetkisi rakiptedir!)
            }
        }

        // C) Tehdit yeni başladıysa veya sıra hala sahibindeyse (fırsatı varsa) -> MAVİ (1)
        return 1;
    }
};