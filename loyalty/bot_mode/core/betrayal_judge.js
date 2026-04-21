// core/betrayal_judge.js

export const BetrayalJudge = {
    // Kare indeksi: Durum Bilgisi (PURPLE, BLUE, RED)
    neglectRegistry: {}, 

    // LoyaltyChess: Sadece Kale, At ve Fil ihanet edebilir.
    allowedTypes: ['r', 'n', 'b'],

    /**
     * @param {Array} board - GameCore.board
     * @param {string} currentTurn - GameCore.turn
     * @param {Object} core - GameCore referansı
     */
evaluate(board, currentTurn, core) {
        const betrayals = [];
        const enemyColor = (currentTurn === 'w') ? 'b' : 'w';
        const lastMove = core.lastMove;

        // --- 1. ADIM: GENEL TEMİZLİK ---
        for (const idx in this.neglectRegistry) {
            const i = parseInt(idx);
            const piece = board[i];
            if (!piece) { delete this.neglectRegistry[i]; continue; }

            const pieceColor = piece.startsWith('w') ? 'w' : 'b';
            const oppColor = pieceColor === 'w' ? 'b' : 'w';

            if (!core.isSquareAttacked(i, oppColor, board) || core.isSquareAttacked(i, pieceColor, board)) {
                delete this.neglectRegistry[i];
            }
        }

        // --- 2. ADIM: ÇİFT YÖNLÜ RADAR TARAMASI ---
        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (!piece) continue;

            const [pColor, pType] = piece.split('-');
            if (!this.allowedTypes.includes(pType)) continue;

            const pOpponent = pColor === 'w' ? 'b' : 'w';
            const isUnderAttack = core.isSquareAttacked(i, pOpponent, board);
            const isProtected = core.isSquareAttacked(i, pColor, board);

            if (isUnderAttack && !isProtected) {
                const currentState = this.neglectRegistry[i];

                // A) AKTİF OYUNCU (Hamlesini yeni bitiren)
                if (pColor === currentTurn) {
                    if (!currentState) {
                        // Yeni geldiyse MOR, zaten oradaysa (ve pas geçildiyse) MAVİ
                        if (lastMove && lastMove.to == i) {
                            this.neglectRegistry[i] = 'PURPLE';
                        } else {
                            this.neglectRegistry[i] = 'BLUE';
                        }
                    } else {
                        // Mevcut durumu yükselt (Purple -> Blue -> Red)
                        if (currentState === 'PURPLE') this.neglectRegistry[i] = 'BLUE';
                        else if (currentState === 'BLUE') this.neglectRegistry[i] = 'RED';
                        else if (currentState === 'RED') {
                            betrayals.push({ index: i, piece, type: pType, coord: core.indexToCoord(i) });
                            delete this.neglectRegistry[i];
                        }
                    }
                } 
                // B) PASİF OYUNCU (Sıra kendisine geçen - 0.5 Hamle Mantığı)
                else {
                    // Eğer bu taş henüz radara girmediyse, ANINDA Mavi yap
                    if (!currentState) {
                        this.neglectRegistry[i] = 'BLUE';
                        console.log(`📡 Radar: [${core.indexToCoord(i)}] anlık tehdit algıladı!`);
                    }
                }
            }
        }
        return betrayals;
    },

    reset() { this.neglectRegistry = {}; }
};