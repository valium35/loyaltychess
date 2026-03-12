// --- 1. DEĞİŞKENLER VE DURUM ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let enPassantTarget = null;
let hasMoved = {}; 

let isBetrayalMoveMode = false;
let betrayalTarget = null;
let threatsFromLastTurn = [];

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
    layout.fill('');
    Object.keys(initialSetup).forEach(i => layout[i] = initialSetup[i]);
    // Rok takibi için durumları sıfırla
    hasMoved = { 'w-k': false, 'b-k': false, 'w-r-56': false, 'w-r-63': false, 'b-r-0': false, 'b-r-7': false };
    isBetrayalMoveMode = false;
    betrayalTarget = null;
    threatsFromLastTurn = [];
    turn = 'w';
    draw();
    updateStatus();
}

// --- 3. HAKEM MANTIĞI ---
function getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; }
function getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; }

function findKing(color) {
    for (let i = 0; i < 64; i++) if (layout[i] === color + '-k') return i;
    return -1;
}

function isSquareAttacked(targetIndex, attackerColor) {
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            // true: piyonların sadece çapraz saldırılarını al
            if (getRawMoves(i, true).includes(targetIndex)) return true;
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
    const safe = !isSquareAttacked(kingPos, color === 'w' ? 'b' : 'w');
    layout[from] = originalFrom;
    layout[to] = originalTo;
    return safe;
}

function getLegalMoves(i) {
    const piece = layout[i];
    if (!piece) return [];
    const color = piece[0];
    const rawMoves = getRawMoves(i);
    return rawMoves.filter(move => testMoveForSafety(i, move, color));
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
                else { if (onlyAttacks || layout[target][0] !== color) moves.push(target); break; }
            }
        });
    } else if (type === 'n' || type === 'k') {
        directions[type].forEach(d => {
            const target = getIndex(r + d[0], c + d[1]);
            if (target !== null && (onlyAttacks || !layout[target] || layout[target][0] !== color)) moves.push(target);
        });
        
        // --- GELİŞMİŞ ROK KONTROLÜ ---
        if (type === 'k' && !onlyAttacks && !hasMoved[color+'-k']) {
            const opponent = color === 'w' ? 'b' : 'w';
            if (!isSquareAttacked(i, opponent)) { // Şah altındayken rok olmaz
                // Kısa Rok
                const r7 = getIndex(r, 7), f1 = getIndex(r, 5), g1 = getIndex(r, 6);
                if (!hasMoved[color+'-r-'+r7] && !layout[f1] && !layout[g1]) {
                    if (!isSquareAttacked(f1, opponent) && !isSquareAttacked(g1, opponent)) moves.push(g1);
                }
                // Uzun Rok
                const r0 = getIndex(r, 0), d1 = getIndex(r, 3), c1 = getIndex(r, 2), b1 = getIndex(r, 1);
                if (!hasMoved[color+'-r-'+r0] && !layout[d1] && !layout[c1] && !layout[b1]) {
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
            if (diag !== null) {
                const targetPiece = layout[diag];
                if (onlyAttacks || (targetPiece && targetPiece[0] !== color) || diag === enPassantTarget) {
                    if (Math.abs((diag % 8) - c) === 1) moves.push(diag);
                }
            }
        });
    }
    return moves;
}

// --- 4. OYUN DÖNGÜSÜ ---
function handleSquareClick(i) {
    if (isBetrayalMoveMode) {
        if (getRawMoves(betrayalTarget).includes(i)) {
            // İhanet eden taş görevini tamamlar ve tahtadan çıkar
            layout[i] = ''; 
            layout[betrayalTarget] = ''; 
            isBetrayalMoveMode = false;
            betrayalTarget = null;
            completeTurn();
        }
        return;
    }

    const piece = layout[i];
    if (selectedSquare === null) {
        if (piece && piece.startsWith(turn)) {
            selectedSquare = i;
            draw();
        }
    } else {
        const legalMoves = getLegalMoves(selectedSquare);
        if (legalMoves.includes(i)) {
            executeMove(selectedSquare, i);
            selectedSquare = null;
            completeTurn();
        } else {
            selectedSquare = (piece && piece.startsWith(turn)) ? i : null;
            draw();
        }
    }
}

