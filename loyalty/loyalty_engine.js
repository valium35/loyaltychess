const LoyaltyEngine = {
    previousThreats: [], // Hamle öncesi sahipsiz tehditler
    currentNewTraitors: [], // Sadece bu hamleyle doğan taze hainler

    // 1. ADIM: FOTOĞRAF ÇEK (Hamle yapılmadan hemen önce çağrılır)
    takeSnapshot: function(currentLayout, opponentColor) {
        // Rakibin o anki tüm "korunmayan" tehditlerini listele
        this.previousThreats = this.getAllUnprotected(currentLayout, opponentColor);
        console.log("ESKİ TEHDİTLER FOTOĞRAFLANDI:", this.previousThreats);
    },

    // 2. ADIM: FARKI BUL (Hamle yapıldıktan sonra çağrılır)
    findNewThreats: function(currentLayout, activeTurn) {
        // Sıra değiştiği için 'activeTurn' şu an hamle yapan taraf
        const allCurrentThreats = this.getAllUnprotected(currentLayout, activeTurn);
        
        // Süzgeç: "Şu an listede olan ama az önce fotoğrafta olmayanları" bul
        this.currentNewTraitors = allCurrentThreats.filter(index => !this.previousThreats.includes(index));
        
        console.log("YENİ DOĞAN HAİNLER:", this.currentNewTraitors);
    },

    // YARDIMCI: Tahtadaki tüm sahipsiz (At, Fil, Kale) tehditleri bulan motor
    getAllUnprotected: function(layout, targetColor) {
        let list = [];
        const attackerColor = targetColor === 'w' ? 'b' : 'w';

        for (let i = 0; i < 64; i++) {
            const piece = layout[i];
            // Kural: Piyon ve Vezir hariç
            if (piece && piece.startsWith(targetColor) && ['n', 'b', 'r'].includes(piece[2])) {
                // isSquareAttacked fonksiyonunu ana motordan ödünç alıyoruz
                if (window.isSquareAttacked(i, attackerColor)) {
                    // isPieceProtected fonksiyonunu aşağıda tanımladık
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
        layout[index] = ''; // X-Ray kontrolü için geçici kaldır
        let protected = false;
        
        for (let i = 0; i < 64; i++) {
            if (layout[i] && layout[i].startsWith(color) && i !== index) {
                // getRawMoves fonksiyonunu ana motordan ödünç alıyoruz
                if (window.getRawMoves(i, true).includes(index)) {
                    protected = true;
                    break;
                }
            }
        }
        layout[index] = originalPiece;
        return protected;
    }
};
