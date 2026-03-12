// --- 1. DEĞİŞKENLER ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let isBetrayalMoveMode = false;
let betrayalTarget = null;
let threatsFromLastTurn = []; // Hamleyi bitiren oyuncunun oluşturduğu tehditler

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
    threatsFromLastTurn = [];
    turn = 'w';
    draw();
    updateStatus();
}

// --- 3. HAREKET VE TEHDİT MANTIĞI ---
function getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; }
function getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; }

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
    } else if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        [getIndex(r + dir, c - 1), getIndex(r + dir, c + 1)].forEach(diag => {
            if (diag !== null) moves.push(diag); 
        });
        if (!onlyAttacks) {
            const f1 = getIndex(r + dir, c);
            if (f1 !== null && !layout[f1]) {
                moves.push(f1);
                if (r === (color === 'w' ? 6 : 1)) {
                    const f2 = getIndex(r + 2*dir, c);
                    if (!layout[f2]) moves.push(f2);
                }
            }
        }
    }
    return moves;
}

// Belirli bir rengin tahtada tehdit ettiği TÜM kareleri döner
function getAllAttackedSquares(attackerColor) {
    let attacked = new Set();
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            getRawMoves(i, true).forEach(m => attacked.add(m));
        }
    }
    return attacked;
}

// --- 4. OYUN AKIŞI ---
function handleSquareClick(i) {
    if (isBetrayalMoveMode) {
        if (getRawMoves(betrayalTarget).includes(i)) {
            layout[i] = ''; layout[betrayalTarget] = '';
            isBetrayalMoveMode = false; betrayalTarget = null;
            completeTurn();
        }
        return;
    }
    if (selectedSquare === null) {
        if (layout[i] && layout[i].startsWith(turn)) { selectedSquare = i; draw(); }
    } else {
        if (getRawMoves(selectedSquare).includes(i)) {
            layout[i] = layout[selectedSquare]; layout[selectedSquare] = '';
            selectedSquare = null; completeTurn();
        } else {
            selectedSquare = (layout[i] && layout[i].startsWith(turn)) ? i : null; draw();
        }
    }
}

function completeTurn() {
    const lastPlayerColor = turn;
    const nextPlayerColor = (turn === 'w' ? 'b' : 'w');

    // 1. ADIM: Hamleyi bitiren oyuncunun tüm tehditlerini şimdi tara
    const currentAttacks = getAllAttackedSquares(lastPlayerColor);

    // 2. ADIM: İHANET KONTROLÜ
    // Geçen turdan gelen bir tehdit vardıysa ve o taş hala korunmuyorsa:
    let betrayalCandidate = null;
    const currentProtections = getAllAttackedSquares(nextPlayerColor);

    for (let targetIndex of threatsFromLastTurn) {
        const piece = layout[targetIndex];
        // Taş orada mı, sırası gelenin mi ve At/Kale/Fil mi?
        if (piece && piece.startsWith(nextPlayerColor) && ['n', 'r', 'b'].includes(piece[2])) {
            // Hala rakip (lastPlayerColor) tarafından isteniyor mu?
            const isStillAttacked = getAllAttackedSquares(lastPlayerColor).has(targetIndex);
            // Kendi tarafı (nextPlayerColor) korumuyor mu?
            const isNotProtected = !currentProtections.has(targetIndex);

            if (isStillAttacked && isNotProtected) {
                betrayalCandidate = targetIndex;
                break;
            }
        }
    }

    // 3. ADIM: Turu devret ve hafızayı güncelle
    turn = nextPlayerColor;
    threatsFromLastTurn = Array.from(currentAttacks); // Bu turun tehditleri, bir sonraki turun "ihanet listesi" olur.

    draw();
    updateStatus();

    if (betrayalCandidate !== null) {
        setTimeout(() => askForBetrayal(betrayalCandidate), 100);
    }
}

function askForBetrayal(targetIndex) {
    const name = (turn === 'w' ? 'BEYAZ' : 'SİYAH');
    const pieceNames = { 'n': 'ATI', 'r': 'KALESİ', 'b': 'FİLİ' };
    const pType = layout[targetIndex][2];
    
    if (confirm(`${name}! Tehdit altındaki ${pieceNames[pType]} korumadın. İhanet hamlesi yapmak ister misin?`)) {
        layout[targetIndex] = turn + layout[targetIndex].substring(1); 
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
        if (isBetrayalMoveMode && betrayalTarget === i) square.style.backgroundColor = "rgba(255, 0, 0, 0.5)";
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
