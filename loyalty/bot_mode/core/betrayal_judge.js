/**
 * BETRAYAL JUDGE (İHANET HAKİMİ)
 * LoyaltyChess kurallarının sahadaki uygulayıcısıdır.
 */
export const BetrayalJudge = {
    // İhanet edebilecek rütbeli askerler (At, Fil, Kale)
    betrayableTypes: ['n', 'b', 'r'],

    /**
     * Bir taşın o anki "etki rengini" belirler.
     * Eğer taş activeBetrayals içindeyse, rengi ters döner.
     */
    getEffectiveColor(core, idx) {
        const piece = core.board[idx];
        if (!piece) return null;
        const [originalColor] = piece.split('-');
        
        // Eğer taş aktif ihanetler listesindeyse rengini ters dönmüş kabul et
        if (core.activeBetrayals.includes(idx)) {
            return originalColor === 'w' ? 'b' : 'w';
        }
        return originalColor;
    },

    /**
     * Renderer ve AI için her karenin ihanet statüsünü belirler.
     * 0: Normal
     * 1: Tehdit Altında (Mavi) -> Rakip istiyor, feda edildi veya korunuyor.
     * 2: İhanet Riski (Kırmızı) -> Sahibi hamlesini yaptı ama korumadı! (Vadesi doldu)
     */
    getSquareStatus(core, idx) {
        // 🛡️ Emniyet Kontrolü
        if (!core || idx === null || idx === undefined || idx < 0 || idx > 63) return 0;

        const piece = core.board[idx];
        if (!piece) return 0;

        const [color, type] = piece.split('-');
        
        // Sadece rütbeli askerler ihanet edebilir
        if (!this.betrayableTypes.includes(type)) return 0;

        // Şah altındayken ihanet mekanizması durur (Öncelik şahı kurtarmaktır)
        if (core.isCheck(color)) return 0;

        const opponent = (color === 'w' ? 'b' : 'w');

        // 1. ADIM: Şu an bir tehdit var mı?
        const isAttacked = core.isSquareAttacked(idx, opponent, core.board, true);
        if (!isAttacked) return 0;

        // 2. ADIM: Dost koruması var mı?
        const isProtected = core.isSquareAttacked(idx, color, core.board, true);
        
        // 3. ADIM: Zamanlama (Sabıka) Kontrolü
        const threatStartedAtMove = (core.threatHistory && core.threatHistory[idx] !== undefined) 
                                    ? core.threatHistory[idx] : null;

        // Kural 1: Eğer taş korunuyorsa, daima MAVİ (1) kalır.
        if (isProtected) return 1;

        // Kural 2: Korunmayan taşlar için zamanlama kontrolü
        if (threatStartedAtMove !== null) {
            /**
             * ⚖️ SIRASI GEÇEN KURALI:
             * 1. Tehdit başladığından beri en az bir tam hamle yapılmış olmalı (threatStartedAtMove < history.length).
             * 2. VE şu an hamle sırası bu taşın sahibinde olmamalı (core.turn !== color).
             * Bu iki şart sağlandığında, taş "sahibi tarafından terk edilmiş" sayılır.
             */
            if (threatStartedAtMove < core.history.length && core.turn !== color) {
                return 2; // 🔴 DURUM 2: KIRMIZI (İhanet gerçekleşti!)
            }
        }

        // Henüz aynı hamle içindeysek (Feda) veya sıra hala sahibindeyse sadece MAVİ
        return 1; // 🔵 DURUM 1: MAVİ
    }
};