/**
 * logic_bot.js
 * LoyaltyChess: Master Sürüm (Görsel Filtreleme & Saf Değiştirme Güncellemesi)
 */

// --- 1. DEĞİŞKENLER VE DURUM ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let enPassantTarget = null;
let hasMoved = {}; 
let moveCount = 1;
let gameHistory = []; 
window.betrayalHistory = new Set(); 

const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');
const logElement = document.getElementById('move-history'); 

function getT() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    if (typeof LoyaltyDict !== 'undefined' && LoyaltyDict[lang]) {
        return LoyaltyDict[lang];
    }
    return { status: "Sıra Beyazda", statusBlack: "Bot Düşünüyor...", statusCheck: " (ŞAH!)", popups: { alertTitle: "UYARI" } };
}

// --- LOG SİSTEMİ ---
function addToLog(notation, isBetrayal = false) {
    if (!logElement) return;

    // EĞER BEYAZ OYNUYORSA (Yeni Satır Başlat)
    if (turn === 'w' && !isBetrayal) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.id = 'move-' + moveCount;
        entry.innerHTML = `<span style="color:#f1c40f; font-weight:bold; margin-right:8px;">${moveCount}.</span> <span>${notation}</span>`;
        logElement.prepend(entry);
    } 
    // EĞER İHANET OLDUYSA VEYA SİYAH OYNUYORSA (Yan Sütuna Yaz)
    else {
        const lastEntry = document.getElementById('move-' + moveCount);
        if (lastEntry) {
            const style = isBetrayal ? 'color:#e74c3c; font-weight:bold;' : '';
            // Yanına yaz ve bir sonraki hamle numarasını hazırla
            lastEntry.innerHTML += ` &nbsp;&nbsp;&nbsp; <span style="${style}">${isBetrayal ? '!' + notation + '!' : notation}</span>`;
            moveCount++; 
        }
    }
}

function getNotation(from, to, isCapture) {
    const piece = layout[from];
    if (!piece) return "";
    const type = piece[2].toUpperCase();
    const targetLabel = getCoordsLabel(to);
    if (type === 'P') {
        if (isCapture) {
            const fromLabel = getCoordsLabel(from);
            return `${fromLabel[0]}x${targetLabel}`;
        }
        return `${targetLabel}`;
    }
    const moveSymbol = isCapture ? 'x' : '';
    return `${type}${moveSymbol}${targetLabel}`;
}

// --- 2. BAŞLATMA ---
const initialSetup = {
    0: 'b-r', 1: 'b-n', 2: 'b-b', 3: 'b-q', 4: 'b-k', 5: 'b-b', 6: 'b-n', 7: 'b-r',
    8: 'b-p', 9: 'b-p', 10: 'b-p', 11: 'b-p', 12: 'b-p', 13: 'b-p', 14: 'b-p', 15: 'b-p',
    48: 'w-p', 49: 'w-p', 50: 'w-p', 51: 'w-p', 52: 'w-p', 53: 'w-p', 54: 'w-p', 55: 'w-p',
    56: 'w-r', 57: 'w-n', 58: 'w-b', 59: 'w-q', 60: 'w-k', 61: 'w-b', 62: 'w-n', 63: 'w-r'
};

function initGame() {
    layout.fill('');
    Object.keys(initialSetup).forEach(i => layout[i] = initialSetup[i]);
    hasMoved = { 'w-k': false, 'b-k': false, 'w-r-56': false, 'w-r-63': false, 'b-r-0': false, 'b-r-7': false };
    moveCount = 1;
    turn = 'w';
    gameHistory = [];
    window.betrayalHistory.clear();
    draw();
    updateStatus();
}

// --- 3. YARDIMCI VE ANALİZ ---
function getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; }
function getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; }
function getCoordsLabel(i) { return 'abcdefgh'[i % 8] + '87654321'[Math.floor(i / 8)]; }

function isSquareAttacked(targetIndex, attackerColor) {
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            if (getRawMoves(i, true).includes(targetIndex)) return true;
        }
    }
    return false;
}

function findKing(color) {
    for (let i = 0; i < 64; i++) if (layout[i] === color + '-k') return i;
    return -1;
}

