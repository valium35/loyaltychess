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

// --- LOG SİSTEMİ (ÇİFTLİ NOTASYON: 1. e4 e5) ---
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
    if (logElement.children.length > 30) logElement.removeChild(logElement.lastChild);
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
        return `${getCoordsLabel(from)} ${targetLabel}`;
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
    gameLog = [];
    moveCount = 1;
    turn = 'w';
    window.betrayalHistory.clear();
    if (logElement) {
        logElement.innerHTML = '';
        const readyMsg = localStorage.getItem('gameLang') === 'en' ? "System Ready" : "Sistem Hazır";
        logElement.innerHTML = `<div class="log-entry" style="color:#777; font-style:italic;">> ${readyMsg}</div>`;
    }
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
    const canBetray = ['n', 'b', 'r'].includes(pieceType);
    if (turn !== pieceColor && !canBetray) return [];
    const isBetrayal = (turn !== pieceColor) && canBetray;
    let rawMoves = getRawMoves(i, isBetrayal);

    return rawMoves.filter(move => {
        const targetPiece = layout[move];
        const { r: fromR, c: fromC } = getCoords(i);
        const { r: toR, c: toC } = getCoords(move);

        if (pieceType === 'p') {
            const isDiagonal = (fromC !== toC);
            if (isDiagonal && !targetPiece && move !== enPassantTarget) return false;
            if (!isDiagonal && targetPiece) return false;
        }

        if (targetPiece) {
            if (isBetrayal) {
                if (targetPiece.startsWith(turn)) return false; 
                if (!targetPiece.startsWith(pieceColor)) return false; 
            } else {
                if (targetPiece.startsWith(pieceColor)) return false; 
            }
        }
        if (isBetrayal && targetPiece && targetPiece[2] === 'k') return false;

        const originalFrom = layout[i], originalTo = layout[move];
        layout[move] = originalFrom; layout[i] = '';
        const kingPos = findKing(turn);
        const opponent = (turn === 'w' ? 'b' : 'w');
        const safe = (kingPos === -1) ? true : !isSquareAttacked(kingPos, opponent);
        
        let createsCheck = false;
        if (isBetrayal && safe) {
            const oppKingPos = findKing(opponent);
            if (oppKingPos !== -1 && isSquareAttacked(oppKingPos, turn)) createsCheck = true;
        }

        layout[i] = originalFrom; layout[move] = originalTo;
        return safe && !createsCheck;
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
                    if (onlyAttacks || layout[target][0] !== color) moves.push(target); 
                    break; 
                }
            }
        });
    } else if (type === 'n' || type === 'k') {
        directions[type].forEach(d => {
            const target = getIndex(r + d[0], c + d[1]);
            if (target !== null) {
                if (onlyAttacks || !layout[target] || layout[target][0] !== color) moves.push(target);
            }
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
                if (r === (color === 'w' ? 6 : 1) && !layout[getIndex(r + 2*dir, c)]) moves.push(getIndex(r + 2*dir, c));
            }
        }
        [getIndex(r + dir, c - 1), getIndex(r + dir, c + 1)].forEach(diag => {
            if (diag !== null && (onlyAttacks || (layout[diag] && layout[diag][0] !== color) || diag === enPassantTarget)) moves.push(diag);
        });
    }
    return moves;
}

// --- 5. OYUN AKIŞI ---
function handleSquareClick(i) {
    const piece = layout[i];
    const isTraitor = typeof LoyaltyEngine !== 'undefined' && LoyaltyEngine.currentNewTraitors && LoyaltyEngine.currentNewTraitors.includes(i);

    if (selectedSquare === null) {
        if (piece && (piece.startsWith(turn) || isTraitor)) {
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
            selectedSquare = (piece && (piece.startsWith(turn) || isTraitor)) ? i : null;
            draw();
        }
    }
}

// --- İHANET VE İNFAZ SENARYOSU ---
function executeBetrayalMove(from, to) {
    const piece = layout[from];
    const isCapture = layout[to] !== '';
    const notation = getNotation(from, to, isCapture);
    const pieceType = piece.split('-')[1].toUpperCase();
    const lang = localStorage.getItem('gameLang') || 'tr';
    
    // 1. POP-UP MESAJINI HAZIRLA
    let title = lang === 'tr' ? "🔥 İHANET TESPİT EDİLDİ!" : "🔥 BETRAYAL DETECTED!";
    let msg = lang === 'tr' 
        ? `Sistem Uyarısı: ${pieceType} saf değiştirdi!\n` +
          `Hamle: ${notation}\n` +
          `KARAR: İhaneti cezalandırıldı ve oyundan ihraç edildi!`
        : `System Alert: ${pieceType} switched sides!\n` +
          `Move: ${notation}\n` +
          `VERDICT: Punished for treason and removed from game!`;
    
    let law = lang === 'tr' ? "3. YASA: İhanet eden taş hamle sonrası oyundan silinir." : "LAW 3: Traitors are removed from the board after their move.";

    // Pop-up fonksiyonunu çağır (Globalde showPop varsa)
    if (typeof showPop === 'function') {
        showPop(title, msg, law, "#ff3333");
    }

    // 2. LOGA İNFAZ NOTU DÜŞ
    addToLog(notation, true);

    // 3. TAHTA İŞLEMLERİ
    layout[to] = layout[from];
    layout[from] = '';
    selectedSquare = null;
    draw();
    
    // Hainin silinmesi (Son Görev İnfazı)
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
        layout[getIndex(Math.floor(from/8), to % 8)] = '';
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
    const isUnderAttack = isSquareAttacked(kingPos, opponent);
    let hasAnyMove = false;
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(turn)) {
            if (getLegalMoves(i).length > 0) { hasAnyMove = true; break; }
        }
    }
    if (!hasAnyMove) {
        const winner = (turn === 'w' ? "BLACK" : "WHITE");
        const lang = localStorage.getItem('gameLang') || 'tr';
        const msg = lang === 'tr' ? `BİTTİ: ${winner === 'BLACK' ? 'SİYAH' : 'BEYAZ'}` : `FINISH: ${winner}`;
        addToLog(msg);
        alert(isUnderAttack ? "ŞAH MAT!" : "STALEMATE!");
    }
}

function draw() {
    boardElement.innerHTML = '';
    let legalMoves = (selectedSquare !== null) ? getLegalMoves(selectedSquare) : [];
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
            square.classList.add(layout[i] ? 'possible-attack' : 'possible-move');
        }
        if (layout[i]) {
            const p = document.createElement('div');
            p.className = `piece ${layout[i]}`;
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