// --- 1. DEĞİŞKENLER VE DURUM ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let enPassantTarget = null;
let hasMoved = {}; 
let gameLog = [];

let isBetrayalMoveMode = false;
let betrayalTarget = null;
let threatsFromLastTurn = [];

const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');
const logElement = document.getElementById('move-history');

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
    isBetrayalMoveMode = false;
    betrayalTarget = null;
    threatsFromLastTurn = [];
    gameLog = [];
    turn = 'w';
    if (logElement) logElement.innerHTML = '';
    draw();
    updateStatus();
}

// --- 3. YARDIMCI VE ANALİZ FONKSİYONLARI ---
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

// LOG SİSTEMİ
function addToLog(from, to, symbol = "") {
    const moveText = `${getCoordsLabel(from)}-${getCoordsLabel(to)}`;
    let statusClass = "";
    if (symbol === "!") statusClass = "threat-mark";
    if (symbol === "†") statusClass = "ready-mark";
    if (symbol === "☠") statusClass = "betrayal-mark";

    gameLog.push({ move: moveText, symbol: symbol });
    
    if (logElement) {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<span>${moveText}</span> <span class="${statusClass}">${symbol}</span>`;
        logElement.prepend(div);
    }
}

// --- 4. HAKEM MANTIĞI (ORİJİNAL KURALLAR) ---
function testMoveForSafety(from, to, color) {
    const originalFrom = layout[from], originalTo = layout[to];
    layout[to] = originalFrom; layout[from] = '';
    const kingPos = findKing(color);
    const safe = kingPos === -1 ? true : !isSquareAttacked(kingPos, color === 'w' ? 'b' : 'w');
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

// --- 5. OYUN DÖNGÜSÜ VE İHANET MANTIĞI ---
function handleSquareClick(i) {
    if (isBetrayalMoveMode) {
        if (getRawMoves(betrayalTarget).includes(i)) {
            addToLog(betrayalTarget, i, "☠");
            layout[i] = ''; layout[betrayalTarget] = ''; 
            isBetrayalMoveMode = false; betrayalTarget = null;
            completeTurn();
        }
        return;
    }
    if (selectedSquare === null) {
        if (layout[i] && layout[i].startsWith(turn)) { selectedSquare = i; draw(); }
    } else {
        const legalMoves = getLegalMoves(selectedSquare);
        if (legalMoves.includes(i)) {
            executeMove(selectedSquare, i);
            addToLog(selectedSquare, i, ""); 
            selectedSquare = null;
            completeTurn();
        } else {
            selectedSquare = (layout[i] && layout[i].startsWith(turn)) ? i : null;
            draw();
        }
    }
}

function executeMove(from, to) {
    const piece = layout[from], type = piece[2], color = piece[0];
    if (type === 'p' && to === enPassantTarget) layout[getIndex(Math.floor(from/8), to % 8)] = '';
    if (type === 'k' && Math.abs((from % 8) - (to % 8)) === 2) {
        const rFrom = (to % 8 === 6) ? getIndex(Math.floor(to/8), 7) : getIndex(Math.floor(to/8), 0);
        const rTo = (to % 8 === 6) ? getIndex(Math.floor(to/8), 5) : getIndex(Math.floor(to/8), 3);
        layout[rTo] = layout[rFrom]; layout[rFrom] = '';
    }
    if (type === 'k') hasMoved[color + '-k'] = true;
    if (type === 'r') hasMoved[color + '-r-' + from] = true;
    enPassantTarget = (type === 'p' && Math.abs(Math.floor(from/8) - Math.floor(to/8)) === 2) ? getIndex((Math.floor(from/8) + Math.floor(to/8)) / 2, from % 8) : null;
    layout[to] = layout[from]; layout[from] = '';
    if (type === 'p' && (Math.floor(to/8) === 0 || Math.floor(to/8) === 7)) {
        let choice = prompt("Piyon Terfisi (q, r, b, n):", "q") || "q";
        layout[to] = color + '-' + (['q','r','b','n'].includes(choice.toLowerCase()) ? choice.toLowerCase() : 'q');
    }
}

function completeTurn() {
    const lastPlayer = turn;
    const nextPlayer = (turn === 'w' ? 'b' : 'w');
    
    // 1. Mevcut saldırıları topla
    let currentAttacks = [];
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(lastPlayer)) {
            getRawMoves(i, true).forEach(m => { if(!currentAttacks.includes(m)) currentAttacks.push(m); });
        }
    }

    // 2. İhanet Adayını Belirle
    let betrayalCandidate = null;
    for (let targetIndex of threatsFromLastTurn) {
        const piece = layout[targetIndex];
        if (piece && piece.startsWith(nextPlayer) && ['n', 'r', 'b'].includes(piece[2])) {
            if (currentAttacks.includes(targetIndex) && !isSquareAttacked(targetIndex, nextPlayer)) {
                betrayalCandidate = targetIndex;
                break;
            }
        }
    }

    // 3. Log Sembol Güncelleme
    if (gameLog.length > 0 && !isBetrayalMoveMode) {
        const lastEntry = gameLog[gameLog.length-1];
        const logDiv = logElement.firstChild;
        if (betrayalCandidate !== null) {
            lastEntry.symbol = "†";
            if (logDiv) { logDiv.lastChild.innerText = "†"; logDiv.lastChild.className = "ready-mark"; }
        } else if (currentAttacks.some(idx => layout[idx] && layout[idx].startsWith(nextPlayer) && ['n','r','b'].includes(layout[idx][2]))) {
            lastEntry.symbol = "!";
            if (logDiv) { logDiv.lastChild.innerText = "!"; logDiv.lastChild.className = "threat-mark"; }
        }
    }

    // 4. Durum Güncellemesi
    turn = nextPlayer;
    threatsFromLastTurn = currentAttacks;
    draw();
    updateStatus();

    // 5. Şah Mat Kontrolü
    if (isCheckmate(turn)) setTimeout(() => alert("ŞAH MAT!"), 300);

    // 6. İhanet Tetikleme (Popup)
    if (betrayalCandidate !== null) {
        betrayalTarget = betrayalCandidate;
        if (typeof showPop === "function") {
            showPop(
                "LAW 2: THE CHOICE", 
                "Bir subay saf değiştirmeye hazır! Onu kontrol edip son bir hamle yaptırmak ister misin?", 
                "İhanet eden taş Şah çekemez. Hamleden sonra oyundan çıkar.", 
                "#ff6600"
            );
        } else {
            if (confirm("LoyaltyChess: Bu subay ihanet etmeye hazır!")) {
                startBetrayal();
            }
        }
    }
}

function startBetrayal() {
    if (betrayalTarget !== null) {
        layout[betrayalTarget] = turn + layout[betrayalTarget].substring(1);
        isBetrayalMoveMode = true;
        if (typeof closePopup === "function") closePopup();
        draw();
        updateStatus();
    }
}

function isCheckmate(color) {
    const kingPos = findKing(color);
    if (kingPos === -1) return false;
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
        if (isBetrayalMoveMode && betrayalTarget === i) square.style.boxShadow = "inset 0 0 20px #ff3333";
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
    statusElement.innerText = isBetrayalMoveMode ? "⚠️ İHANET HAMLESİ" : "SIRA: " + (turn === 'w' ? "BEYAZ" : "SİYAH");
}

initGame();