// --- 4. HAREKET MANTIĞI ---
function getLegalMoves(i) {
    const piece = layout[i];
    if (!piece || piece[0] !== turn) return [];
    
    const pieceColor = piece[0], pieceType = piece[2];
    let rawMoves = getRawMoves(i, false);

    return rawMoves.filter(move => {
        const targetPiece = layout[move];
        const { r: fromR, c: fromC } = getCoords(i);
        const { r: toR, c: toC } = getCoords(move);

        if (pieceType === 'p') {
            const isDiagonal = (fromC !== toC);
            if (isDiagonal && !targetPiece && move !== enPassantTarget) return false;
            if (!isDiagonal && targetPiece) return false;
        }

        if (targetPiece && targetPiece.startsWith(pieceColor)) return false;

        const originalFrom = layout[i], originalTo = layout[move];
        layout[move] = originalFrom; layout[i] = '';
        const opponent = (turn === 'w' ? 'b' : 'w');
        const kingPos = findKing(turn);
        const selfSafe = (kingPos === -1) ? true : !isSquareAttacked(kingPos, opponent);

        layout[i] = originalFrom; layout[move] = originalTo;
        return selfSafe;
    });
}

function getRawMoves(i, onlyAttacks = false) {
    const piece = layout[i];
    if (!piece) return [];
    const color = piece[0], type = piece[2], { r, c } = getCoords(i);
    let moves = [];
    const directions = {
        'r': [[1,0],[-1,0],[0,1],[0,-1]], 
        'b': [[1,1],[1,-1],[-1,1],[-1,-1]],
        'q': [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],
        'n': [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]],
        'k': [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
    };

    if (['r', 'b', 'q'].includes(type)) {
        directions[type].forEach(d => {
            for(let j=1; j<8; j++) {
                const target = getIndex(r + d[0]*j, c + d[1]*j);
                if (target === null) break;
                if (!layout[target]) moves.push(target);
                else { moves.push(target); break; }
            }
        });
    } else if (type === 'n' || type === 'k') {
        directions[type].forEach(d => {
            const target = getIndex(r + d[0], c + d[1]);
            if (target !== null) moves.push(target);
        });
        if (type === 'k' && !onlyAttacks && !hasMoved[color+'-k']) {
            const opponent = color === 'w' ? 'b' : 'w';
            const r7 = getIndex(r, 7), f = getIndex(r, 5), g = getIndex(r, 6);
            if (!hasMoved[color+'-r-'+r7] && !layout[f] && !layout[g]) {
                if (!isSquareAttacked(i, opponent) && !isSquareAttacked(f, opponent) && !isSquareAttacked(g, opponent)) moves.push(g);
            }
            const r0 = getIndex(r, 0), d = getIndex(r, 3), c_pos = getIndex(r, 2), b = getIndex(r, 1);
            if (!hasMoved[color+'-r-'+r0] && !layout[d] && !layout[c_pos] && !layout[b]) {
                if (!isSquareAttacked(i, opponent) && !isSquareAttacked(d, opponent) && !isSquareAttacked(c_pos, opponent)) moves.push(c_pos);
            }
        }
    } else if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        if (!onlyAttacks) {
            const f1 = getIndex(r + dir, c);
            if (f1 !== null && !layout[f1]) {
                moves.push(f1);
                // --- Mevcut piyon bloğunun içindeki zıplama kısmı ---
          if (!onlyAttacks) {
    const f1 = getIndex(r + dir, c);
    if (f1 !== null && !layout[f1]) {
        moves.push(f1);
        
        // ŞARTI DAHA NETLEŞTİRELİM:
        const isInitialRow = (color === 'w' && r === 6) || (color === 'b' && r === 1);
        if (isInitialRow) {
            const f2 = getIndex(r + 2 * dir, c);
            if (f2 !== null && !layout[f2]) {
                moves.push(f2);
            }
        }
    }
}
            }
        }
        [getIndex(r + dir, c - 1), getIndex(r + dir, c + 1)].forEach(diag => {
            if (diag !== null) {
                if (onlyAttacks || (layout[diag] && !layout[diag].startsWith(color)) || diag === enPassantTarget) {
                    moves.push(diag);
                }
            }
        });
    }
    return moves;
}

