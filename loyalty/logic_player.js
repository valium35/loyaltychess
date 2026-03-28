// --- 1. DEĞİŞKENLER VE DURUM ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let enPassantTarget = null;
let hasMoved = {}; 
let gameLog = [];
let moveCount = 1;
window.betrayalHistory = new Set(); 

const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');
const logElement = document.getElementById('move-history'); 

function getT() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    if (typeof LoyaltyDict !== 'undefined' && LoyaltyDict[lang]) {
        return LoyaltyDict[lang];
    }
    return { status: "Sıra Beyazda", statusBlack: "Sıra Siyahda", statusCheck: " (ŞAH!)", popups: { alertTitle: "UYARI" } };
}

// --- LOG SİSTEMİ ---
function addToLog(notation, isBetrayal = false) {
    if (!logElement) return;
    if (turn === 'w') {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.id = 'move-' + moveCount;
        const style = isBetrayal ? 'color:#e74c3c; font-weight:bold;' : '';
        entry.innerHTML = `<span style="color:#f1c40f; font-weight:bold; margin-right:8px;">${moveCount}.</span> <span style="${style}">${notation}</span>`;
        logElement.prepend(entry);
    } else {
        const lastEntry = document.getElementById('move-' + moveCount);
        if (lastEntry) {
            const style = isBetrayal ? 'color:#e74c3c; font-weight:bold;' : '';
            lastEntry.innerHTML += ` &nbsp;&nbsp;&nbsp; <span style="${style}">${notation}</span>`;
            moveCount++; 
        }
    }
}

// --- CEBİRSEL NOTASYON ÜRETİCİ ---
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
window.isSquareAttacked = isSquareAttacked;

function findKing(color) {
    for (let i = 0; i < 64; i++) if (layout[i] === color + '-k') return i;
    return -1;
}

// --- 4. HAREKET MANTIĞI ---
function getLegalMoves(i) {
    const piece = layout[i];
    if (!piece) return [];
    const pieceColor = piece[0], pieceType = piece[2];
    const isTraitorPossible = typeof LoyaltyEngine !== 'undefined' && LoyaltyEngine.currentNewTraitors && LoyaltyEngine.currentNewTraitors.includes(i);
    
    if (turn !== pieceColor && !isTraitorPossible) return [];
    
    // --- 1. ÖN KONTROL: İhanet Eden Taş Halihazırda Şah Çekiyor mu? ---
    if (isTraitorPossible && turn !== pieceColor) {
        const opponent = (turn === 'w' ? 'b' : 'w');
        const oppKingPos = findKing(opponent);
        
        // Eğer bu taş ŞU AN rakip şaha saldırıyorsa, ihanet edemez!
        // (Çünkü ihanet hamlesi Şah çekme ile sonuçlanamaz)
        if (oppKingPos !== -1) {
            // getRawMoves(i, true) bu taşın saldırı menzilini verir
            const attacks = getRawMoves(i, true);
            if (attacks.includes(oppKingPos)) {
                return []; // Bu taş kilitlendi, hiçbir yere gidemez (ihanet edemez)
            }
        }
    }

    let rawMoves = getRawMoves(i, false);

    return rawMoves.filter(move => {
        const targetPiece = layout[move];
        const { r: fromR, c: fromC } = getCoords(i);
        const { r: toR, c: toC } = getCoords(move);
        const isBetrayalAction = (turn !== pieceColor) && isTraitorPossible;

        // Piyon Süzgeci
        if (pieceType === 'p') {
            const isDiagonal = (fromC !== toC);
            if (isDiagonal && !targetPiece && move !== enPassantTarget) return false;
            if (!isDiagonal && targetPiece) return false;
        }

        // Dost taş alma engeli
        if (targetPiece) {
            if (isBetrayalAction) {
                if (targetPiece.startsWith(turn)) return false; 
            } else {
                if (targetPiece.startsWith(pieceColor)) return false; 
            }
        }
        
        // Şah alma engeli
        if (isBetrayalAction && targetPiece && targetPiece[2] === 'k') return false;

        // --- SİMÜLASYON ---
        const originalFrom = layout[i], originalTo = layout[move];
        layout[move] = originalFrom; 
        layout[i] = '';
        
        const opponent = (turn === 'w' ? 'b' : 'w');
        const kingPos = findKing(turn);
        const selfSafe = (kingPos === -1) ? true : !isSquareAttacked(kingPos, opponent);

        // --- İHANET KISITLAMASI: Şah çekemez / Açarak şah çekemez ---
        let traitorViolation = false;
        if (isBetrayalAction && selfSafe) {
            const oppKingPos = findKing(opponent);
            // Hamle bittikten sonra rakip şah saldırı altında mı? (Doğrudan veya Açarak)
            if (oppKingPos !== -1 && isSquareAttacked(oppKingPos, turn)) {
                traitorViolation = true;
            }
        }

        layout[i] = originalFrom; 
        layout[move] = originalTo;
        
        return selfSafe && !traitorViolation;
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
                else { 
                    moves.push(target); 
                    break; 
                }
            }
        });
    } else if (type === 'n' || type === 'k') {
        directions[type].forEach(d => {
            const target = getIndex(r + d[0], c + d[1]);
            if (target !== null) moves.push(target);
        });
        
        if (type === 'k' && !onlyAttacks && !hasMoved[color+'-k']) {
            const opponent = color === 'w' ? 'b' : 'w';
            const r7 = getIndex(r, 7), g = getIndex(r, 6), f = getIndex(r, 5);
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
                if (r === (color === 'w' ? 6 : 1)) {
                    const f2 = getIndex(r + 2 * dir, c);
                    if (f2 !== null && !layout[f2]) moves.push(f2);
                }
            }
        }
        [getIndex(r + dir, c - 1), getIndex(r + dir, c + 1)].forEach(diag => {
            if (diag !== null) moves.push(diag);
        });
    }
    return moves;
}
window.getRawMoves = getRawMoves;

