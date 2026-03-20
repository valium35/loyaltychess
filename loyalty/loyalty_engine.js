const LoyaltyEngine = {
    threatenedList: [],
    isBetrayalMode: false,

    scanBoard: function(layout, opponentColor) {
        this.threatenedList = [];
        const myColor = opponentColor === 'w' ? 'b' : 'w';

        for (let i = 0; i < 64; i++) {
            const piece = layout[i];
            // Kural: At(n), Fil(b), Kale(r)
            if (piece && piece.startsWith(opponentColor) && ['n', 'b', 'r'].includes(piece[2])) {
                // Eğer rakip (yani şu an hamlesini bitiren taraf) buraya saldırıyorsa
                if (window.isSquareAttacked(i, myColor)) {
                    // Ve korunmuyorsa
                    if (!this.isProtected(layout, i, opponentColor)) {
                        this.threatenedList.push(i);
                    }
                }
            }
        }
    },

    isProtected: function(layout, targetIndex, pieceColor) {
        const originalPiece = layout[targetIndex];
        layout[targetIndex] = ''; // Arkasındakini görmek için geçici kaldır
        let protected = false;
        for (let i = 0; i < 64; i++) {
            if (layout[i] && layout[i].startsWith(pieceColor)) {
                if (window.getRawMoves(i, true).includes(targetIndex)) {
                    protected = true;
                    break;
                }
            }
        }
        layout[targetIndex] = originalPiece;
        return protected;
    },

    executeFinalMission: function(layout, index) {
        layout[index] = ''; 
        this.isBetrayalMode = false;
        this.threatenedList = [];
    }
};
