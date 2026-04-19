// core/betrayal_judge.js - SAF KURAL MOTORU

export const BetrayalJudge = {
    betrayableTypes: ['n', 'b', 'r'], // At, Fil ve Kale

    /**
     * SADECE VERİ ALIR, KARAR DÖNER.
     * Bu fonksiyon artık 'core' objesine bağımlı değildir.
     * @param {Object} params - Gerekli tüm durum verileri
     */
    evaluateStatus(params) {
        const {
            piece,          // 'w-b' vb.
            isAttacked,     // true/false
            isProtected,    // true/false
            threatEntry,    // threatHistory[i]
            historyLength,  // history.length
            currentTurn,    // 'w' veya 'b'
            isCheck         // Şah altında olma durumu
        } = params;

        // 🛡️ Güvenlik Kontrolleri
        if (!piece) return 0;
        const [color, type] = piece.split('-');

        // 1. KURAL: Tip kontrolü
        if (!this.betrayableTypes.includes(type)) return 0;

        // 2. KURAL: Şah çekilmişse ihanet olmaz
        if (isCheck) return 0;

        // 3. KURAL: Aktif saldırı yoksa tehdit yoktur
        if (!isAttacked) return 0;

        // 4. KURAL: Korunuyorsa sadece MAVİ (1)
        if (isProtected) return 1;

        // 🔴 DURUM 2: İHANET SORGULAMA (Kırmızı vizesi)
        if (threatEntry && threatEntry.start !== undefined) {
            // ŞART A: Zaman Aşımı
            const hasOneMovePassed = historyLength > threatEntry.start;
            
            // ŞART B: Korunmasızlık (Zaten yukarıda if(isProtected) ile elendi ama netlik için kalsın)
            const isStillExposed = isAttacked && !isProtected;

            // ŞART C: Sıra bu taşın asıl sahibinde değilse (Hamle hakkını kullanıp terk ettiyse)
            const isNotOwnersTurn = currentTurn !== color;

            if (hasOneMovePassed && isStillExposed && isNotOwnersTurn) {
                return 2; // 🔴 KIRMIZI
            }
        }

        return 1; // Şartlar olgunlaşmadıysa MAVİ
    },

    /**
     * Taşın fiili sahibini döner. 
     * Simülasyonlar için 'customBetrayals' desteği eklendi.
     */
    getServantColor(core, idx, customBetrayals = null) {
        const piece = core.board[idx];
        if (!piece) return null;
        const [originalColor] = piece.split('-');
        
        const activeList = customBetrayals || core.activeBetrayals;
        const betrayal = activeList.find(b => b.sq === idx);
        
        return betrayal ? betrayal.target : originalColor;
    }
};