// --- 5. OYUN AKIŞI ---
function handleSquareClick(i) {
    const piece = layout[i];
    const lang = localStorage.getItem('gameLang') || 'tr';
    const potentialTraitors = typeof LoyaltyEngine !== 'undefined' ? LoyaltyEngine.getAllUnprotected(layout, turn) : [];
    const isTraitorPossible = typeof LoyaltyEngine !== 'undefined' && LoyaltyEngine.currentNewTraitors && LoyaltyEngine.currentNewTraitors.includes(i);

    if (selectedSquare === null) {
        // RAKİP TAŞINA TIKLANDIĞINDA POP-UP KONTROLÜ
        if (piece && !piece.startsWith(turn) && potentialTraitors.includes(i)) {
            const traitorMoves = getLegalMoves(i);
            if (traitorMoves.length === 0) {
                const title = lang === 'tr' ? "⚖️ HÜKÜM ENGELLENDİ" : "⚖️ JUDGMENT BLOCKED";
                const msg = lang === 'tr' 
                    ? "Bu taş ihanet edemez! Çünkü ihanet hamlesi doğrudan veya açarak ŞAH çekilmesine neden oluyor. İhanet eden el krala dokunamaz!" 
                    : "This piece cannot betray! All moves result in a direct or discovered CHECK. The traitor's hand cannot touch the King!";
                const law = lang === 'tr' ? "YASA: İhanet hamlesi şah çekme ile sonuçlanamaz." : "LAW: A betrayal move cannot result in a check.";
                
                if (typeof showPop === 'function') showPop(title, msg, law, "#f1c40f");
                return;
            }
        }

        if (piece && (piece.startsWith(turn) || isTraitorPossible)) {
            selectedSquare = i;
            draw();
        }
    } else {
        const legalMoves = getLegalMoves(selectedSquare);
        if (legalMoves.includes(i)) {
            const movedPiece = layout[selectedSquare];
            const isBetrayalMove = movedPiece && !movedPiece.startsWith(turn);

            if (isBetrayalMove) {
                executeBetrayalMove(selectedSquare, i);
            } else {
                if (typeof LoyaltyEngine !== 'undefined') LoyaltyEngine.takeSnapshot(layout, turn); 
                executeMove(selectedSquare, i);
                selectedSquare = null;
                turn = (turn === 'w' ? 'b' : 'w'); 
                if (typeof LoyaltyEngine !== 'undefined') {
                    LoyaltyEngine.updateAllAttacks(layout, turn); 
                    LoyaltyEngine.findNewThreats(layout, turn === 'w' ? 'b' : 'w');
                }
            }
            draw();
            updateStatus();
            checkGameEnd();
        } else {
            selectedSquare = (piece && (piece.startsWith(turn) || isTraitorPossible)) ? i : null;
            draw();
        }
    }
}

// --- İHANET VE İNFAZ SENARYOSU ---
function executeBetrayalMove(from, to) {
    const piece = layout[from];
    const isCapture = layout[to] !== '';
    const notation = "!" + getNotation(from, to, isCapture);
    const pieceType = piece.split('-')[1].toUpperCase();
    const lang = localStorage.getItem('gameLang') || 'tr';
    
    const pieceEl = document.querySelector(`[data-index="${from}"] .piece`);
    if (pieceEl) {
        pieceEl.classList.add('traitor-piece');
        pieceEl.classList.add('betrayal-effect');
    }

    let title = lang === 'tr' ? "🔥 İHANET TESPİT EDİLDİ!" : "🔥 BETRAYAL DETECTED!";
    let msg = lang === 'tr' 
        ? `Sistem Uyarısı: ${pieceType} saf değiştirdi!\n` +
          `Hamle: ${notation}\n` +
          `KARAR: İhaneti cezalandırıldı!`
        : `System Alert: ${pieceType} switched sides!\n` +
          `Move: ${notation}\n` +
          `VERDICT: Punished for treason!`;
    
    let law = lang === 'tr' ? "3. YASA: İhanet eden taş hamle sonrası oyundan silinir." : "LAW 3: Traitors are removed from the board after their move.";

    if (typeof showPop === 'function') showPop(title, msg, law, "#ff3333");

    addToLog(notation, true);

    layout[to] = layout[from];
    layout[from] = '';
    selectedSquare = null;
    draw();
    
    setTimeout(() => {
        layout[to] = ''; 
        const movedColor = turn;
        turn = (turn === 'w' ? 'b' : 'w');
        if (typeof LoyaltyEngine !== 'undefined') {
            LoyaltyEngine.updateAllAttacks(layout, turn);
            LoyaltyEngine.findNewThreats(layout, movedColor);
        }
        draw();
        updateStatus();
    }, 600);
}