// --- 5. BOT ZEKA PARAMETRELERİ ---
const pieceValues = { 'p': 10, 'n': 32, 'b': 33, 'r': 50, 'q': 90, 'k': 20000 };

function evaluateBoard(tempLayout) {
    let score = 0;
    const moodSwing = (Math.random() * 0.4) + 0.8; 
    for (let i = 0; i < 64; i++) {
        const piece = tempLayout[i];
        if (!piece) continue;
        const color = piece[0], type = piece[2];
        let val = pieceValues[type] || 0;
        let total = val * 10 * moodSwing;

        if (typeof LoyaltyEngine !== 'undefined' && LoyaltyEngine.allAttacks.includes(i)) {
            total += (color === 'b' ? -150 : 150); 
        }
        score += (color === 'b' ? total : -total);
    }
    return score;
}

// --- 6. MINIMAX & ALPHA-BETA ---
function minimax(depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0) return evaluateBoard(layout);
    let moves = getAllLegalMovesForColor(isMaximizingPlayer ? 'b' : 'w');
    if (isMaximizingPlayer) {
        let best = -Infinity;
        for (let move of moves) {
            const oldF = layout[move.from], oldT = layout[move.to];
            layout[move.to] = layout[move.from]; layout[move.from] = '';
            best = Math.max(best, minimax(depth - 1, alpha, beta, false));
            layout[move.from] = oldF; layout[move.to] = oldT;
            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (let move of moves) {
            const oldF = layout[move.from], oldT = layout[move.to];
            layout[move.to] = layout[move.from]; layout[move.from] = '';
            best = Math.min(best, minimax(depth - 1, alpha, beta, true));
            layout[move.from] = oldF; layout[move.to] = oldT;
            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        return best;
    }
}

function minimaxRoot(depth, color) {
    let moves = getAllLegalMovesForColor(color);
    moves.sort(() => Math.random() - 0.5);
    let bestMove = null, bestValue = -Infinity;
    for (let move of moves) {
        const oldF = layout[move.from], oldT = layout[move.to];
        layout[move.to] = layout[move.from]; layout[move.from] = '';
        let boardValue = minimax(depth - 1, -Infinity, Infinity, false);
        layout[move.from] = oldF; layout[move.to] = oldT;
        if (boardValue > bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }
    return bestMove;
}

// --- 7. BOT ETKİLEŞİMİ ---
function makeBotMove() {
    let bestMove = minimaxRoot(3, 'b');
    if (bestMove) executeGameMove(bestMove.from, bestMove.to);
}

function executeGameMove(from, to) {
   // 1. Hamle yapılmadan önce tahtanın fotoğrafını çek (Kimin korumasız olduğunu anla)
    if (typeof LoyaltyEngine !== 'undefined') {
        LoyaltyEngine.takeSnapshot(layout, turn); 
    }

    executeMove(from, to);
    selectedSquare = null;
    finishTurn();
} 

function executeMove(from, to) {
    const piece = layout[from];
    if (!piece) return; // Güvenlik kontrolü

    const type = piece[2];
    const color = piece[0];

    // 1. Log Kaydı ve Geçmişe Ekleme
    addToLog(getNotation(from, to, layout[to] !== ''), false);
    gameHistory.push(`${from}-${to}`);

    // 2. GEÇERKEN ALMA (EN PASSANT) İNFAZI
    // Eğer piyon çapraz hamle yapıyor ama hedef kare boşsa, bu bir En Passant'tır
    if (type === 'p' && to === enPassantTarget) {
        const victimRow = Math.floor(from / 8); // Rakip piyonun satırı
        const victimCol = to % 8;              // Hedeflenen sütun
        layout[getIndex(victimRow, victimCol)] = ''; // Rakip piyonu tahtadan sil
    }

    // 3. ROK HAMLESİ (KALE TRANSFERİ)
    // Eğer Şah (k) yatayda 2 kare zıplıyorsa kaleyi de hareket ettir
    if (type === 'k' && Math.abs((from % 8) - (to % 8)) === 2) {
        const r = Math.floor(to / 8); // Mevcut satır (0 veya 7)
        const isKingside = (to % 8 === 6); // 'g' karesine mi gidiyor?
        
        const rookFrom = isKingside ? getIndex(r, 7) : getIndex(r, 0); // h veya a kalesi
        const rookTo = isKingside ? getIndex(r, 5) : getIndex(r, 3);   // f veya d karesi
        
        // Kaleyi şahın yanına ışınla
        layout[rookTo] = layout[rookFrom];
        layout[rookFrom] = '';
        
        // Kalenin de hareket ettiğini mühürle (Bir daha rok yapamasınlar diye)
        hasMoved[color + '-r-' + rookFrom] = true;
    }

    // 4. HAREKET BAYRAKLARINI GÜNCELLE (Rok Hakları İçin)
    if (type === 'k') {
        hasMoved[color + '-k'] = true;
    }
    if (type === 'r') {
        hasMoved[color + '-r-' + from] = true;
    }

    // 5. GEÇERKEN ALMA HEDEFİ BELİRLEME
    // Piyon 2 kare zıplarsa arkasında "En Passant" izi bırakır
    if (type === 'p' && Math.abs(Math.floor(from / 8) - Math.floor(to / 8)) === 2) {
        enPassantTarget = getIndex((Math.floor(from / 8) + Math.floor(to / 8)) / 2, from % 8);
    } else {
        enPassantTarget = null; // Diğer tüm hamlelerde bu izi sil
    }

    // 6. ASIL HAREKETİ GERÇEKLEŞTİR
    layout[to] = layout[from];
    layout[from] = '';

    // 7. PİYON TERFİSİ
    // Piyon son sıraya ulaştı mı?
    if (type === 'p' && (Math.floor(to / 8) === 0 || Math.floor(to / 8) === 7)) {
        // Bot ise otomatik Vezir (q), oyuncu ise sorar
        let choice = (turn === 'b') ? 'q' : (prompt("Terfi Seçin (q, r, b, n):", "q") || "q");
        layout[to] = color + '-' + choice.toLowerCase();
    }
}

// --- 8. TUR BİTİŞİ VE İHANET ---
function finishTurn() {
    const playerWhoJustMoved = turn; // Hamleyi bitiren (Beyaz)
    const opponent = (turn === 'w' ? 'b' : 'w');

    // --- ADIM 1: MEVCUT BASKIYI GÜNCELLE ---
    if (typeof LoyaltyEngine !== 'undefined') {
        LoyaltyEngine.updateAllAttacks(layout, playerWhoJustMoved);
    }

    // --- ADIM 2: ŞAH KONTROLÜ ---
    const kingPos = findKing(opponent);
    const isOpponentInCheck = isSquareAttacked(kingPos, playerWhoJustMoved);

    let betrayalOccurred = false;
    let traitorsCount = 0;

    if (typeof LoyaltyEngine !== 'undefined') {
        LoyaltyEngine.currentNewTraitors = [];

        if (!isOpponentInCheck) {
            LoyaltyEngine.findNewThreats(layout, playerWhoJustMoved);
        }

        if (LoyaltyEngine.currentNewTraitors.length > 0) {
            betrayalOccurred = true;
            traitorsCount = LoyaltyEngine.currentNewTraitors.length;

            LoyaltyEngine.currentNewTraitors.forEach(traitorIndex => {
                const piece = layout[traitorIndex];
                if (piece) {
                    // --- KURAL: AÇMAZ (PIN) KONTROLÜ ---
                    const originalTurn = turn;
                    turn = piece[0]; 
                    const legalMoves = getLegalMoves(traitorIndex); 
                    turn = originalTurn; 

                    if (legalMoves.length === 0) {
                        traitorsCount--;
                        if (traitorsCount === 0) finalizeTurnSwitch(opponent);
                        return; 
                    }

                    const parts = piece.split('-');
                    const type = parts[1];
                    const oldColor = piece[0]; // İhanet eden taşın orijinal rengi (Siyah)
                    const newOwner = playerWhoJustMoved; 
                    
                    // --- ADIM 3: SAF DEĞİŞTİR ---
                    layout[traitorIndex] = `${newOwner}-${type}`;

                    // --- ADIM 4: DARBE VUR (GÜNCELLENDİ) ---
                    let bestTarget = -1;
                    let highestValue = -1;

                    legalMoves.forEach(targetIdx => {
                        const targetPiece = layout[targetIdx];
                        // Sadece ESKİ renginden olan (oldColor/botun) taşları vurabilir.
                        // Böylece senin (Beyaz) taşlarını asla hedef alamaz.
                        if (targetPiece && targetPiece.startsWith(oldColor)) {
                            const val = pieceValues[targetPiece[2]] || 0;
                            if (val > highestValue) {
                                highestValue = val;
                                bestTarget = targetIdx;
                            }
                        }
                    });

                    // Vuracak rakip yoksa sadece boş kareye git
                    if (bestTarget === -1) {
                        const emptySquares = legalMoves.filter(m => !layout[m]);
                        if (emptySquares.length > 0) {
                            bestTarget = emptySquares[Math.floor(Math.random() * emptySquares.length)];
                        }
                    }

                    if (bestTarget !== -1) {
                        // Notasyona İhaneti İşle
                        addToLog(`İHANET! ${getCoordsLabel(traitorIndex)}➔${getCoordsLabel(bestTarget)}`, true);
                        
                        layout[bestTarget] = layout[traitorIndex]; 
                        layout[traitorIndex] = ''; 

                        // --- ADIM 5: İNFAZ & ADALETLİ SIRA SİSTEMİ ---
                        const finalPos = bestTarget;
                        setTimeout(() => {
                            layout[finalPos] = ''; 
                            
                            traitorsCount--;
                            if (traitorsCount === 0) {
                                // İhanet bitti, sıra tekrar Beyaza (sana) geçiyor.
                                finalizeTurnSwitch(playerWhoJustMoved);
                            }
                        }, 800);
                    } else {
                        traitorsCount--;
                        if (traitorsCount === 0) finalizeTurnSwitch(playerWhoJustMoved);
                    }
                }
            });
        }
    }

    // Hiç ihanet yoksa sırayı normal şekilde Siyaha devret
    if (!betrayalOccurred) {
        finalizeTurnSwitch(opponent);
    }
}
/**
 * Sırayı devreden, tahtayı tazeleyen ve Botu tetikleyen yardımcı fonksiyon
 */
function finalizeTurnSwitch(nextPlayer) {
    turn = nextPlayer;

    // Yeni sıradaki oyuncuya göre tehditleri (mavi ışıkları) tekrar tara
    if (typeof LoyaltyEngine !== 'undefined') {
        LoyaltyEngine.updateAllAttacks(layout, turn);
        // Hainleri listeden temizle
        LoyaltyEngine.allAttacks = LoyaltyEngine.allAttacks.filter(
            index => !LoyaltyEngine.currentNewTraitors.includes(index)
        );
    }

    draw(); 
    updateStatus(); 
    checkGameEnd();
    
    // Botun hamlesini tetikle
    if (turn === 'b') {
        setTimeout(makeBotMove, 1000);
    }
}


// --- 9. ETKİLEŞİM ---
function getAllLegalMovesForColor(color) {
    let moves = [];
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(color)) {
            let legal = getLegalMoves(i);
            legal.forEach(m => moves.push({ from: i, to: m }));
        }
    }
    return moves;
}

