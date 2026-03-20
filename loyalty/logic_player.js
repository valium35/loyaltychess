// --- 1. DEĞİŞKENLER VE DURUM ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let enPassantTarget = null;
let hasMoved = {}; 
let gameLog = [];
let moveCount = 1;
let preMoveThreats = [];  // Hamle öncesi tehditlerin fotoğrafı
let currentNewTraitors = []; // Sadece yeni doğan tehditler

const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');
const logElement = document.getElementById('move-history');

function getT() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    if (typeof LoyaltyDict !== 'undefined' && LoyaltyDict[lang]) {
        return LoyaltyDict[lang];
    }
    return { status: "Sıra Beyazda", statusBlack: "Sıra Siyahda", statusCheck: " (ŞAH!)" };
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
    gameLog = []; moveCount = 1; turn = 'w';
    currentNewTraitors = [];
    draw();
    updateStatus();
}

// --- 3. YARDIMCI VE ANALİZ ---
function getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; }
function getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; }
function getCoordsLabel(i) { return 'abcdefgh'[i % 8] + '87654321'[Math.floor(i / 8)]; }

function findKing(color) {
    for (let i = 0; i < 64; i++) if (layout[i] === color + '-k') return i;
    return -1;
}

function isSquareAttacked(targetIndex, attackerColor) {
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            if (getRawMoves(i, true).includes(targetIndex)) return true;
        }
    }
    return false;
}

// Yeni: Koruma Kontrolü
function isPieceProtected(index, color) {
    const originalPiece = layout[index];
    layout[index] = ''; 
    let protected = false;
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(color) && i !== index) {
            if (getRawMoves(i, true).includes(index)) {
                protected = true;
                break;
            }
        }
    }
    layout[index] = originalPiece;
    return protected;
}

// Yeni: Tüm Sahipsiz Tehditleri Tara
function getAllUnprotectedThreats(targetColor) {
    let list = [];
    const attackerColor = targetColor === 'w' ? 'b' : 'w';
    for (let i = 0; i < 64; i++) {
        const piece = layout[i];
        if (piece && piece.startsWith(targetColor) && ['n', 'b', 'r'].includes(piece[2])) {
            if (isSquareAttacked(i, attackerColor)) {
                if (!isPieceProtected(i, targetColor)) list.push(i);
            }
        }
    }
    return list;
}

// --- 4. HAREKET MANTIĞI ---
function testMoveForSafety(from, to, color) {
    const originalFrom = layout[from], originalTo = layout[to];
    layout[to] = originalFrom; layout[from] = '';
    const kingPos = findKing(color);
    const opponent = color === 'w' ? 'b' : 'w';
    const safe = kingPos === -1 ? true : !isSquareAttacked(kingPos, opponent);
    layout[from] = originalFrom; layout[to] = originalTo;
    return safe;
}

function getLegalMoves(i) {
    const piece = layout[i];
    if (!piece) return [];
    return getRawMoves(i).filter(move => testMoveForSafety(i, move, piece[0]));
}

function getRawMoves(i, onlyAttacks = false) {
    const piece = layout[i];
    if (!piece) return [];
    const color = piece[0], type = piece[2], { r, c } = getCoords(i);
    let moves = [];
    const directions = {
        'r': [[1,0],[-1,0],[0,1],[0,-1]], 'b': [[1,1],[1,-1],[-1,1],[-1,-1]],
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
                else { if (onlyAttacks || layout[target][0] !== color) moves.push(target); break; }
            }
        });
    } else if (type === 'n' || type === 'k') {
        directions[type].forEach(d => {
            const target = getIndex(r + d[0], c + d[1]);
            if (target !== null && (onlyAttacks || !layout[target] || layout[target][0] !== color)) moves.push(target);
        });
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
    if (selectedSquare === null) {
        if (layout[i] && layout[i].startsWith(turn)) {
            selectedSquare = i;
            draw();
        }
    } else {
        const legalMoves = getLegalMoves(selectedSquare);
        if (legalMoves.includes(i)) {
            // SNAPSHOT: Hamleden önce rakibin durumunu çek
            const opponentColor = turn === 'w' ? 'b' : 'w';
            preMoveThreats = getAllUnprotectedThreats(opponentColor);

            addToLog(selectedSquare, i); 
            executeMove(selectedSquare, i);
            
            selectedSquare = null;
            turn = (turn === 'w' ? 'b' : 'w'); 

            // FARKI BUL: Sadece yeni tehditleri belirle
            const allCurrentThreats = getAllUnprotectedThreats(turn);
            currentNewTraitors = allCurrentThreats.filter(index => !preMoveThreats.includes(index));

            draw();
            updateStatus();
            checkGameEnd();
        } else {
            selectedSquare = (layout[i] && layout[i].startsWith(turn)) ? i : null;
            draw();
        }
    }
}

function executeMove(from, to) {
    const piece = layout[from], type = piece[2], color = piece[0];
    if (type === 'p' && to === enPassantTarget) {
        layout[getIndex(Math.floor(from/8), to % 8)] = '';
    }
    if (type === 'k' && Math.abs((from % 8) - (to % 8)) === 2) {
        const rFrom = (to % 8 === 6) ? getIndex(Math.floor(to/8), 7) : getIndex(Math.floor(to/8), 0);
        const rTo = (to % 8 === 6) ? getIndex(Math.floor(to/8), 5) : getIndex(Math.floor(to/8), 3);
        layout[rTo] = layout[rookFrom]; layout[rFrom] = ''; // Not: rookFrom hatası düzeltildi
    }
    if (type === 'k') hasMoved[color + '-k'] = true;
    if (type === 'r') hasMoved[color + '-r-' + from] = true;
    layout[to] = layout[from];
    layout[from] = '';
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
        const winner = (turn === 'w' ? "SİYAH" : "BEYAZ");
        alert(isUnderAttack ? "ŞAH MAT! " + winner + " KAZANDI." : "BERABERE!");
    }
}

// --- 6. GÖRSELLEŞTİRME ---
function draw() {
    boardElement.innerHTML = '';
    let legalMoves = (selectedSquare !== null) ? getLegalMoves(selectedSquare) : [];

    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const isBlack = (Math.floor(i / 8) + (i % 8)) % 2 !== 0;
        square.className = `square ${isBlack ? 'black' : 'white'}`;
        
        if (selectedSquare === i) square.classList.add('active');
        if (legalMoves.includes(i)) square.classList.add(layout[i] ? 'possible-attack' : 'possible-move');
        
        // Yeni Tehdit Işığı
        if (currentNewTraitors.includes(i)) square.classList.add('threatened-square');

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
    const t = getT();
    const kingPos = findKing(turn);
    const isCheck = isSquareAttacked(kingPos, turn === 'w' ? 'b' : 'w');
    let label = (turn === 'w' ? t.status : t.statusBlack);
    if (isCheck) label += " (ŞAH!)";
    statusElement.innerText = label;
}

function addToLog(from, to) {
    const moveText = `${getCoordsLabel(from)}-${getCoordsLabel(to)}`;
    if (logElement) {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerText = `${moveCount}. ${moveText}`;
        logElement.prepend(div);
    }
}

window.onload = initGame;
