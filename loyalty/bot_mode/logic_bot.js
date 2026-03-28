/**
 * logic_bot.js
 * LoyaltyChess: Bot Atölyesi Sürümü (RESTORE EDİLDİ - FULL MANTIK)
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

// --- BOT ZEKA PARAMETRELERİ (TABLOLAR) ---
const pieceValues = { 'p': 10, 'n': 32, 'b': 33, 'r': 50, 'q': 90, 'k': 20000 };
const knightTable = [-10, -5, -5, -5, -5, -5, -5, -10, -5, 0, 0, 5, 5, 0, 0, -5, -5, 5, 10, 15, 15, 10, 5, -5, -5, 5, 15, 20, 20, 15, 5, -5, -5, 5, 15, 20, 20, 15, 5, -5, -5, 5, 10, 15, 15, 10, 5, -5, -5, 0, 0, 0, 0, 0, 0, -5, -10, -5, -5, -5, -5, -5, -5, -10];
const pawnTable = [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, -20, -20, 10, 10, 5, 5, -5, -10, 0, 0, -10, -5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, 5, 10, 25, 25, 10, 5, 5, 10, 10, 20, 30, 30, 20, 10, 10, 50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0];
const bishopTable = [-20, -10, -10, -10, -10, -10, -10, -20, -10, 5, 0, 0, 0, 0, 5, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -10, -10, -10, -10, -20];
const rookTable = [0, 0, 0, 5, 5, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 5, 10, 10, 10, 10, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0];
const queenTable = [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20];
const kingTable = [50, 60, 30, 0, 0, 30, 60, 50, 30, 30, 0, 0, 0, 0, 30, 30, -10, -20, -20, -20, -20, -20, -20, -10, -20, -30, -30, -40, -40, -30, -30, -20, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30];

function evaluateBoard(tempLayout) {
    let score = 0;
    const moodSwing = (Math.random() * 0.4) + 0.8; 
    for (let i = 0; i < 64; i++) {
        const piece = tempLayout[i];
        if (!piece) continue;
        const color = piece[0], type = piece[2];
        let val = pieceValues[type];
        let posBonus = 0;
        if (type === 'n') posBonus = (color === 'b' ? knightTable[i] : knightTable[63 - i]);
        else if (type === 'p') posBonus = (color === 'b' ? pawnTable[i] : pawnTable[63 - i]);
        else if (type === 'b') posBonus = (color === 'b' ? bishopTable[i] : bishopTable[63 - i]);
        else if (type === 'r') posBonus = (color === 'b' ? rookTable[i] : rookTable[63 - i]);
        else if (type === 'q') posBonus = (color === 'b' ? queenTable[i] : queenTable[63 - i]);
        else if (type === 'k') posBonus = (color === 'b' ? kingTable[i] : kingTable[63 - i]);

        let total = (val * 10 * moodSwing) + posBonus;

        // Merkez hakimiyeti ve Koruma zinciri
        const center = [27, 28, 35, 36];
        if (center.includes(i)) total += (color === 'b' ? 40 : -20);
        if (color === 'b' && isSquareAttacked(i, 'b')) total += 15;

        score += (color === 'b' ? total : -total);
    }
    return score;
}

// --- MINIMAX & ALPHA-BETA ---
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
    moves.sort((a, b) => (layout[b.to] ? 10 : 0) - (layout[a.to] ? 10 : 0) + (Math.random() - 0.5));
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

// --- BOT VE OYUNCU ETKİLEŞİMİ ---
function makeBotMove() {
    console.log("🤖 Bot Database ve Strateji Analiz Ediyor...");
    const historyKey = gameHistory.join(',');
    const bookMoves = (typeof OpeningDatabase !== 'undefined') ? OpeningDatabase[historyKey] : null;

    if (bookMoves && bookMoves.length > 0) {
        const move = bookMoves[Math.floor(Math.random() * bookMoves.length)];
        executeGameMove(move.from, move.to);
        return;
    }

    let bestMove = minimaxRoot(3, 'b');
    if (bestMove) executeGameMove(bestMove.from, bestMove.to);
}

function executeGameMove(from, to) {
    executeMove(from, to);
    selectedSquare = null;
    finishTurn();
}

function executeMove(from, to) {
    const piece = layout[from], type = piece[2], color = piece[0];
    addToLog(getNotation(from, to, layout[to] !== ''), false);
    
    // Geçmişi kaydet (Database için şart)
    gameHistory.push(`${from}-${to}`);

    if (type === 'p' && to === enPassantTarget) layout[getIndex(Math.floor(from/8), to % 8)] = '';
    if (type === 'k' && Math.abs((from % 8) - (to % 8)) === 2) {
        const r = Math.floor(to/8), rf = (to % 8 === 6) ? getIndex(r, 7) : getIndex(r, 0), rt = (to % 8 === 6) ? getIndex(r, 5) : getIndex(r, 3);
        layout[rt] = layout[rf]; layout[rf] = '';
    }
    if (type === 'k') hasMoved[color + '-k'] = true;
    if (type === 'r') hasMoved[color + '-r-' + from] = true;
    
    enPassantTarget = (type === 'p' && Math.abs(Math.floor(from/8) - Math.floor(to/8)) === 2) ? 
                      getIndex((Math.floor(from/8) + Math.floor(to/8)) / 2, from % 8) : null;
    
    layout[to] = layout[from]; layout[from] = '';
    
    if (type === 'p' && (Math.floor(to/8) === 0 || Math.floor(to/8) === 7)) {
        let choice = (turn === 'b') ? 'q' : (prompt("Terfi (q,r,b,n):", "q") || "q");
        layout[to] = color + '-' + choice.toLowerCase();
    }
}

function finishTurn() {
    turn = (turn === 'w' ? 'b' : 'w');
    draw(); 
    updateStatus(); 
    checkGameEnd();
    if (turn === 'b') setTimeout(makeBotMove, 1000);
}

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
    let legalMoves = (selectedSquare !== null) ? getLegalMoves(selectedSquare) : [];
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const isBlack = (Math.floor(i / 8) + (i % 8)) % 2 !== 0;
        square.className = `square ${isBlack ? 'black' : 'white'}`;
        square.dataset.index = i;
        if (selectedSquare === i) square.classList.add('active');
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
    const opponent = (turn === 'w' ? 'b' : 'w');
    const isCheck = isSquareAttacked(kingPos, opponent);
    const t = getT();
    statusElement.innerText = (turn === 'w' ? t.status : t.statusBlack) + (isCheck ? t.statusCheck : "");
}

window.onload = initGame;