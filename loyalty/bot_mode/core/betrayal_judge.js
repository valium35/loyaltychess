// core/betrayal_judge.js

export const BetrayalJudge = {

    betrayableTypes: ['n', 'b', 'r'],

    getServantColor(core, idx) {
        const piece = core.board[idx];
        if (!piece) return null;

        const [originalColor] = piece.split('-');
        const betrayal = core.activeBetrayals.find(b => b.sq === idx);

        return betrayal ? betrayal.target : originalColor;
    },

    getSquareStatus(core, idx) {
        // 🛡️ Güvenlik Kontrolleri
        if (!core || idx === null || idx === undefined || idx < 0 || idx > 63) return 0;

        const piece = core.board[idx];
        if (!piece) return 0;

        const [color, type] = piece.split('-');

        // Sadece belirli taş tipleri ihanet edebilir
        if (!this.betrayableTypes.includes(type)) return 0;

        // Şah çekilmişse, taşlar korkudan ihanet edemez (Önce şahı kurtarmalı)
        if (core.isCheck(color)) return 0;

        const opponent = (color === 'w' ? 'b' : 'w');

        // 1. KONTROL: Saldırı var mı?
        const isAttacked = core.isSquareAttacked(idx, opponent, core.board, true);
        if (!isAttacked) return 0;

        // 2. KONTROL: Koruma var mı?
        const isProtected = core.isSquareAttacked(idx, color, core.board, true);

        // 🔵 DURUM 1: Eğer taş korunuyorsa sadece MAVİ (tehdit var ama sadık)
        if (isProtected) return 1;

        // 🔴 DURUM 2: İHANET SORGULAMA (Korumasız ve Beklemiş mi?)
        const t = core.threatHistory[idx];

        // Tehdit geçmişi objesi mevcut mu?
        if (t && t.start !== undefined) {
            
            // ŞART A: Tehdit başladığından beri en az 1 hamle sırası geçti mi?
            const hasOneMovePassed = core.history.length > t.start;

            // ŞART B: Şu an hala korunmasız mı ve hala rakip istiyor mu?
            const isStillExposed = 
                core.isSquareAttacked(idx, opponent, core.board, true) && 
                !core.isSquareAttacked(idx, color, core.board, true);

            // ŞART C: Sıra bu taşın asıl sahibinde DEĞİLSE (İhanet hamlesi için vize)
            const isNotOwnersTurn = core.turn !== color;

            if (hasOneMovePassed && isStillExposed && isNotOwnersTurn) {
                return 2; // 🔴 İHANET KESİNLEŞTİ (Kırmızı)
            }
        }

        // Default: Hiçbir şart uymuyorsa ama saldırı varsa MAVİ
        return 1;
    }
};