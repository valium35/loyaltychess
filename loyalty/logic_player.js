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
    gameLog = [];
    moveCount = 1;
    turn = 'w';
    if (logElement) logElement.innerHTML = '';
    draw();
    updateStatus();
}

// --- 3. YARDIMCI VE ANALİZ ---
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

function addToLog(from, to) {
    const moveText = `${getCoordsLabel(from)}-${getCoordsLabel(to)}`;
    if (turn === 'w') {
        gameLog.push({ index: moveCount, white: moveText, black: "" });
        if (logElement) {
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.id = `move-pair-${moveCount}`;
            div.innerHTML = `<span class="move-num">${moveCount}.</span> <span class="white-move">${moveText}</span> <span class="black-move">...</span>`;
            logElement.prepend(div);
        }
    } else {
        if (gameLog.length > 0) {
            gameLog[gameLog.length - 1].black = moveText;
            const lastDiv = document.getElementById(`move-pair-${moveCount}`);
            if (lastDiv) lastDiv.querySelector('.black-move').innerText = moveText;
            moveCount++;
        }
    }
}

// --- 4. HAREKET MANTIĞI ---
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
    
    // Eğer bu bir ihanet hamlesiyse şah çekememe kontrolünü engine'den yap
    if (LoyaltyEngine.isBetrayalMode) {
        return getRawMoves(i).filter(move => LoyaltyEngine.canBetrayerMoveHere(layout, i, move, turn));
    }
    
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

// --- 5. OYUN AKIŞI ---
function handleSquareClick(i) {
    if (selectedSquare === null) {
        // NORMAL: Kendi taşınsa seç
        if (layout[i] && layout[i].startsWith(turn)) {
            selectedSquare = i;
            LoyaltyEngine.isBetrayalMode = false;
            draw();
        } 
        // İHANET: Rakip taş ama "Hain Listesi"ndeyse seç!
        else if (layout[i] && LoyaltyEngine.threatenedList.includes(i)) {
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
            // Hamle bitince tahtayı tara
            LoyaltyEngine.scanBoard(layout, (turn === 'w' ? 'b' : 'w'));
            turn = (turn === 'w' ? 'b' : 'w'); 
            
            draw();
            updateStatus();
            checkGameEnd();
        } else {
            selectedSquare = (layout[i] && layout[i].startsWith(turn)) ? i : null;
            LoyaltyEngine.isBetrayalMode = false;
            draw();
        }
    }
}

function executeMove(from, to) {
    const piece = layout[from], type = piece[2], color = piece[0];
    
    if (type === 'p' && to === enPassantTarget) {
        layout[getIndex(Math.floor(from/8), to % 8)] = '';
    }
    
    if (type === 'k' && Math.abs((from % 8) - (to % 8)) === 2) {
        const rFrom = (to % 8 === 6) ? getIndex(Math.floor(to/8), 7) : getIndex(Math.floor(to/8), 0);
        const rTo = (to % 8 === 6) ? getIndex(Math.floor(to/8), 5) : getIndex(Math.floor(to/8), 3);
        layout[rTo] = layout[rFrom]; layout[rFrom] = '';
    }

    if (type === 'k') hasMoved[color + '-k'] = true;
    if (type === 'r') hasMoved[color + '-r-' + from] = true;

    enPassantTarget = (type === 'p' && Math.abs(Math.floor(from/8) - Math.floor(to/8)) === 2) ? 
                      getIndex((Math.floor(from/8) + Math.floor(to/8)) / 2, from % 8) : null;

    layout[to] = layout[from];
    layout[from] = '';

    // Terfi kontrolü
    if (type === 'p' && (Math.floor(to/8) === 0 || Math.floor(to/8) === 7)) {
        let choice = prompt("Piyon Terfisi (q, r, b, n):", "q") || "q";
        layout[to] = color + '-' + (['q','r','b','n'].includes(choice.toLowerCase()) ? choice.toLowerCase() : 'q');
    }

    // İHANET SONRASI VEDA
    if (LoyaltyEngine.isBetrayalMode) {
        setTimeout(() => {
            LoyaltyEngine.executeFinalMission(layout, to);
            draw();
        }, 300);
    }
}

function checkGameEnd() {
    const kingPos = findKing(turn);
    const opponent = turn === 'w' ? 'b' : 'w';
    const isUnderAttack = isSquareAttacked(kingPos, opponent);
    let hasAnyMove = false;
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(turn)) {
            if (getLegalMoves(i).length > 0) {
                hasAnyMove = true;
                break;
            }
        }
    }
    if (!hasAnyMove) {
        const lang = localStorage.getItem('gameLang') || 'tr';
        const winner = (turn === 'w' ? (lang === 'en' ? "BLACK" : "SİYAH") : (lang === 'en' ? "WHITE" : "BEYAZ"));
        alert(isUnderAttack ? winner + " KAZANDI!" : "BERABERE!");
    }
}

function draw() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const isBlack = (Math.floor(i / 8) + (i % 8)) % 2 !== 0;
        square.className = `square ${isBlack ? 'black' : 'white'} ${selectedSquare === i ? 'active' : ''}`;
        
        // Hain adayı ise görsel uyarı (isteğe bağlı)
        if (LoyaltyEngine.threatenedList.includes(i)) {
            square.style.boxShadow = "inset 0 0 10px rgba(231, 76, 60, 0.8)";
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
    const kingPos = findKing(turn);
    const opponent = turn === 'w' ? 'b' : 'w';
    const isCheck = isSquareAttacked(kingPos, opponent);
    let label = (turn === 'w' ? t.status : t.statusBlack);
    if (isCheck) label += t.statusCheck;
    statusElement.innerText = label;
}

window.onload = initGame;
