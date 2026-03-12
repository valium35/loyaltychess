// --- 1. DEĞİŞKENLER VE DURUM ---
let layout = Array(64).fill('');
let turn = 'w'; 
let selectedSquare = null;
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

// --- 3. HAKEM ---
function getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; }
function getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; }

function isSquareAttacked(targetIndex, attackerColor) {
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            const moves = getRawMoves(i); 
            if (moves.includes(targetIndex)) return true;
        }
    }
    return false;
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
    if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        const forward = getIndex(r+dir, c);
        if (forward !== null && !layout[forward]) moves.push(forward);
        [getIndex(r+dir, c-1), getIndex(r+dir, c+1)].forEach(diag => {
            if (diag !== null) moves.push(diag); 
        });
    }
    if (type === 'k') {
        [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d => {
            const target = getIndex(r+d[0], c+d[1]);
            if (target !== null && (!layout[target] || layout[target][0] !== color)) moves.push(target);
        });
    }
    return moves;
}

// --- 4. OYUN DÖNGÜSÜ ---
function handleSquareClick(i) {
    // İHANET MODU: Siyah sırası gelince ihanet eden taşı seçti
    if (isBetrayalMoveMode) {
        if (getRawMoves(betrayalTarget).includes(i)) {
            executeMove(betrayalTarget, i);
            layout[i] = ''; // İhanet bitti, taş silindi
            isBetrayalMoveMode = false;
            betrayalTarget = null;
            completeTurn(); // Sıra karşıya geçer
        }
        return;
    }

    const piece = layout[i];
    if (selectedSquare === null) {
        if (piece && piece.startsWith(turn)) {
            // KURAL: Eğer bu taş aslında rakibinse ama şu an ihanet çemberindeyse
            if (piece.startsWith(turn) && piece.includes('betray')) {
                // Bu mantığı aşağıda kuracağız
            }
            selectedSquare = i; draw();
        }
    } else {
        const moves = getRawMoves(selectedSquare);
        if (moves.includes(i)) {
            executeMove(selectedSquare, i);
            selectedSquare = null;
            completeTurn(); 
        } else {
            selectedSquare = piece && piece.startsWith(turn) ? i : null;
            draw();
        }
    }
}

function completeTurn() {
    turn = (turn === 'w' ? 'b' : 'w');
    draw();
    updateStatus();

    // SIRA SİZE GEÇTİĞİNDE: Rakip arkada korunmayan taş bıraktı mı?
    setTimeout(() => {
        const betrayedIndex = checkBetrayalOpportunity();
        if (betrayedIndex !== null) {
            askForBetrayal(betrayedIndex);
        }
    }, 100);
}

function checkBetrayalOpportunity() {
    const myColor = turn;
    const oppColor = turn === 'w' ? 'b' : 'w';
    
    for (let i = 0; i < 64; i++) {
        const p = layout[i];
        // Rakibin (oppColor) taşı benim (myColor) tarafımdan isteniyor mu ve korunmuyor mu?
        if (p && p.startsWith(oppColor) && ['n', 'r', 'b'].includes(p[2])) {
            if (isSquareAttacked(i, myColor) && !isSquareAttacked(i, oppColor)) return i;
        }
    }
    return null;
}

function askForBetrayal(targetIndex) {
    const name = (turn === 'w' ? 'BEYAZ' : 'SİYAH');
    if (confirm(`${name}! Rakibin bir taşını korumasız bıraktı. \n\nBu turda kendi hamlen yerine bu taşı İHANET ettirmek ister misin?`)) {
        const p = layout[targetIndex];
        layout[targetIndex] = turn + p.substring(1); // Taşı geçici olarak benim rengim yap
        isBetrayalMoveMode = true;
        betrayalTarget = targetIndex;
        draw();
        updateStatus();
    }
}

function executeMove(from, to) {
    layout[to] = layout[from];
    layout[from] = '';
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
    if (isBetrayalMoveMode) {
        statusElement.innerText = "⚠️ İHANET MODU: Taşı hareket ettir!";
    } else {
        statusElement.innerText = "SIRA: " + (turn === 'w' ? "BEYAZDA" : "SİYAHTA");
    }
}

initGame();