// --- NORMAL HAMLE ---
function executeMove(from, to) {
    const piece = layout[from], type = piece[2], color = piece[0];
    const isCapture = layout[to] !== '';
    const notation = getNotation(from, to, isCapture);
    
    addToLog(notation, false);

    if (type === 'p' && to === enPassantTarget) {
        const epRemoveIndex = getIndex(Math.floor(from/8), to % 8);
        layout[epRemoveIndex] = '';
    }

    if (type === 'k' && Math.abs((from % 8) - (to % 8)) === 2) {
        const rPos = Math.floor(to/8);
        const rFrom = (to % 8 === 6) ? getIndex(rPos, 7) : getIndex(rPos, 0);
        const rTo = (to % 8 === 6) ? getIndex(rPos, 5) : getIndex(rPos, 3);
        layout[rTo] = layout[rFrom]; layout[rFrom] = '';
    }

    if (type === 'k') hasMoved[color + '-k'] = true;
    if (type === 'r') hasMoved[color + '-r-' + from] = true;

    enPassantTarget = (type === 'p' && Math.abs(Math.floor(from/8) - Math.floor(to/8)) === 2) ? 
                      getIndex((Math.floor(from/8) + Math.floor(to/8)) / 2, from % 8) : null;

    layout[to] = layout[from];
    layout[from] = '';
    
    if (type === 'p' && (Math.floor(to/8) === 0 || Math.floor(to/8) === 7)) {
        let choice = prompt("Terfi (q,r,b,n):", "q") || "q";
        layout[to] = color + '-' + choice.toLowerCase();
    }
}

function checkGameEnd() {
    const kingPos = findKing(turn);
    const opponent = turn === 'w' ? 'b' : 'w';
    let hasAnyMove = false;
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(turn)) {
            if (getLegalMoves(i).length > 0) { hasAnyMove = true; break; }
        }
    }
    if (!hasAnyMove) {
        const lang = localStorage.getItem('gameLang') || 'tr';
        alert(lang === 'tr' ? "OYUN BİTTİ!" : "GAME OVER!");
    }
}

function draw() {
    boardElement.innerHTML = '';
    let legalMoves = (selectedSquare !== null) ? getLegalMoves(selectedSquare) : [];
    const isSelectedTraitor = selectedSquare !== null && layout[selectedSquare] && !layout[selectedSquare].startsWith(turn);

    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const isBlack = (Math.floor(i / 8) + (i % 8)) % 2 !== 0;
        square.className = `square ${isBlack ? 'black' : 'white'}`;
        if (selectedSquare === i) square.classList.add('active');
        
        if (typeof LoyaltyEngine !== 'undefined' && LoyaltyEngine.allAttacks && LoyaltyEngine.allAttacks.includes(i)) {
            square.classList.add('raw-threat');
        }
        if (typeof LoyaltyEngine !== 'undefined' && LoyaltyEngine.currentNewTraitors && LoyaltyEngine.currentNewTraitors.includes(i)) {
            square.classList.add('threatened-square');
        }
        if (legalMoves.includes(i)) {
            square.classList.add(layout[i] || i === enPassantTarget ? 'possible-attack' : 'possible-move');
        }
        if (layout[i]) {
            const p = document.createElement('div');
            p.className = `piece ${layout[i]}`;
            if (selectedSquare === i && isSelectedTraitor) {
                p.classList.add('traitor-piece');
            }
            square.appendChild(p);
        }
        square.onclick = () => handleSquareClick(i);
        boardElement.appendChild(square);
    }
}

function updateStatus() {
    const kingPos = findKing(turn);
    const opponent = turn === 'w' ? 'b' : 'w';
    const isCheck = isSquareAttacked(kingPos, opponent);
    const t = getT();
    statusElement.innerText = (turn === 'w' ? (t.status || "Sıra Beyazda") : (t.statusBlack || "Sıra Siyahda")) + (isCheck ? (t.statusCheck || " (ŞAH!)") : "");
}

window.onload = initGame;