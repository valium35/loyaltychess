/**
 * LoyaltyChess - İhanet ve Sadakat Motoru (Saldırı İmzası + Gelişmiş Çatal Koruması)
 * Tahtadaki saldırıları izler ve korumasız bırakılan taşları "Hain" ilan eder.
 */
const LoyaltyEngine = {
    previousThreats: [], 
    currentNewTraitors: [], 
    allAttacks: [], 
    wasCheckBeforeMove: false, // AF SÜRESİ: Hamleden önce şah altındaydı mı?

    // YARDIMCI: Bir kareye saldıran tüm rakip taşların listesini çıkarır
    getAttackerSignature: function(layout, targetIndex, attackerColor) {
        let attackers = [];
        for (let i = 0; i < 64; i++) {
            if (layout[i] && layout[i].startsWith(attackerColor)) {
                if (typeof window.getRawMoves === 'function' && window.getRawMoves(i, true).includes(targetIndex)) {
                    attackers.push(i);
                }
            }
        }
        return attackers.sort((a, b) => a - b).join(',');
    },

    // A. TÜM SALDIRILARI GÜNCELLE (Mavi Işıklar İçin)
    updateAllAttacks: function(layout, activeTurn) {
        let list = [];
        const attackerColor = (activeTurn === 'w' ? 'b' : 'w');
        for (let i = 0; i < 64; i++) {
            if (layout[i] && layout[i].startsWith(activeTurn)) {
                if (typeof window.isSquareAttacked === 'function' && window.isSquareAttacked(i, attackerColor)) {
                    list.push(i);
                }
            }
        }
        this.allAttacks = list;
    },

    // B. FOTOĞRAF ÇEK
    takeSnapshot: function(currentLayout, turnColor) {
        this.previousThreats = this.getAllUnprotected(currentLayout, turnColor);
        
        const kingPos = typeof window.findKing === 'function' ? window.findKing(turnColor) : -1;
        const opponentColor = (turnColor === 'w' ? 'b' : 'w');
        if (kingPos !== -1 && typeof window.isSquareAttacked === 'function') {
            this.wasCheckBeforeMove = window.isSquareAttacked(kingPos, opponentColor);
        } else {
            this.wasCheckBeforeMove = false;
        }
    },

    // C. İHANETİ TESPİT ET (Hüküm Vakti)
    findNewThreats: function(currentLayout, playerWhoJustMoved) {
        const opponentColor = (playerWhoJustMoved === 'w' ? 'b' : 'w');
        const myColor = playerWhoJustMoved;

        // --- ASALET PROTOKOLÜ ---
        const opponentKingPos = typeof window.findKing === 'function' ? window.findKing(opponentColor) : -1;
        if (opponentKingPos !== -1 && typeof window.isSquareAttacked === 'function') {
            if (window.isSquareAttacked(opponentKingPos, myColor)) {
                this.currentNewTraitors = [];
                return; 
            }
        }

        if (this.wasCheckBeforeMove) {
            this.currentNewTraitors = [];
            this.wasCheckBeforeMove = false;
            return;
        }

        const allUnprotected = this.getAllUnprotected(currentLayout, playerWhoJustMoved);

        // KRİTİK SÜZGEÇ: Saldırı İmzası Kontrolü
        this.currentNewTraitors = allUnprotected.filter(index => {
            if (!this.previousThreats.includes(index)) return false;

            const attackers = this.getAttackerSignature(currentLayout, index, opponentColor);
            const pieceSignature = `${index}-${currentLayout[index]}-atk:${attackers}`;

            return !window.betrayalHistory.has(pieceSignature);
        });

        // --- YENİ: OTOMATİK POP-UP TETİKLEYİCİ ---
        // Eğer filtreden geçen yeni hainler varsa pop-up patlasın
        if (this.currentNewTraitors.length > 0) {
            const lang = localStorage.getItem('gameLang') || 'tr';
            const title = lang === 'tr' ? "🔥 İHANET TESPİT EDİLDİ!" : "🔥 BETRAYAL DETECTED!";
            const msg = lang === 'tr' 
                ? "Sistem uyarısı: Bazı taşlar korunmadığı için saf değiştirdi! Onları artık kendi taşın gibi kullanabilirsin." 
                : "System alert: Some pieces switched sides because they were left unprotected! You can now use them as your own.";
            const law = lang === 'tr' ? "2. YASA: Korunmayan taş ihanete uğrar." : "LAW 2: Unprotected pieces are subject to betrayal.";

            if (typeof window.showPop === 'function') {
                window.showPop(title, msg, law, "#ff3333");
            }
        }

        // Kırmızı yanan her yeni imza kombinasyonunu hafızaya al
        this.currentNewTraitors.forEach(index => {
            const attackers = this.getAttackerSignature(currentLayout, index, opponentColor);
            const pieceSignature = `${index}-${currentLayout[index]}-atk:${attackers}`;
            window.betrayalHistory.add(pieceSignature);
        });
    },

    // YARDIMCI: Sahipsiz tehditleri bulan motor
    getAllUnprotected: function(layout, targetColor) {
        let list = [];
        const attackerColor = (targetColor === 'w' ? 'b' : 'w');
        for (let i = 0; i < 64; i++) {
            const piece = layout[i];
            if (piece && piece.startsWith(targetColor) && ['n', 'b', 'r'].includes(piece[2])) {
                if (typeof window.isSquareAttacked === 'function' && window.isSquareAttacked(i, attackerColor)) {
                    if (!this.isPieceProtected(layout, i, targetColor)) {
                        list.push(i);
                    }
                }
            }
        }
        return list;
    },

    // YARDIMCI: Koruma Kontrolü
    isPieceProtected: function(layout, index, color) {
        const originalPiece = layout[index];
        layout[index] = ''; 
        let protected = false;
        for (let i = 0; i < 64; i++) {
            if (layout[i] && layout[i].startsWith(color) && i !== index) {
                if (typeof window.getRawMoves === 'function' && window.getRawMoves(i, true).includes(index)) {
                    protected = true;
                    break;
                }
            }
        }
        layout[index] = originalPiece;
        return protected;
    }
};

console.log("LOYALTY ENGINE: OTOMATİK POP-UP SİSTEMİ DEVREDE!");