function handleSquareClick(i) {
    if (turn !== 'w') return;
    const piece = layout[i];
    if (selectedSquare === null) {
        if (piece && piece.startsWith(turn)) {
            selectedSquare = i;
            draw();
        }
    } else {
        const legalMoves = getLegalMoves(selectedSquare);
        if (legalMoves.includes(i)) executeGameMove(selectedSquare, i);
        else {
            selectedSquare = (piece && piece.startsWith(turn)) ? i : null;
            draw();
        }
    }
}

function checkGameEnd() {
    let hasMove = false;
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(turn)) {
            if (getLegalMoves(i).length > 0) { hasMove = true; break; }
        }
    }
    if (!hasMove) alert("OYUN BİTTİ!");
}

function draw() {
    boardElement.innerHTML = '';
    const threatenedSquares = (typeof LoyaltyEngine !== 'undefined') ? LoyaltyEngine.allAttacks : [];
    const newTraitors = (typeof LoyaltyEngine !== 'undefined') ? LoyaltyEngine.currentNewTraitors : [];
    let legalMoves = (selectedSquare !== null) ? getLegalMoves(selectedSquare) : [];

    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const isBlack = (Math.floor(i / 8) + (i % 8)) % 2 !== 0;
        square.className = `square ${isBlack ? 'black' : 'white'}`;
        square.dataset.index = i;
        if (selectedSquare === i) square.classList.add('active');

        if (newTraitors.includes(i)) square.classList.add('traitor-alert'); 
        else if (threatenedSquares.includes(i)) square.classList.add('threatened-square'); 

        if (legalMoves.includes(i)) square.classList.add(layout[i] ? 'possible-attack' : 'possible-move');

        if (layout[i]) {
            const p = document.createElement('div'); 
            p.className = `piece ${layout[i]}`;
            if (newTraitors.includes(i)) {
                p.classList.add('traitor-piece'); 
                p.classList.add('traitor-piece-anim'); 
            }
            square.appendChild(p);
        }
        square.onclick = () => { if (turn === 'w') handleSquareClick(i); };
        boardElement.appendChild(square);
    }
}

