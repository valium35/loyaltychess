// --- 1. DEĞİŞKENLER VE DURUM ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let enPassantTarget = null;
let hasMoved = { 'w-k': false, 'b-k': false, 'w-r-56': false, 'w-r-63': false, 'b-r-0': false, 'b-r-7': false };
let isBetrayalMoveMode = false; 
let betrayalTarget = null;     

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
    draw();
    updateStatus();
}

// --- 3. HAKEM KONTROLLERİ ---
function getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; }
function getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; }

function findKing(color) {
    for (let i = 0; i < 64; i++) if (layout[i] === color + '-k') return i;
    return -1;
}

// DÜZELTME: İhanet eden taşın şah çekmesini engelleyen saldırı kontrolü
function isSquareAttacked(targetIndex, attackerColor) {
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            // KURAL: Eğer bu taş ihanet modundaki taysa, Şah'a (targetIndex) saldıramaz
            if (isBetrayalMoveMode && i === betrayalTarget) {
                const kingPos = findKing(attackerColor === 'w' ? 'b' : 'w');
                if (targetIndex === kingPos) continue; 
            }

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
    const rawMoves = getRawMoves(i);
    const color = layout[i][0];
    return rawMoves.filter(move => testMoveForSafety(i, move, color));
}

function getRawMoves(i) {
    const piece = layout[i];
    if (!piece) return [];
    const color = piece[0], type = piece[2], { r, c } = getCoords(i);
    let moves = [];

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
            const row = (color === 'w' ? 7 : 0);
            if (!hasMoved[color+'-r-'+getIndex(row,7)] && !layout[getIndex(row,5)] && !layout[getIndex(row,6)]) moves.push(getIndex(row,6));
            if (!hasMoved[color+'-r-'+getIndex(row,0)] && !layout[getIndex(row,1)] && !layout[getIndex(row,2)] && !layout[getIndex(row,3)]) moves.push(getIndex(row,2));
        }
    }
    if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        const forward = getIndex(r+dir, c);
        if (forward !== null && !layout[forward]) {
            moves.push(forward);
            if (r === (color === 'w' ? 6 : 1) && !layout[getIndex(r+2*dir, c)]) moves.push(getIndex(r+2*dir, c));
        }
        // Piyon Koruma Düzeltmesi: Her zaman çaprazları tehdit eder/korur
        [getIndex(r+dir, c-1), getIndex(r+dir, c+1)].forEach(diag => {
            if (diag !== null) {
                const columnDiff = Math.abs((diag % 8) - c);
                if (columnDiff === 1) moves.push(diag);
            }
        });
    }
    return moves;
}

// --- 4. OYUN DÖNGÜSÜ ---
function handleSquareClick(i) {
    if (isBetrayalMoveMode) {
        const moves = getLegalMoves(betrayalTarget);
        if (moves.includes(i)) {
            executeMove(betrayalTarget, i);
            layout[i] = ''; // Hamle bitti silinir
            completeTurn();
        } else {
            alert("İhanet eden taşı hareket ettirmelisin!");
        }
        return;
    }

    const piece = layout[i];
    if (selectedSquare === null) {
        if (piece && piece.startsWith(turn)) { selectedSquare = i; draw(); }
    } else {
        const moves = getLegalMoves(selectedSquare);
        if (moves.includes(i)) {
            executeMove(selectedSquare, i);
            selectedSquare = null;
            draw(); // TAŞIN YERİNE GİTTİĞİNİ ÖNCE ÇİZ

            // ZAMANLAMA DÜZELTMESİ: Taş yerine oturduktan sonra pop-up açılır
            setTimeout(() => {
                const potentialBetrayal = checkBetrayalOpportunity();
                if (potentialBetrayal !== null) {
                    handleBetrayal(potentialBetrayal);
                } else {
                    completeTurn();
                }
            }, 100); 
        } else {
            selectedSquare = piece && piece.startsWith(turn) ? i : null;
            draw();
        }
    }
}

function checkBetrayalOpportunity() {
    const opp = turn === 'w' ? 'b' : 'w';
    if (isSquareAttacked(findKing(turn), opp)) return null;
    for (let i = 0; i < 64; i++) {
        const p = layout[i];
        if (p && p.startsWith(turn) && ['n', 'b', 'r'].includes(p[2])) {
            if (isSquareAttacked(i, opp) && !isSquareAttacked(i, turn)) return i;
        }
    }
    return null;
}

function handleBetrayal(targetIndex) {
    const name = layout[targetIndex][2] === 'r' ? 'Kale' : layout[targetIndex][2] === 'n' ? 'At' : 'Fil';
    
    // Görsel olarak sıranın değiştiğini hissettirmek için status güncelle
    statusElement.innerText = "⚠️ KRİTİK KARAR BEKLENİYOR...";

    if (confirm(`${name} korunmasız! İhanet mi etsin (Tamam), feda mı edilsin (İptal)?`)) {
        const oldPiece = layout[targetIndex];
        layout[targetIndex] = (oldPiece[0] === 'w' ? 'b' : 'w') + oldPiece.substring(1);
        isBetrayalMoveMode = true;
        betrayalTarget = targetIndex;
        draw();
        updateStatus();
        alert("İHANET! Bu taşla rakip adına tek bir hamle yap (Şah çekemezsin).");
    } else {
        layout[targetIndex] = '';
        completeTurn();
    }
}

function executeMove(from, to) {
    const piece = layout[from], type = piece[2];
    if (type === 'p' && to === enPassantTarget) layout[getIndex(Math.floor(from/8), to%8)] = '';
    if (type === 'k' && Math.abs((from%8)-(to%8)) === 2) {
        const r = Math.floor(from/8);
        const rFrom = (to%8 === 6) ? getIndex(r, 7) : getIndex(r, 0);
        const rTo = (to%8 === 6) ? getIndex(r, 5) : getIndex(r, 3);
        layout[rTo] = layout[rFrom]; layout[rFrom] = '';
    }
    if (type === 'k') hasMoved[piece[0]+'-k'] = true;
    if (type === 'r') hasMoved[piece[0]+'-r-'+from] = true;
    enPassantTarget = (type === 'p' && Math.abs(Math.floor(from/8)-Math.floor(to/8)) === 2) ? getIndex((Math.floor(from/8)+Math.floor(to/8))/2, from%8) : null;
    layout[to] = layout[from]; layout[from] = '';
}

function isCheckmate(color) {
    const opp = color === 'w' ? 'b' : 'w';
    if (!isSquareAttacked(findKing(color), opp)) return false;
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(color) && getLegalMoves(i).length > 0) return false;
    }
    return true;
}

function completeTurn() {
    isBetrayalMoveMode = false;
    betrayalTarget = null;
    turn = turn === 'w' ? 'b' : 'w';
    draw();
    updateStatus();
    if (isCheckmate(turn)) alert("ŞAH MAT!");
}

function draw() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.className = `square ${(Math.floor(i/8)+(i%8))%2!==0?'black':'white'} ${selectedSquare===i?'active-law':''}`;
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
    statusElement.innerText = isBetrayalMoveMode ? "⚠️ İHANET HAMLESİ" : "SIRA: " + (turn === 'w' ? "BEYAZDA" : "SİYAHTA");
}

initGame();
