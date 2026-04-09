/**
 * BETRAYAL JUDGE (İHANET HAKİMİ)
 * LoyaltyChess kurallarının sahadaki uygulayıcısıdır.
 */
export const BetrayalJudge = {
    // İhanet edebilecek rütbeli askerler (At, Fil, Kale)
    betrayableTypes: ['n', 'b', 'r'],

    /**
     * Renderer ve AI için her karenin ihanet statüsünü belirler.
     * 0: Normal
     * 1: Tehdit Altında (Mavi) -> Rakip istiyor ama henüz hain değil veya korunuyor.
     * 2: İhanet Riski (Koyu Kırmızı) -> Sahibi tarafından terk edildi!
     */
    getSquareStatus(core, idx) {
        // 🛡️ EMNİYET KEMERİ: Veri eksikse veya kare dışındaysak çökme, 0 dön.
        if (!core || idx === null || idx === undefined || idx < 0 || idx > 63) {
            return 0;
        }

        const piece = core.board[idx];
        if (!piece) return 0;

        const [color, type] = piece.split('-');
        
        // Sadece rütbeli askerler ihanet edebilir
        if (!this.betrayableTypes.includes(type)) return 0;

        // 🛡️ KISITLAMA: Şah çekiliyorsa (Check), ihanet mekanizması durur.
        // Oyuncu Şah'ı kurtarmak zorunda olduğu için diğer taşlar "hain" sayılamaz.
        if (core.isCheck(color)) return 0;

        const opponent = (color === 'w' ? 'b' : 'w');

        // 1. ADIM: Şu an bir tehdit var mı? (Rakip bu taşı istiyor mu?)
        const isAttacked = core.isSquareAttacked(idx, opponent);
        if (!isAttacked) return 0; // Tehdit yoksa tertemiz (Durum 0)

        // 2. ADIM: Dost koruması var mı?
        const isProtected = core.isSquareAttacked(idx, color);

        // --- ⚖️ İHANET KARARI (Sabıka Kontrolü) ---
        // GameCore'da kaydedilen hamle sayısı (Varlık kontrolü eklendi)
        const threatStartedAtMove = (core.threatHistory && core.threatHistory[idx] !== undefined) 
                                    ? core.threatHistory[idx] 
                                    : null;

        // Kural 1: Eğer taş korunuyorsa, ne kadar zaman geçerse geçsin daima MAVİ kalır.
        if (isProtected) return 1;

        // Kural 2: Eğer taş korunmuyorsa (isProtected === false):
        if (threatStartedAtMove !== null) {
            /**
             * 🚨 İHANET MANTIĞI:
             * 1. Eğer tehdit başladığından beri hamle sayısı ARTTIYSA (sahibi hamlesini yaptıysa).
             * 2. Ve şu an hamle sırası bu taşın renginde değilse (Sıra rakibe geçtiyse).
             */
            if (threatStartedAtMove < core.history.length && core.turn !== color) {
                return 2; // 🔴 DURUM 2: KIRMIZI (İhanet vakti!)
            }
        }

        // Eğer henüz aynı hamle içindeysek veya sıra hala sahibindeyse -> Sadece MAVİ
        return 1; // 🔵 DURUM 1: MAVİ
    }
};