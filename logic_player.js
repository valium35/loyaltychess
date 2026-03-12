// --- 1. DEĞİŞKENLER ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let isBetrayalMoveMode = false;
let betrayalTarget = null;

// KRİTİK DEĞİŞKEN: Bir önceki oyuncunun tehdit ettiği karelerin listesi
let lastTurnThreats = []; 

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
    lastTurnThreats = [];
    draw();
    updateStatus();
}

// --- 3. HAREKET VE TEHDİT ANALİZİ ---
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
        if (f1 !== null && !layout[f1]) moves.push(f1);
        [getIndex(r + dir, c - 1), getIndex(r + dir, c + 1)].forEach(diag => {
            if (diag !== null) moves.push(diag); // Tehdit analizi için piyon çaprazları hep listede olmalı
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

// --- 4. OYUN AKIŞI ---
function handleSquareClick(i) {
    if (isBetrayalMoveMode) {
        if (getRawMoves(betrayalTarget).includes(i)) {
            layout[betrayalTarget] = ''; // Eski yer
            layout[i] = ''; // İhanet eden taş görevini yaptı ve silindi
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
            // Hamleyi yapmadan önce, bu hamlenin tehdit ettiği rakip taşları bul
            const currentTurnThreats = getAttackedPieces(turn, selectedSquare, i);
            
            executeMove(selectedSquare, i);
            selectedSquare = null;
            
            // Sıra değişmeden önce bu turun tehditlerini bir sonraki tur için kaydet
            completeTurn(currentTurnThreats);
        } else {
            selectedSquare = (piece && piece.startsWith(turn)) ? i : null;
            draw();
        }
    }
}

// Sadece son yapılan hamleyle (from->to) tehdit edilen rakip taşları bulur
function getAttackedPieces(attackerColor, from, to) {
    const threats = [];
    const oppColor = attackerColor === 'w' ? 'b' : 'w';
    
    // Geçici olarak tahtayı hamle yapılmış gibi simüle et
    const originalFrom = layout[from], originalTo = layout[to];
    layout[to] = originalFrom; layout[from] = '';
    
    // Sadece hamle yapan taşın yeni yerinden nereleri tehdit ettiğine bak
    const moves = getRawMoves(to);
    moves.forEach(m => {
        if (layout[m] && layout[m].startsWith(oppColor)) threats.push(m);
    });
    
    // Tahtayı eski haline getir
    layout[from] = originalFrom; layout[to] = originalTo;
    return threats;
}

function executeMove(from, to) {
    layout[to] = layout[from];
    layout[from] = '';
}

function completeTurn(newThreats = []) {
    const previousPlayer = turn;
    turn = (turn === 'w' ? 'b' : 'w');
    draw();
    updateStatus();

    // ŞİMDİ: Sırası gelen oyuncu için ihanet kontrolü
    // Koşul: Bir önceki turda bu oyuncu tarafından tehdit edilen taş hala korunmuyor mu?
    setTimeout(() => {
        let betrayalIndex = null;
        for (let targetIndex of lastTurnThreats) {
            // Taş hala orada mı? (Yenmemiş veya kaçmamış olması lazım)
            if (layout[targetIndex] && layout[targetIndex].startsWith(turn)) {
                // Hala tehdit altında mı VE artık korunmuyor mu?
                if (isSquareAttacked(targetIndex, previousPlayer) && !isSquareAttacked(targetIndex, turn)) {
                    betrayalIndex = targetIndex;
                    break; 
                }
            }
        }

        // Bir sonraki tur için tehdit listesini güncelle
        lastTurnThreats = newThreats;

        if (betrayalIndex !== null) {
            askForBetrayal(betrayalIndex);
        }
    }, 100);
}

function askForBetrayal(targetIndex) {
    const name = (turn === 'w' ? 'BEYAZ' : 'SİYAH');
    if (confirm(`${name}! Rakibin tehdit ettiğin taşı korumadı. \n\nİhanet hamlesi yapmak ister misin?`)) {
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
