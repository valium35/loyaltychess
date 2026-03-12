// --- 1. DEĞİŞKENLER ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let isBetrayalMoveMode = false;
let betrayalTarget = null;
let currentThreatsToOpponent = []; // Bu tur hamle bittikten sonra oluşan tehditler

const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');

const initialSetup = {
    0: 'b-r', 1: 'b-n', 2: 'b-b', 3: 'b-q', 4: 'b-k', 5: 'b-b', 6: 'b-n', 7: 'b-r',
    8: 'b-p', 9: 'b-p', 10: 'b-p', 11: 'b-p', 12: 'b-p', 13: 'b-p', 14: 'b-p', 15: 'b-p',
    48: 'w-p', 49: 'w-p', 50: 'w-p', 51: 'w-p', 52: 'w-p', 53: 'w-p', 54: 'w-p', 55: 'w-p',
    56: 'w-r', 57: 'w-n', 58: 'w-b', 59: 'w-q', 60: 'w-k', 61: 'w-b', 62: 'w-n', 63: 'w-r'
};

function initGame() {
    layout.fill('');
    Object.keys(initialSetup).forEach(i => layout[i] = initialSetup[i]);
    currentThreatsToOpponent = [];
    turn = 'w';
    draw();
    updateStatus();
}

// --- 2. HAREKET VE TEHDİT ANALİZİ ---
function getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; }
function getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; }

function getRawMoves(i, checkThreatOnly = false) {
    const piece = layout[i];
    if (!piece) return [];
    const color = piece[0], type = piece[2], { r, c } = getCoords(i);
    let moves = [];

    const dirs = {
        'r': [[1,0],[-1,0],[0,1],[0,-1]],
        'b': [[1,1],[1,-1],[-1,1],[-1,-1]],
        'q': [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],
        'n': [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]],
        'k': [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
    };

    if (['r', 'b', 'q'].includes(type)) {
        dirs[type].forEach(d => {
            for(let j=1; j<8; j++) {
                const t = getIndex(r + d[0]*j, c + d[1]*j);
                if (t === null) break;
                if (!layout[t]) moves.push(t);
                else { if (layout[t][0] !== color) moves.push(t); break; }
            }
        });
    } else if (['n', 'k'].includes(type)) {
        dirs[type].forEach(d => {
            const t = getIndex(r + d[0], c + d[1]);
            if (t !== null && (!layout[t] || layout[t][0] !== color)) moves.push(t);
        });
    } else if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        if (checkThreatOnly) { // Tehdit için sadece çaprazlar
            [getIndex(r + dir, c - 1), getIndex(r + dir, c + 1)].forEach(diag => {
                if (diag !== null) moves.push(diag);
            });
        } else {
            const f1 = getIndex(r + dir, c);
            if (f1 !== null && !layout[f1]) {
                moves.push(f1);
                if (r === (color === 'w' ? 6 : 1)) {
                    const f2 = getIndex(r + 2*dir, c);
                    if (!layout[f2]) moves.push(f2);
                }
            }
            [getIndex(r + dir, c - 1), getIndex(r + dir, c + 1)].forEach(diag => {
                if (diag !== null && layout[diag] && layout[diag][0] !== color) moves.push(diag);
            });
        }
    }
    return moves;
}

// Belirli bir rengin (attackerColor) tahtada tehdit ettiği TÜM rakip kareleri bulur
function getAllThreatsByColor(attackerColor) {
    let threats = [];
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            const moves = getRawMoves(i, true);
            moves.forEach(m => {
                if (layout[m] && !layout[m].startsWith(attackerColor)) {
                    threats.push(m);
                }
            });
        }
    }
    return [...new Set(threats)]; // Tekrar edenleri temizle
}

function isSquareAttacked(targetIndex, attackerColor) {
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            if (getRawMoves(i, true).includes(targetIndex)) return true;
        }
    }
    return false;
}

// --- 3. OYUN DÖNGÜSÜ ---
function handleSquareClick(i) {
    if (isBetrayalMoveMode) {
        if (getRawMoves(betrayalTarget).includes(i)) {
            layout[betrayalTarget] = ''; 
            layout[i] = ''; 
            isBetrayalMoveMode = false;
            betrayalTarget = null;
            completeTurn();
        }
        return;
    }

    const piece = layout[i];
    if (selectedSquare === null) {
        if (piece && piece.startsWith(turn)) { selectedSquare = i; draw(); }
    } else {
        const moves = getRawMoves(selectedSquare);
        if (moves.includes(i)) {
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
    layout[to] = layout[from];
    layout[from] = '';
}

function completeTurn() {
    const lastPlayer = turn;
    // 1. ADIM: Sıra değişmeden ÖNCE, şu anki oyuncunun yaptığı tehditleri kaydet
    const threatsMadeThisTurn = getAllThreatsByColor(lastPlayer);

    // 2. ADIM: Sırayı değiştir
    turn = (turn === 'w' ? 'b' : 'w');

    // 3. ADIM: İhanet kontrolü (Bir önceki turda tehdit edilenler arasından şu an korunmayan var mı?)
    let betrayalFound = null;
    for (let targetIndex of currentThreatsToOpponent) {
        if (layout[targetIndex] && layout[targetIndex].startsWith(turn)) {
            // Hala düşman (lastPlayer) tarafından isteniyor mu? VE artık kendi rengince korunmuyor mu?
            if (isSquareAttacked(targetIndex, lastPlayer) && !isSquareAttacked(targetIndex, turn)) {
                betrayalFound = targetIndex;
                break;
            }
        }
    }

    // 4. ADIM: Gelecek tur için tehdit listesini güncelle
    currentThreatsToOpponent = threatsMadeThisTurn;

    draw();
    updateStatus();

    if (betrayalFound !== null) {
        setTimeout(() => askForBetrayal(betrayalFound), 150);
    }
}

function askForBetrayal(targetIndex) {
    const name = (turn === 'w' ? 'BEYAZ' : 'SİYAH');
    if (confirm(`${name}! Tehdit edilen taşını korumadın. Hainle oynamak ister misin?`)) {
        const p = layout[targetIndex];
        layout[targetIndex] = turn + p.substring(1); 
        isBetrayalMoveMode = true;
        betrayalTarget = targetIndex;
        draw();
        updateStatus();
    }
}

function draw() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.className = `square ${(Math.floor(i/8)+(i%8))%2!==0?'black':'white'}`;
        if (selectedSquare === i) square.classList.add('active-law');
        if (isBetrayalMoveMode && betrayalTarget === i) square.style.backgroundColor = "red";
        
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
    statusElement.innerText = isBetrayalMoveMode ? "⚠️ İHANET MODU" : "SIRA: " + (turn === 'w' ? "BEYAZDA" : "SİYAHTA");
}

initGame();
