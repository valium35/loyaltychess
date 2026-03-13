// --- 1. DEĞİŞKENLER VE DURUM ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let enPassantTarget = null;
let hasMoved = {}; 
let gameLog = [];
let moveCount = 1;

const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');
const logElement = document.getElementById('move-history');

// Dil desteği için yardımcı fonksiyon
function getT() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    return LoyaltyDict[lang];
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
    if (logElement) logElement.innerHTML = '';
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

function addToLog(from, to) {
    const moveText = `${getCoordsLabel(from)}-${getCoordsLabel(to)}`;
    
    if (turn === 'w') {
        const movePair = { index: moveCount, white: moveText, black: "" };
        gameLog.push(movePair);
        
        if (logElement) {
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.id = `move-pair-${moveCount}`;
            div.innerHTML = `<span class="move-num">${moveCount}.</span> <span class="white-move">${moveText}</span> <span class="black-move">...</span>`;
            logElement.prepend(div);
        }
    } else {
        if (gameLog.length > 0) {
            gameLog[gameLog.length - 1].black = moveText;
            const lastDiv = document.getElementById(`move-pair-${moveCount}`);
            if (lastDiv) {
                lastDiv.querySelector('.black-move').innerText = moveText;
            }
            moveCount++;
        }
    }
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
        if (type === 'k' && !onlyAttacks && !hasMoved[color+'-k']) {
            const opponent = color === 'w' ? 'b' : 'w';
            if (!isSquareAttacked(i, opponent)) {
                const r7 = getIndex(r, 7), g1 = getIndex(r, 6), f1 = getIndex(r, 5);
                if (!hasMoved[color+'-r-'+r7] && !layout[f1] && !layout[g1] && !isSquareAttacked(f1, opponent) && !isSquareAttacked(g1, opponent)) moves.push(g1);
                const r0 = getIndex(r, 0), c1 = getIndex(r, 2), d1 = getIndex(r, 3), b1 = getIndex(r, 1);
                if (!hasMoved[color+'-r-'+r0] && !layout[d1] && !layout[c1] && !layout[b1] && !isSquareAttacked(d1, opponent) && !isSquareAttacked(c1, opponent)) moves.push(c1);
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
    if (selectedSquare === null) {
        if (layout[i] && layout[i].startsWith(turn)) {
            selectedSquare = i;
            draw();
        }
    } else {
        const legalMoves = getLegalMoves(selectedSquare);
        if (legalMoves.includes(i)) {
            addToLog(selectedSquare, i); 
            executeMove(selectedSquare, i);
            
            selectedSquare = null;
            turn = (turn === 'w' ? 'b' : 'w'); 
            
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
        layout[rTo] = layout[rFrom]; layout[rFrom] = '';
    }

    if (type === 'k') hasMoved[color + '-k'] = true;
    if (type === 'r') hasMoved[color + '-r-' + from] = true;

    enPassantTarget = (type === 'p' && Math.abs(Math.floor(from/8) - Math.floor(to/8)) === 2) ? 
                      getIndex((Math.floor(from/8) + Math.floor(to/8)) / 2, from % 8) : null;

    layout[to] = layout[from];
    layout[from] = '';

    if (type === 'p' && (Math.floor(to/8) === 0 || Math.floor(to/8) === 7)) {
        let choice = prompt("Piyon Terfisi (q, r, b, n):", "q") || "q";
        layout[to] = color + '-' + (['q','r','b','n'].includes(choice.toLowerCase()) ? choice.toLowerCase() : 'q');
    }
}

function checkGameEnd() {
    const t = getT();
    const kingPos = findKing(turn);
    const opponent = turn === 'w' ? 'b' : 'w';
    const isUnderAttack = isSquareAttacked(kingPos, opponent);
    
    let hasAnyMove = false;
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(turn)) {
            if (getLegalMoves(i).length > 0) {
                hasAnyMove = true;
                break;
            }
        }
    }

    if (!hasAnyMove) {
        const winner = (turn === 'w' ? (localStorage.getItem('gameLang') === 'en' ? "BLACK" : "SİYAH") : (localStorage.getItem('gameLang') === 'en' ? "WHITE" : "BEYAZ"));
        if (isUnderAttack) {
            setTimeout(() => alert("ŞAH MAT! " + winner + (localStorage.getItem('gameLang') === 'en' ? " WINS." : " KAZANDI.")), 200);
        } else {
            setTimeout(() => alert(localStorage.getItem('gameLang') === 'en' ? "DRAW (STALEMATE)! No moves left." : "BERABERE (PAT)! Yapacak hamle kalmadı."), 200);
        }
    }
}

// --- 6. GÖRSELLEŞTİRME ---
function draw() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const isBlack = (Math.floor(i / 8) + (i % 8)) % 2 !== 0;
        square.className = `square ${isBlack ? 'black' : 'white'} ${selectedSquare === i ? 'active' : ''}`;
        
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
    if (statusElement && t) {
        const kingPos = findKing(turn);
        const opponent = turn === 'w' ? 'b' : 'w';
        const check = isSquareAttacked(kingPos, opponent);
        
        let label = (turn === 'w' ? t.status : t.statusBlack);
        if (check) label += (localStorage.getItem('gameLang') === 'en' ? " (CHECK!)" : " (ŞAH!)");
        
        statusElement.innerText = label;
    }
}

// İlk başlatma
initGame();
