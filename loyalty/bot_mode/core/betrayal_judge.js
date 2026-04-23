// core/betrayal_judge.js

export const BetrayalJudge = {
    // Kare indeksi: Durum Bilgisi (PURPLE, BLUE, RED, LOCKED)
    neglectRegistry: {}, 

    // LoyaltyChess: Sadece Kale, At ve Fil ihanet edebilir.
    allowedTypes: ['r', 'n', 'b'],

    /**
     * @param {Array} board - GameCore.board
     * @param {string} currentTurn - GameCore.turn (Hamleyi az önce tamamlayan renk)
     * @param {Object} core - GameCore referansı
     */
    evaluate(board, currentTurn, core) {
        const betrayals = [];
        const lastMove = core.lastMove;

        // --- 1. ADIM: SIKI TEMİZLİK ---
        for (const idx in this.neglectRegistry) {
            const i = parseInt(idx);
            const piece = board[i];

            if (!piece) { 
                delete this.neglectRegistry[i]; 
                continue; 
            }

            const pColor = piece.startsWith('w') ? 'w' : 'b';
            const pOpponent = (pColor === 'w') ? 'b' : 'w';

            const stillThreatened = core.isSquareAttacked(i, pOpponent, board);
            const nowProtected = core.isSquareAttacked(i, pColor, board);

            // Analiz logları
            if (this.neglectRegistry[i]) {
                console.log(`🔍 [ANALİZ - ${core.indexToCoord(i)}]:`);
                console.log(`   - Rakip Tehdidi: ${stillThreatened ? '⚠️ VAR' : '✅ YOK'}`);
                console.log(`   - Kendi Koruması: ${nowProtected ? '🛡️ KORUNUYOR' : '❌ KORUMASIZ'}`);
            }

            // Koruma geldiyse veya tehdit kalktıysa sicili temizle!
            if (nowProtected || !stillThreatened) {
                delete this.neglectRegistry[i];
            }
        }

        // --- 2. ADIM: RADAR VE SEVİYELEME ---
        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (!piece) continue;

            const [pColor, pType] = piece.split('-');
            if (!this.allowedTypes.includes(pType)) continue;

            const pOpponent = (pColor === 'w') ? 'b' : 'w';
            const isUnderAttack = core.isSquareAttacked(i, pOpponent, board);
            const isProtected = core.isSquareAttacked(i, pColor, board);

            // Eğer taş hem tehdit altında hem de korumasızsa:
            if (isUnderAttack && !isProtected) {
                const currentState = this.neglectRegistry[i];

                // A) AKTİF OYUNCU (Hamlesini bitiren kişi bu taşı kurtarmadıysa)
                if (pColor === currentTurn) {
                    if (!currentState) {
                        if (lastMove && lastMove.to == i) {
                            this.neglectRegistry[i] = 'PURPLE'; 
                        } else {
                            this.neglectRegistry[i] = 'BLUE';
                        }
                    } else {
                        // Mevcut seviyeyi yükselt
                        if (currentState === 'PURPLE') {
                            this.neglectRegistry[i] = 'BLUE';
                        } 
                        else if (currentState === 'BLUE') {
                            // --- 🚩 KRİTİK: SARAY MUHAFIZI VE ÇATAL KONTROLÜ ---
                            const isThreateningKing = this.checkKingThreat(i, board, core);
                            const isRoyalFork = this.checkRoyalFork(i, board, core);

                            if (isThreateningKing || isRoyalFork) {
                                this.neglectRegistry[i] = 'LOCKED'; 
                                console.warn(`🛡️ KİLİTLENDİ: [${core.indexToCoord(i)}] şah tehlikesi nedeniyle kontrol edilemez!`);
                            } else {
                                this.neglectRegistry[i] = 'RED';
                            }
                        } 
                        else if (currentState === 'RED') {
                            betrayals.push({ index: i, piece, type: pType, coord: core.indexToCoord(i) });
                        }
                        // Eğer zaten LOCKED ise ve hala ihmal ediliyorsa kilit açılma kontrolü
                        else if (currentState === 'LOCKED') {
                            const stillThreateningKing = this.checkKingThreat(i, board, core);
                            const stillRoyalFork = this.checkRoyalFork(i, board, core);

                            if (!stillThreateningKing && !stillRoyalFork) {
                                this.neglectRegistry[i] = 'RED'; // Tehlike bitti, artık hain olabilir
                            }
                        }
                    }
                } 
                // B) PASİF OYUNCU
                else {
                    if (!currentState) {
                        this.neglectRegistry[i] = 'BLUE';
                    }
                }
            }
        }

        // --- 3. ADIM: DEBUG KONSOLU (TABLO) ---
        if (Object.keys(this.neglectRegistry).length > 0) {
            console.log("-----------------------------------------");
            console.log("📋 SADAKAT TAKİP LİSTESİ (Registry)");
            
            const debugTable = {};
            for (const idx in this.neglectRegistry) {
                const coord = core.indexToCoord(idx);
                debugTable[coord] = {
                    'İndeks': idx,
                    'Durum': this.neglectRegistry[idx],
                    'Hain mi?': this.neglectRegistry[idx] === 'RED' ? '✅ EVET' : (this.neglectRegistry[idx] === 'LOCKED' ? '🚫 KİLİTLİ' : '❌ Hayır')
                };
            }
            console.table(debugTable);
            console.log("-----------------------------------------");
        }

        return betrayals;
    },

    /**
     * Taşın kendi şahını tehdit edip etmediğini kontrol eder.
     */
    checkKingThreat(idx, board, core) {
        const piece = board[idx];
        if (!piece) return false;
        
        const color = piece.startsWith('w') ? 'w' : 'b';
        const kingIdx = board.findIndex(p => p === `${color}-k`);
        
        if (kingIdx === -1) return false;

        const moves = core.getPieceMoves(idx, board, true);
        return moves.includes(kingIdx);
    },

    /**
     * 🚩 ŞAH ÇATALI KONTROLÜ
     * Bu taşı tehdit eden rakip taş, aynı zamanda Şahı da tehdit ediyor mu?
     */
    checkRoyalFork(idx, board, core) {
        const piece = board[idx];
        if (!piece) return false;

        const color = piece.startsWith('w') ? 'w' : 'b';
        const opponentColor = color === 'w' ? 'b' : 'w';
        const kingIdx = board.findIndex(p => p === `${color}-k`);

        if (kingIdx === -1) return false;

        // Tahtadaki tüm rakip taşları tara
        for (let r = 0; r < 64; r++) {
            const attacker = board[r];
            if (attacker && attacker.startsWith(opponentColor)) {
                // Rakip taşın saldırı menzilini al
                const attackerMoves = core.getPieceMoves(r, board, true);
                
                // Eğer bu saldırgan HEM bu taşı HEM Şahı istiyorsa: ÇATAL!
                if (attackerMoves.includes(idx) && attackerMoves.includes(kingIdx)) {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * Renderer (UI) için durum grupları oluşturur.
     */
    getStatusGroups() {
        const groups = { purple: [], blue: [], red: [], locked: [] };

        for (const idx in this.neglectRegistry) {
            const status = this.neglectRegistry[idx];
            const i = parseInt(idx);
            if (status === 'PURPLE') groups.purple.push(i);
            else if (status === 'BLUE') groups.blue.push(i);
            else if (status === 'RED') groups.red.push(i);
            else if (status === 'LOCKED') groups.locked.push(i);
        }

        return groups;
    },

    reset() { 
        this.neglectRegistry = {}; 
        console.log("🧹 Betrayal Registry Sıfırlandı.");
    }
};