function updateStatus() {
    const kingPos = findKing(turn);
    const opponent = (turn === 'w' ? 'b' : 'w');
    const isCheck = isSquareAttacked(kingPos, opponent);
    const t = getT();
    statusElement.innerText = (turn === 'w' ? t.status : t.statusBlack) + (isCheck ? t.statusCheck : "");
}// Zaman makinesi için yeni bir kova: Gelecek
let redoStack = []; 

// --- GERİ AL (UNDO) ---
function undoMove() {
    // Botla oynadığımız için 2 hamle (Bot + Sen) geri gitmeliyiz
    if (gameHistory.length < 2) return;

    // Son iki hamleyi Geçmişten alıp Geleceğe (Redo) taşı
    redoStack.push(gameHistory.pop()); // Botun hamlesi
    redoStack.push(gameHistory.pop()); // Senin hamlen

    rebuildBoardFromHistory();
    console.log("⏪ Geri sarıldı. Gelecekte bekleyen hamle sayısı: " + redoStack.length / 2);
}

// --- İLERİ AL (REDO) ---

function redoMove() {
    if (redoStack.length < 2) {
        console.log("⏩ Gelecek zaten yazıldı usta, gidecek yer yok!");
        return;
    }

    // Gelecekten (Redo) alıp Geçmişe (History) geri koy
    const userMove = redoStack.pop();
    const botMove = redoStack.pop();

    // Bu hamleleri sırayla "sessizce" uygula
    applySingleMove(userMove);
    applySingleMove(botMove);

    draw();
    updateStatus();
    console.log("⏩ Hamleler tekrarlandı.");
}

