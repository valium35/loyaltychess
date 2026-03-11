// --- 1. DEĞİŞKENLER VE DURUM ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let enPassantTarget = null; 
let betrayalTarget = null; // İhanet edecek taşın indeksi
let isBetrayalMoveMode = false; // Şu an ihanet hamlesi mi yapılıyor?
let hasMoved = { 'w-k': false, 'b-k': false, 'w-r-56': false, 'w-r-63': false, 'b-r-0': false, 'b-r-7': false };

const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');

// --- 2. BAŞLATMA ---
const initialSetup = {
    0: 'b-r', 1: 'b-n', 2: 'b-b', 3: 'b-q', 4: 'b-k', 5: 'b-b', 6: 'b-n', 7: 'b-r',
    8: 'b-p', 9: 'b-p', 10: 'b-p', 11: 'b-p', 12: 'b-p', 13: 'b-p', 14: 'b-p', 15: 'b-p',
    48: 'w-p', 49: 'w-p', 50: 'w-p', 51: 'w-p', 52: 'w-p', 53: 'w-p', 54: 'w-p', 55: 'w-p',
    56: 'w-r', 57: 'w-n', 58: 'w-b', 59: 'w-q', 60: 'w-k', 61: 'w-b', 62: 'w-n', 63: 'w-r'
};

function initGame() {
    Object.keys(initialSetup).forEach(i => layout[i] = initialSetup[i]);
    draw();
    updateStatus();
}

// --- 3. HAKEM VE KURALLAR ---
function getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; }
function getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; }

function findKing(color) {
    for (let i = 0; i < 64; i++) if (layout[i] === color + '-k') return i;
    return -1;
}

function isSquareAttacked(targetIndex, attackerColor) {
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            const moves = getRawMoves(i);
            if (moves.includes(targetIndex)) return true;
        }
    }
    return false;
}

function testMoveForSafety(from, to, color) {
    const originalFrom = layout[from];
    const originalTo = layout[to];
    layout[to] = originalFrom;
    layout[from] = '';
    const kingPos = findKing(color);
    const opponent = color === 'w' ? 'b' : 'w';
    const safe = !isSquareAttacked(kingPos, opponent);
    layout[from] = originalFrom;
    layout[to] = originalTo;
    return safe;
}

function getLegalMoves(i) {
    const color = layout[i][0];
    const opponent = color === 'w' ? 'b' : 'w';
    let rawMoves = getRawMoves(i);

    // İHANET KURALI: Şah çekemez kontrolü (Madde 2)
    if (isBetrayalMoveMode && i === betrayalTarget) {
        return rawMoves.filter(toIndex => {
            const originalTo = layout[toIndex];
            layout[toIndex] = layout[i];
            layout[i] = '';
            const opponentKing = findKing(opponent);
            const isChecking = isSquareAttacked(opponentKing, color);
            layout[i] = layout[toIndex];
            layout[toIndex] = originalTo;
            return !isChecking;
        });
    }

    return rawMoves.filter(move => testMoveForSafety(i, move, color));
}

function getRawMoves(i) {
    const piece = layout[i];
    if (!piece) return [];
    const color = piece[0];
    const type = piece[2];
    const { r, c } = getCoords(i);
    let moves = [];

    // Mevcut taş hareket mantığın (Kale, Fil, At, Şah, Piyon)
    if (type === 'r' || type === 'q') {
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(d => {
            for(let j=1; j<8; j++) {
                const tr = r + d[0]*j, tc = c + d[1]*j, target = getIndex(tr, tc);
                if (target === null) break;
                if (!layout[target]) moves.push(target);
                else { if (layout[target][0] !== color) moves.push(target); break; }
            }
        });
    }
    if (type === 'b' || type === 'q') {
        [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d => {
            for(let j=1; j<8; j++) {
                const tr = r + d[0]*j, tc = c + d[1]*j, target = getIndex(tr, tc);
                if (target === null) break;
                if (!layout[target]) moves.push(target);
                else { if (layout[target][0] !== color) moves.push(target); break; }
            }
        });
    }
    if (type === 'n') {
        [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(d => {
            const target = getIndex(r+d[0], c+d[1]);
            if (target !== null && (!layout[target] || layout[target][0] !== color)) moves.push(target);
        });
    }
    if (type === 'k') {
        [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d => {
            const target = getIndex(r+d[0], c+d[1]);
            if (target !== null && (!layout[target] || layout[target][0] !== color)) moves.push(target);
        });
        if (!hasMoved[color+'-k']) {
            if (!hasMoved[color+'-r-'+getIndex(r,7)] && !layout[getIndex(r,5)] && !layout[getIndex(r,6)]) moves.push(getIndex(r,6));
            if (!hasMoved[color+'-r-'+getIndex(r,0)] && !layout[getIndex(r,1)] && !layout[getIndex(r,2)] && !layout[getIndex(r,3)]) moves.push(getIndex(r,2));
        }
    }
    if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        const forward = getIndex(r+dir, c);
        if (forward !== null && !layout[forward]) {
            moves.push(forward);
            const double = getIndex(r+2*dir, c);
            if (r === (color === 'w' ? 6 : 1) && !layout[double]) moves.push(double);
        }
        [getIndex(r+dir, c-1), getIndex(r+dir, c+1)].forEach(diag => {
            if (diag !== null && ((layout[diag] && layout[diag][0] !== color) || diag === enPassantTarget)) {
                moves.push(diag);
            }
        });
    }
    return moves;
}

