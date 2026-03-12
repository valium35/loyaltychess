// --- 1. DEĞİŞKENLER ---
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

// --- 3. HAREKET MANTIĞI ---
function getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; }
function getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; }

function getRawMoves(i) {
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
                else { if (layout[target][0] !== color) moves.push(target); break; }
            }
        });
    } else if (type === 'n' || type === 'k') {
        directions[type].forEach(d => {
            const target = getIndex(r + d[0], c + d[1]);
            if (target !== null && (!layout[target] || layout[target][0] !== color)) moves.push(target);
        });
    } else if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        const f1 = getIndex(r + dir, c);
        if (f1 !== null && !layout[f1]) {
            moves.push(f1);
            const startRow = (color === 'w' ? 6 : 1);
            const f2 = getIndex(r + 2*dir, c);
            if (r === startRow && !layout[f2]) moves.push(f2);
        }
        [getIndex(r + dir, c - 1), getIndex(r + dir, c + 1)].forEach(diag => {
            if (diag !== null && layout[diag] && layout[diag][0] !== color) moves.push(diag);
        });
    }
    return moves;
}

function isSquareAttacked(targetIndex, attackerColor) {
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            if (getRawMoves(i).includes(targetIndex)) return true;
        }
    }
    return false;
}

// --- 4. TIKLAMA VE OYUN AKIŞI ---
function handleSquareClick(i) {
    // 1. İHANET HAMLESİ MODU
    if (isBetrayalMoveMode) {
        const legalMoves = getRawMoves(betrayalTarget);
        if (legalMoves.includes(i)) {
            layout[i] = layout[betrayalTarget]; // Taşı yeni yere koy
            layout[betrayalTarget] = '';       // Eski yeri boşalt
            layout[i] = '';                    // KURAL: İhanet sonrası taş silinir
            isBetrayalMoveMode = false;
            betrayalTarget = null;
            completeTurn(); 
        } else {
            alert("Bu taşla buraya gidemezsin!");
        }
        return;
    }

    // 2. NORMAL HAMLE MODU
    const piece = layout[i];

    if (selectedSquare === null) {
        // Taş Seçme
        if (piece && piece.startsWith(turn)) {
            selectedSquare = i;
            draw();
        }
    } else {
        // Taş Taşıma
        const legalMoves = getRawMoves(selectedSquare);
        if (legalMoves.includes(i)) {
            executeMove(selectedSquare, i);
            selectedSquare = null;
            completeTurn();
        } else {
            // Başka kendi taşına tıkladıysa seçimi değiştir
            if (piece && piece.startsWith(turn)) {
                selectedSquare = i;
                draw();
            } else {
                selectedSquare = null;
                draw();
            }
        }
    }
}

function executeMove(from, to) {
    layout[to] = layout[from];
    layout[from] = '';
}

function completeTurn() {
    turn = (turn === 'w' ? 'b' : 'w');
    draw();
    updateStatus();

    // SIRA DEĞİŞTİ: Yeni oyuncu için ihanet fırsatı var mı?
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
        // Rakibin kalesi, atı veya fili mi?
        if (p && p.startsWith(oppColor) && ['n', 'r', 'b'].includes(p[2])) {
            // Ben istiyor muyum ve o korumuyor mu?
            if (isSquareAttacked(i, myColor) && !isSquareAttacked(i, oppColor)) return i;
        }
    }
    return null;
}

function askForBetrayal(targetIndex) {
    const name = (turn === 'w' ? 'BEYAZ' : 'SİYAH');
    if (confirm(`${name}! Rakibin bir taşını korumasız bıraktı. \n\nKendi hamlen yerine bu taşla İHANET hamlesi yapmak ister misin?`)) {
        const p = layout[targetIndex];
        layout[targetIndex] = turn + p.substring(1); // Rengini geçici olarak değiştir
        isBetrayalMoveMode = true;
        betrayalTarget = targetIndex;
        draw();
        updateStatus();
    }
}

// --- 5. GÖRSELLEŞTİRME ---
function draw() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.className = `square ${(Math.floor(i/8)+(i%8))%2!==0?'black':'white'}`;
        
        // Seçili kareyi vurgula
        if (selectedSquare === i) square.classList.add('active-law');
        // İhanet hedefini vurgula
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
    if (isBetrayalMoveMode) {
        statusElement.innerText = "⚠️ İHANET MODU: Hain taşı hareket ettir!";
        statusElement.style.color = "red";
    } else {
        statusElement.innerText = "SIRA: " + (turn === 'w' ? "BEYAZDA" : "SİYAHTA");
        statusElement.style.color = "black";
    }
}

initGame();