// Yardımcı: Tahtayı tarihe göre en baştan kuran motor
function rebuildBoardFromHistory() {
    layout.fill('');
    Object.keys(initialSetup).forEach(i => layout[i] = initialSetup[i]);
    hasMoved = { 'w-k': false, 'b-k': false, 'w-r-56': false, 'w-r-63': false, 'b-r-0': false, 'b-r-7': false };
    moveCount = 1;
    turn = 'w';
    if (logElement) logElement.innerHTML = '';

    const historyCopy = [...gameHistory];
    gameHistory = []; // Yeniden dolması için

    historyCopy.forEach(moveStr => applySingleMove(moveStr));

    // İhanet ve baskı hafızasını tazele
    if (typeof LoyaltyEngine !== 'undefined') {
        LoyaltyEngine.allAttacks = [];
        LoyaltyEngine.currentNewTraitors = [];
        LoyaltyEngine.updateAllAttacks(layout, turn);
    }

    selectedSquare = null;
    draw();
    updateStatus();
}

// Yardımcı: Tek bir hamleyi kayıtlı veriden (from-to) işleten parça
function applySingleMove(moveStr) {
    const [from, to] = moveStr.split('-').map(Number);
    executeMove(from, to);
    turn = (turn === 'w' ? 'b' : 'w');
}

window.onload = initGame;