function executeMove(from, to) {
    const piece = layout[from], type = piece[2], color = piece[0];
    
    // Geçerken Alış (Piyon silme)
    if (type === 'p' && to === enPassantTarget) {
        layout[getIndex(Math.floor(from/8), to % 8)] = '';
    }
    
    // Rok (Kaleyi taşıma)
    if (type === 'k' && Math.abs((from % 8) - (to % 8)) === 2) {
        const rFrom = (to % 8 === 6) ? getIndex(Math.floor(to/8), 7) : getIndex(Math.floor(to/8), 0);
        const rTo = (to % 8 === 6) ? getIndex(Math.floor(to/8), 5) : getIndex(Math.floor(to/8), 3);
        layout[rTo] = layout[rFrom];
        layout[rFrom] = '';
    }

    // Hareket Kaydı
    if (type === 'k') hasMoved[color + '-k'] = true;
    if (type === 'r') hasMoved[color + '-r-' + from] = true;

    // En Passant Hedefi Belirle
    enPassantTarget = (type === 'p' && Math.abs(Math.floor(from/8) - Math.floor(to/8)) === 2) ? 
                      getIndex((Math.floor(from/8) + Math.floor(to/8)) / 2, from % 8) : null;

    layout[to] = layout[from];
    layout[from] = '';
}

function completeTurn() {
    const lastPlayer = turn;
    const nextPlayer = (turn === 'w' ? 'b' : 'w');
    
    // Geçen turdaki saldırıları topla (İhanet kontrolü için)
    let currentAttacks = [];
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(lastPlayer)) {
            getRawMoves(i, true).forEach(m => currentAttacks.push(m));
        }
    }

    // İhanet Kontrolü: Subay (n, r, b) tehdit altındaydı ve korunmadı mı?
    let betrayalCandidate = null;
    for (let targetIndex of threatsFromLastTurn) {
        const p = layout[targetIndex];
        if (p && p.startsWith(nextPlayer) && ['n', 'r', 'b'].includes(p[2])) {
            const isStillAttacked = currentAttacks.includes(targetIndex);
            const isProtected = isSquareAttacked(targetIndex, nextPlayer);
            if (isStillAttacked && !isProtected) {
                betrayalCandidate = targetIndex;
                break;
            }
        }
    }

    turn = nextPlayer;
    threatsFromLastTurn = currentAttacks;
    draw();
    updateStatus();

    if (isCheckmate(turn)) {
        setTimeout(() => alert("ŞAH MAT! Oyun bitti."), 300);
        return;
    }

    if (betrayalCandidate !== null) {
        setTimeout(() => {
            if (confirm("LoyaltyChess: Korumasız kalan subayın taraf değiştiriyor! İhanet hamlesi yapmak ister misin?")) {
                layout[betrayalCandidate] = turn + layout[betrayalCandidate].substring(1);
                isBetrayalMoveMode = true;
                betrayalTarget = betrayalCandidate;
                draw();
                updateStatus();
            }
        }, 150);
    }
}

function isCheckmate(color) {
    const kingPos = findKing(color);
    if (!isSquareAttacked(kingPos, color === 'w' ? 'b' : 'w')) return false;
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(color)) {
            if (getLegalMoves(i).length > 0) return false;
        }
    }
    return true;
}

function draw() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const isBlack = (Math.floor(i / 8) + (i % 8)) % 2 !== 0;
        square.className = `square ${isBlack ? 'black' : 'white'} ${selectedSquare === i ? 'active-law' : ''}`;
        
        if (isBetrayalMoveMode && betrayalTarget === i) {
            square.style.backgroundColor = "rgba(255, 69, 0, 0.7)"; // Hain taşı vurgula
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
    statusElement.innerText = isBetrayalMoveMode ? "⚠️ İHANET HAMLESİ BEKLENİYOR" : "SIRA: " + (turn === 'w' ? "BEYAZDA" : "SİYAHTA");
}

initGame();
