/**
 * LoyaltyChess - İhanet ve Sadakat Motoru (Saldırı İmzası Destekli)
 * Tahtadaki saldırıları izler ve korumasız bırakılan taşları "Hain" ilan eder.
 */
const LoyaltyEngine = {
    previousThreats: [], 
    currentNewTraitors: [], 
    allAttacks: [], 

    // YENİ YARDIMCI: Bir kareye saldıran tüm rakip taşların listesini çıkarır
    getAttackerSignature: function(layout, targetIndex, attackerColor) {
        let attackers = [];
        for (let i = 0; i < 64; i++) {
            if (layout[i] && layout[i].startsWith(attackerColor)) {
                // Sadece saldırı menzilinde mi diye bakıyoruz
                if (typeof window.getRawMoves === 'function' && window.getRawMoves(i, true).includes(targetIndex)) {
                    attackers.push(i);
                }
            }
        }
        // Saldıranları sıralayalım (Örn: "40,58") ki imza her zaman aynı çıksın
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
    takeSnapshot: function(currentLayout, opponentColor) {
        this.previousThreats = this.getAllUnprotected(currentLayout, opponentColor);
    },

    // C. İHANETİ TESPİT ET (Hüküm Vakti)
    findNewThreats: function(currentLayout, playerWhoJustMoved) {
        const opponentColor = (playerWhoJustMoved === 'w' ? 'b' : 'w');
        const allUnprotected = this.getAllUnprotected(currentLayout, playerWhoJustMoved);

        // KRİTİK SÜZGEÇ: Saldırı İmzası Kontrolü
        this.currentNewTraitors = allUnprotected.filter(index => {
            // Sadece hamle öncesi de tehdit altındaysa (Snapshot kontrolü)
            if (!this.previousThreats.includes(index)) return false;

            // Örnek İmza: "18-w-n-atk:40,58"
            const attackers = this.getAttackerSignature(currentLayout, index, opponentColor);
            const pieceSignature = `${index}-${currentLayout[index]}-atk:${attackers}`;

            // Eğer bu özel saldırı kombinasyonu hafızada yoksa -> KIRMIZI YAK!
            return !window.betrayalHistory.has(pieceSignature);
        });

        // Kırmızı yanan her yeni imza kombinasyonunu hafızaya al
        this.currentNewTraitors.forEach(index => {
            const attackers = this.getAttackerSignature(currentLayout, index, opponentColor);
            const pieceSignature = `${index}-${currentLayout[index]}-atk:${attackers}`;
            window.betrayalHistory.add(pieceSignature);
        });
    },

    // YARDIMCI: Sahipsiz (At, Fil, Kale) tehditleri bulan motor
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

console.log("LOYALTY ENGINE: SALDIRI İMZASI SİSTEMİ DEVREDE!");