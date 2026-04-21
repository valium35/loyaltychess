// core/betrayal_judge.js

export const BetrayalJudge = {
    // Kare indeksi: Durum Bilgisi (PURPLE, BLUE, RED)
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
        // Listeyi tarıyoruz; eğer bir taş artık korunuyorsa veya tehdit bittiyse anında siliyoruz.
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

            // Sadece şüphelendiğimiz taşlar için (örneğin At veya senin o an baktığın kare) log bas
    if (this.neglectRegistry[i]) {
        console.log(`🔍 [ANALİZ - ${core.indexToCoord(i)}]:`);
        console.log(`   - Rakip Tehdidi: ${stillThreatened ? '⚠️ VAR' : '✅ YOK'}`);
        console.log(`   - Kendi Koruması: ${nowProtected ? '🛡️ KORUNUYOR' : '❌ KORUMASIZ'}`);
    }
    
            // KRİTİK: Koruma geldiyse veya tehdit kalktıysa sicili temizle!
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
                        // Yeni bir feda/ihmal durumu
                        if (lastMove && lastMove.to == i) {
                            this.neglectRegistry[i] = 'PURPLE'; // Yeni feda
                        } else {
                            this.neglectRegistry[i] = 'BLUE';   // Zaten oradaydı ama korumadı
                        }
                    } else {
                        // Mevcut seviyeyi yükselt (Purple -> Blue -> Red)
                        if (currentState === 'PURPLE') this.neglectRegistry[i] = 'BLUE';
                        else if (currentState === 'BLUE') this.neglectRegistry[i] = 'RED';
                        else if (currentState === 'RED') {
                            // Kırmızıdayken hala ihmal edilirse ihanet listesine girer
                            betrayals.push({ index: i, piece, type: pType, coord: core.indexToCoord(i) });
                        }
                    }
                } 
                // B) PASİF OYUNCU (Sıra ona geçti, taşı tehdit altında ama henüz hamle yapmadı)
                else {
                    if (!currentState) {
                        this.neglectRegistry[i] = 'BLUE'; // İlk radar tespiti
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
                    'Hain mi?': this.neglectRegistry[idx] === 'RED' ? '✅ EVET' : '❌ Hayır'
                };
            }
            console.table(debugTable);
            console.log("-----------------------------------------");
        }

        return betrayals;
    },

    /**
     * Renderer (UI) için durum grupları oluşturur.
     */
    getStatusGroups() {
        const groups = { purple: [], blue: [], red: [] };

        for (const idx in this.neglectRegistry) {
            const status = this.neglectRegistry[idx];
            const i = parseInt(idx);
            if (status === 'PURPLE') groups.purple.push(i);
            else if (status === 'BLUE') groups.blue.push(i);
            else if (status === 'RED') groups.red.push(i);
        }

        return groups;
    },

    reset() { 
        this.neglectRegistry = {}; 
        console.log("🧹 Betrayal Registry Sıfırlandı.");
    }
};