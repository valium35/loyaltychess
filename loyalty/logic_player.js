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

// --- 2. YARDIMCI VE ANALİZ (En başa aldık ki Engine görsün) ---
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

function getRawMoves(i, onlyAttacks = false) {
    const piece = layout[i];
    if (!piece) return [];
    const color = piece[0], type = piece[2], { r, c } = getCoords(i);
    let moves = [];

    // TAŞ HAREKET TANIMLARI
    const directions = {
        'r': [[1,0], [-1,0], [0,1], [0,-1]], // KALE: Aşağı, Yukarı, Sağ, Sol
        'b': [[1,1], [1,-1], [-1,1], [-1,-1]], // FİL: Çaprazlar
        'q': [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1]], // VEZİR: Hepsi
        'n': [[2,1], [2,-1], [-2,1], [-2,-1], [1,2], [1,-2], [-1,2], [-1,-2]], // AT: L hamle
        'k': [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1]]  // ŞAH: Tek kare
    };

    // KALE (r), FİL (b) VE VEZİR (q) İÇİN KAYMA MANTIĞI
    if (['r', 'b', 'q'].includes(type)) {
        directions[type].forEach(d => {
            for (let j = 1; j < 8; j++) {
                const targetR = r + d[0] * j;
                const targetC = c + d[1] * j;
                const target = getIndex(targetR, targetC);

                if (target === null) break; // Tahta dışıysa dur

                if (!layout[target]) {
                    moves.push(target); // Boşsa ekle ve devam et
                } else {
                    // Eğer rakip taşsa ekle ve dur, kendi taşınsa sadece dur
                    if (onlyAttacks || layout[target][0] !== color) {
                        moves.push(target);
                    }
                    break; 
                }
            }
        });
    } 
    // AT (n) VE ŞAH (k) İÇİN SIÇRAMA MANTIĞI
    else if (type === 'n' || type === 'k') {
        directions[type].forEach(d => {
            const target = getIndex(r + d[0], c + d[1]);
            if (target !== null) {
                if (onlyAttacks || !layout[target] || layout[target][0] !== color) {
                    moves.push(target);
                }
            }
        });
    } 
    // PİYON (p) MANTIĞI
    else if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        if (!onlyAttacks) {
            const f1 = getIndex(r + dir, c);
            if (f1 !== null && !layout[f1]) {
                moves.push(f1);
                // İlk hamlede 2 kare gitme
                if (r === (color === 'w' ? 6 : 1)) {
                    const f2 = getIndex(r + 2 * dir, c);
                    if (!layout[f2]) moves.push(f2);
                }
            }
        }
        // Çapraz yeme
        [getIndex(r + dir, c - 1), getIndex(r + dir, c + 1)].forEach(diag => {
            if (diag !== null && (onlyAttacks || (layout[diag] && layout[diag][0] !== color) || diag === enPassantTarget)) {
                moves.push(diag);
            }
        });
    }
    return moves;
}

// BU SATIRLARI MUTLAKA FONKSİYONUN ALTINA EKLE (Engine görsün)
window.getRawMoves = getRawMoves;
window.isSquareAttacked = isSquareAttacked;
window.findKing = findKing;
// --- 3. BAŞLATMA ---
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
    if (typeof LoyaltyEngine !== 'undefined') {
        LoyaltyEngine.threatenedList = [];
        LoyaltyEngine.isBetrayalMode = false;
    }
    draw();
    updateStatus();
}

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
            
            // Sıra değişmeden önce ihanet taraması
            if (typeof LoyaltyEngine !== 'undefined') {
                LoyaltyEngine.scanBoard(layout, (turn === 'w' ? 'b' : 'w'));
            }

            turn = (turn === 'w' ? 'b' : 'w'); 
            draw();
            updateStatus();
        } else {
            selectedSquare = (layout[i] && layout[i].startsWith(turn)) ? i : null;
            if (typeof LoyaltyEngine !== 'undefined') LoyaltyEngine.isBetrayalMode = false;
            draw();
        }
    }
}

function executeMove(from, to) {
    const piece = layout[from], type = piece[2], color = piece[0];
    layout[to] = layout[from];
    layout[from] = '';

    // İhanet hamlesiyse taşı sil
    if (typeof LoyaltyEngine !== 'undefined' && LoyaltyEngine.isBetrayalMode) {
        setTimeout(() => {
            LoyaltyEngine.executeFinalMission(layout, to);
            draw();
        }, 300);
    }
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

function getLegalMoves(i) {
    const piece = layout[i];
    if (!piece) return [];
    if (typeof LoyaltyEngine !== 'undefined' && LoyaltyEngine.isBetrayalMode) {
        return getRawMoves(i); // İhanet hamlesinde şimdilik hamleyi kısıtlama (basitlik için)
    }
    return getRawMoves(i).filter(move => testMoveForSafety(i, move, piece[0]));
}

function testMoveForSafety(from, to, color) {
    const originalFrom = layout[from], originalTo = layout[to];
    layout[to] = originalFrom; layout[from] = '';
    const kingPos = findKing(color);
    const opponent = color === 'w' ? 'b' : 'w';
    const safe = kingPos === -1 ? true : !isSquareAttacked(kingPos, opponent);
    layout[from] = originalFrom; layout[to] = originalTo;
    return safe;
}

function updateStatus() {
    const t = getT();
    let label = (turn === 'w' ? t.status : t.statusBlack);
    statusElement.innerText = label;
}

function addToLog(from, to) {
    const moveText = `${getCoordsLabel(from)}-${getCoordsLabel(to)}`;
    const div = document.createElement('div');
    div.innerText = moveText;
    logElement.prepend(div);
}

initGame();
