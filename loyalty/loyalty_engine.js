/**
 * LoyaltyChess - İhanet ve Sadakat Motoru
 * Kurallar: 
 * 1. Piyon ve Vezir ihanet etmez.
 * 2. Tehdit altındaki taş (At, Fil, Kale) kaçmaz veya korunmazsa (blokaj dahil) ihanet eder.
 * 3. İhanet hamlesi yapan taş şah çekemez ve hamle sonunda oyundan çıkar.
 */

const LoyaltyEngine = {
    threatenedList: [], // Bir önceki hamlede sahipsiz bırakılan taşlar
    isBetrayalMode: false, // Şu an bir ihanet hamlesi mi yapılıyor?

    // 1. ADIM: TAHTAYI TARA (Her hamle sonunda logic_player.js'den çağırılacak)
    scanBoard: function(layout, opponentColor) {
        this.threatenedList = [];
        const myColor = opponentColor === 'w' ? 'b' : 'w';

        for (let i = 0; i < 64; i++) {
            const piece = layout[i];
            // Kural: Sadece At(n), Fil(b) ve Kale(r) ihanet edebilir.
            if (piece && piece.startsWith(opponentColor) && ['n', 'b', 'r'].includes(piece[2])) {
                
                // Eğer bu taş rakip tarafından isteniyorsa
                if (isSquareAttacked(i, myColor)) {
                    // Ve eğer kendi arkadaşları tarafından KORUNMUYORSA
                    if (!this.isProtected(layout, i, opponentColor)) {
                        this.threatenedList.push(i);
                        console.log(`HAİN ADAYI: ${piece} - Konum: ${i}`);
                    }
                }
            }
        }
    },

    // 2. ADIM: KORUMA KONTROLÜ (Blokaj ve Destek)
    isProtected: function(layout, targetIndex, pieceColor) {
        // Geçici olarak hedef taşı tahtadan kaldırıp arkasındaki korumayı simüle ediyoruz
        // (X-Ray koruma mantığı için önemli)
        const originalPiece = layout[targetIndex];
        layout[targetIndex] = ''; 
        
        let protected = false;
        // Kendi rengindeki taşlar buraya saldırabiliyor mu? (Yani koruyor mu?)
        for (let i = 0; i < 64; i++) {
            if (layout[i] && layout[i].startsWith(pieceColor)) {
                // getRawMoves fonksiyonunu logic_player'dan ödünç alıyoruz
                if (getRawMoves(i, true).includes(targetIndex)) {
                    protected = true;
                    break;
                }
            }
        }
        
        layout[targetIndex] = originalPiece; // Taşı geri koy
        return protected;
    },

    // 3. ADIM: İHANET HAMLESİ YASAL MI? (Şah çekemez kuralı)
    canBetrayerMoveHere: function(layout, from, to, color) {
        const piece = layout[from];
        const originalTo = layout[to];
        
        // Simülasyon: Hamleyi yap
        layout[to] = piece;
        layout[from] = '';
        
        const opponent = color === 'w' ? 'b' : 'w';
        const kingPos = findKing(opponent);
        
        // Kural: İhanet eden taş ŞAH ÇEKEMEZ
        const givesCheck = isSquareAttacked(kingPos, color);
        
        // Geri al
        layout[from] = piece;
        layout[to] = originalTo;
        
        return !givesCheck;
    },

    // 4. ADIM: SON GÖREV (Hamle bittiğinde taşı yok et)
    executeFinalMission: function(layout, index) {
        layout[index] = ''; // Taş görevini tamamladı ve aramızdan ayrıldı.
        this.isBetrayalMode = false;
        console.log("İhanet tamamlandı, taş imha edildi.");
    }
};
