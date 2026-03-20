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

function getT() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    if (typeof LoyaltyDict !== 'undefined' && LoyaltyDict[lang]) {
        return LoyaltyDict[lang];
    }
    return { status: "Sıra Beyazda", statusBlack: "Sıra Siyahda", statusCheck: " (ŞAH!)" };
}

// --- 2. YARDIMCI FONKSİYONLAR (Global Erişim İçin) ---
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

// Engine'in bu fonksiyonlara erişebilmesi için pencereye bağlıyoruz
window.isSquareAttacked = isSquareAttacked;
window.findKing = findKing;

// --- 3. HAREKET MANTIĞI (ROK DAHİL) ---
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
                else { if (onlyAttacks || layout[target][0] !== color) moves.push(target); break; }
            }
        });
    } else if (type === 'n' || type === 'k') {
        // At ve Şah'ın standart hamleleri
        directions[type].forEach(d => {
            const target = getIndex(r + d[0], c + d[1]);
            if (target !== null && (onlyAttacks || !layout[target] || layout[target][0] !== color)) moves.push(target);
        });

        // --- ROK (CASTLING) EKLEMESİ ---
        if (type === 'k' && !onlyAttacks && !hasMoved[color + '-k']) {
            const opponent = color === 'w' ? 'b' : 'w';
            // Şah çekilmiyorken rok yapılabilir
            if (!isSquareAttacked(i, opponent)) {
                // Kısa Rok
                const r7 = getIndex(r, 7), g = getIndex(r, 6), f = getIndex(r, 5);
                if (!hasMoved[color + '-r-' + r7] && !layout[f] && !layout[g]) {
                    if (!isSquareAttacked(f, opponent) && !isSquareAttacked(g, opponent)) moves.push(g);
                }
                // Uzun Rok
                const r0 = getIndex(r, 0), c1 = getIndex(r, 2), d1 = getIndex(r, 3), b1 = getIndex(r, 1);
                if (!hasMoved[color + '-r-' + r0] && !layout[d1] && !layout[c1] && !layout[b1]) {
                    if (!isSquareAttacked(d1, opponent) && !isSquareAttacked(c1, opponent)) moves.push(c1);
                }
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
window.getRawMoves = getRawMoves;

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
    if (typeof LoyaltyEngine !== 'undefined' && LoyaltyEngine.isBetrayalMode) {
        return getRawMoves(i).filter(move => LoyaltyEngine.canBetrayerMoveHere(layout, i, move, turn));
    }
    return getRawMoves(i).filter(move => testMoveForSafety(i, move, piece[0]));
}

// --- 4. OYUN AKIŞI VE İHANET KONTROLÜ ---
function handleSquareClick(i) {
    if (selectedSquare === null) {
        if (layout[i] && layout[i].startsWith(turn)) {
            selectedSquare = i;
            if (typeof LoyaltyEngine !== 'undefined') LoyaltyEngine.isBetrayalMode = false;
            draw();
        } 
        else if (typeof LoyaltyEngine !== 'undefined' && LoyaltyEngine.threatenedList.includes(i)) {
            selectedSquare = i;
            LoyaltyEngine.isBetrayalMode = true;
            draw();
        }
    } else {
        const legalMoves = getLegalMoves(selectedSquare);
        if (legalMoves.includes(i)) {
            addToLog(selectedSquare, i); 
            executeMove(selectedSquare, i);
            selectedSquare = null;
            
            if (typeof LoyaltyEngine !== 'undefined') {
                LoyaltyEngine.scanBoard(layout, (turn === 'w' ? 'b' : 'w'));
            }
            turn = (turn === 'w' ? 'b' : 'w'); 
            draw();
            updateStatus();
            checkGameEnd();
        } else {
            selectedSquare = (layout[i] && layout[i].startsWith(turn)) ? i : null;
            if (typeof LoyaltyEngine !== 'undefined') LoyaltyEngine.isBetrayalMode = false;
            draw();
        }
    }
}

function executeMove(from, to) {
    const piece = layout[from], type = piece[2], color = piece[0];
    
    // Rok Taşıma İşlemi
    if (type === 'k' && Math.abs((from % 8) - (to % 8)) === 2) {
        const rookFrom = (to % 8 === 6) ? getIndex(Math.floor(to/8), 7) : getIndex(Math.floor(to/8), 0);
        const rookTo = (to % 8 === 6) ? getIndex(Math.floor(to/8), 5) : getIndex(Math.floor(to/8), 3);
        layout[rookTo] = layout[rookFrom]; layout[rookFrom] = '';
    }

    if (type === 'k') hasMoved[color + '-k'] = true;
    if (type === 'r') hasMoved[color + '-r-' + from] = true;

    layout[to] = layout[from];
    layout[from] = '';

    if (typeof LoyaltyEngine !== 'undefined' && LoyaltyEngine.isBetrayalMode) {
        setTimeout(() => {
            LoyaltyEngine.executeFinalMission(layout, to);
            draw();
            updateStatus();
        }, 300);
    }
}

// --- 5. BAŞLATMA VE ÇİZİM ---
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
    draw();
    updateStatus();
}

function draw() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const isBlack = (Math.floor(i / 8) + (i % 8)) % 2 !== 0;
        square.className = `square ${isBlack ? 'black' : 'white'} ${selectedSquare === i ? 'active' : ''}`;
        
        if (typeof LoyaltyEngine !== 'undefined' && LoyaltyEngine.threatenedList.includes(i)) {
            square.style.boxShadow = "inset 0 0 15px rgba(255, 0, 0, 0.7)";
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
    const t = getT();
    let label = (turn === 'w' ? t.status : t.statusBlack);
    const kingPos = findKing(turn);
    if (isSquareAttacked(kingPos, turn === 'w' ? 'b' : 'w')) label += t.statusCheck;
    statusElement.innerText = label;
}

function addToLog(from, to) {
    const moveText = `${getCoordsLabel(from)}-${getCoordsLabel(to)}`;
    const div = document.createElement('div');
    div.innerText = moveText;
    logElement.prepend(div);
}

function checkGameEnd() {} // Opsiyonel: Buraya mat kontrolü eklenebilir

window.onload = initGame;