// --- 4. İHANET VE FEDA MEKANİZMASI ---
function checkBetrayalOpportunity() {
    const opponentColor = turn === 'w' ? 'b' : 'w';
    const kingPos = findKing(turn);
    
    // Şah çekilmişse ihanet gerçekleşmez (Madde 3)
    if (isSquareAttacked(kingPos, opponentColor)) return null;

    for (let i = 0; i < 64; i++) {
        const piece = layout[i];
        if (piece && piece.startsWith(turn) && piece[2] !== 'k' && piece[2] !== 'p') {
            // Rakip istiyor mu VE ben korumuyor muyum?
            if (isSquareAttacked(i, opponentColor) && !isSquareAttacked(i, turn)) {
                return i; 
            }
        }
    }
    return null;
}

function handleBetrayal(targetIndex) {
    const choice = confirm("Taşın korunmasız kaldı! İhanet edip rakip adına hamle yapsın mı?\n\nTamam: İhanet Et\nİptal: Taşı Feda Et (Silinir)");
    
    if (choice) {
        // İhanet: Taşın rengi değişir ve özel hamle modu başlar
        const oldPiece = layout[targetIndex];
        layout[targetIndex] = (oldPiece[0] === 'w' ? 'b' : 'w') + oldPiece.substring(1);
        isBetrayalMoveMode = true;
        betrayalTarget = targetIndex;
        alert("İHANET! Bu taşı şimdi rakip için kullan.");
    } else {
        // Feda: Taş silinir
        layout[targetIndex] = '';
        completeTurn();
    }
    draw();
}

// --- 5. OYUN DÖNGÜSÜ ---
function handleSquareClick(i) {
    const piece = layout[i];

    if (isBetrayalMoveMode) {
        const moves = getLegalMoves(betrayalTarget);
        if (moves.includes(i) || i === betrayalTarget) {
            executeMove(betrayalTarget, i);
            layout[i] = ''; // Hamle sonrası taş silinir (Madde 5)
            completeTurn();
        }
        return;
    }

    if (selectedSquare === null) {
        if (piece && piece.startsWith(turn)) { selectedSquare = i; draw(); }
    } else {
        const legalMoves = getLegalMoves(selectedSquare);
        if (legalMoves.includes(i)) {
            executeMove(selectedSquare, i);
            selectedSquare = null;
            
            // Hamle bitti, ihanet fırsatı var mı?
            const potentialBetrayal = checkBetrayalOpportunity();
            if (potentialBetrayal !== null) {
                handleBetrayal(potentialBetrayal);
            } else {
                completeTurn();
            }
        } else {
            selectedSquare = piece && piece.startsWith(turn) ? i : null;
        }
        draw();
    }
}

function executeMove(from, to) {
    const piece = layout[from];
    const type = piece[2];
    
    if (type === 'p' && to === enPassantTarget) {
        layout[getIndex(Math.floor(from/8), to%8)] = '';
    }
    
    if (type === 'k' && Math.abs((from%8) - (to%8)) === 2) {
        const rFrom = (to%8 === 6) ? getIndex(Math.floor(to/8), 7) : getIndex(Math.floor(to/8), 0);
        const rTo = (to%8 === 6) ? getIndex(Math.floor(to/8), 5) : getIndex(Math.floor(to/8), 3);
        layout[rTo] = layout[rFrom];
        layout[rFrom] = '';
    }

    if (type === 'k') hasMoved[piece] = true;
    if (type === 'r') hasMoved[piece + '-' + from] = true;
    
    enPassantTarget = (type === 'p' && Math.abs(Math.floor(from/8) - Math.floor(to/8)) === 2) 
                      ? getIndex((Math.floor(from/8) + Math.floor(to/8)) / 2, from%8) : null;

    layout[to] = layout[from];
    layout[from] = '';
}

function completeTurn() {
    isBetrayalMoveMode = false;
    betrayalTarget = null;
    turn = turn === 'w' ? 'b' : 'w';
    if (isCheckmate(turn)) alert("ŞAH MAT!");
    updateStatus();
    draw();
}

function draw() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const isBlack = (Math.floor(i / 8) + (i % 8)) % 2 !== 0;
        square.className = `square ${isBlack ? 'black' : 'white'} ${selectedSquare === i ? 'active-law' : ''}`;
        
        // İhanet eden taşı görsel olarak belli et
        if (isBetrayalMoveMode && i === betrayalTarget) square.style.boxShadow = "inset 0 0 15px purple";

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
    statusElement.innerText = isBetrayalMoveMode ? "⚠️ İHANET HAMLESİ YAPILIYOR" : "SIRA: " + (turn === 'w' ? "BEYAZDA" : "SİYAHTA");
}

initGame();
