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

        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            
            // 1. KONTROL: Kare boş mu veya sıra bu taşın sahibinde mi?
            if (!piece || !piece.startsWith(currentTurn)) {
                delete this.neglectRegistry[i];
                continue;
            }

            const [color, type] = piece.split('-');

            // 2. KONTROL: Taş ihanet edebilecek bir tür mü? (r, n, b)
            if (!this.allowedTypes.includes(type)) {
                delete this.neglectRegistry[i];
                continue;
            }

            // KONTROL 3: Mevcut Tehdit Durumu
            const isUnderAttack = core.isSquareAttacked(i, enemyColor, board);
            const isProtected = core.isSquareAttacked(i, currentTurn, board);

            if (isUnderAttack && !isProtected) {
                const currentState = this.neglectRegistry[i];

                // --- YENİ TEHDİT BAŞLANGICI ---
                if (!currentState) {
                    // KAPI A: Taş yeni taşındıysa MOR (Feda)
                    if (lastMove && Number(lastMove.to) === i) {
                        this.neglectRegistry[i] = 'PURPLE';
                        console.log(`🟣 [${core.indexToCoord(i)}] FEDA - Mor yandı.`);
                    } 
                    // KAPI B: Taş yerindeydi ama saldırı geldiyse MAVİ (Saldırı)
                    else {
                        this.neglectRegistry[i] = 'BLUE';
                        console.log(`🔵 [${core.indexToCoord(i)}] SALDIRI - Mavi yandı.`);
                    }
                    // İlk renk atamasını yaptık, bu turu bitiriyoruz
                    continue; 
                }

                // --- MEVCUT DURUM GEÇİŞLERİ ---
                if (currentState === 'PURPLE') {
                    this.neglectRegistry[i] = 'BLUE';
                    console.log(`🔵 [${core.indexToCoord(i)}] TERK - Maviye döndü.`);
                } 
                else if (currentState === 'BLUE') {
                    this.neglectRegistry[i] = 'RED';
                    console.log(`🔴 [${core.indexToCoord(i)}] TEHLİKE - Kırmızı yandı.`);
                } 
                else if (currentState === 'RED') {
                    betrayals.push({
                        index: i,
                        piece: piece,
                        type: type,
                        coord: core.indexToCoord(i)
                    });
                    delete this.neglectRegistry[i];
                }
            } else {
                // Tehdit kalktıysa veya koruma geldiyse sicili temizle
                delete this.neglectRegistry[i];
            }
        }

        return betrayals;
    },

    reset() {
        this.neglectRegistry = {};
    }
};