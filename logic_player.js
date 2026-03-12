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

function isSquareAttacked(targetIndex, attackerColor) {
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            // İhanet eden taş Şah'a saldıramaz
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

function getLegalMoves(i) {
    const color = layout[i][0];
    return getRawMoves(i).filter(move => {
        const originalFrom = layout[i], originalTo = layout[move];
        layout[move] = originalFrom; layout[i] = '';
        const kingPos = findKing(color);
        const safe = !isSquareAttacked(kingPos, color === 'w' ? 'b' : 'w');
        layout[i] = originalFrom; layout[move] = originalTo;
        return safe;
    });
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
    }
    if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        const forward = getIndex(r+dir, c);
        if (forward !== null && !layout[forward]) {
            moves.push(forward);
            if (r === (color === 'w' ? 6 : 1) && !layout[getIndex(r+2*dir, c)]) moves.push(getIndex(r+2*dir, c));
        }
        [getIndex(r+dir, c-1), getIndex(r+dir, c+1)].forEach(diag => {
            if (diag !== null) moves.push(diag); // Koruma kontrolü için çaprazlar hep aktif
        });
    }
    return moves;
}

// --- 4. OYUN DÖNGÜSÜ (YENİLENMİŞ AKIŞ) ---
function handleSquareClick(i) {
    if (isBetrayalMoveMode) {
        if (getLegalMoves(betrayalTarget).includes(i)) {
            executeMove(betrayalTarget, i);
            layout[i] = ''; // Görev tamamlandı, silinir
            completeTurn();
        } else {
            alert("Sadece ihanet eden taşı hareket ettirebilirsin!");
        }
        return;
    }

    const piece = layout[i];
    if (selectedSquare === null) {
        if (piece && piece.startsWith(turn)) { selectedSquare = i; draw(); }
    } else {
        const moves = getLegalMoves(selectedSquare);
        if (moves.includes(i)) {
            const lastMovedSquare = i; // Hamle yapılan yer
            executeMove(selectedSquare, i);
            selectedSquare = null;
            draw();

            // KURAL: Oyuncu hamlesini bitirdi. 
            // Şimdi, hamle yapmadan ÖNCE tehdit altında olan ve korunmayan taş kaldı mı bakıyoruz.
            setTimeout(() => {
                const betrayedIndex = checkBetrayalStatus(lastMovedSquare);
                if (betrayedIndex !== null) {
                    initiateBetrayal(betrayedIndex);
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

// KURAL: Hamle sonrası sahayı tara. Korunmayan ve tehdit altındaki taş "İhanet" eder.
function checkBetrayalStatus(lastMovedIndex) {
    const oppColor = turn === 'w' ? 'b' : 'w';
    
    for (let i = 0; i < 64; i++) {
        const p = layout[i];
        // Sadece sırası geçen oyuncunun (turn) at, kale, filine bakıyoruz.
        // Ama hamle yapılan taşı (lastMovedIndex) hariç tutuyoruz (kaçmış sayılır).
        if (p && p.startsWith(turn) && ['n', 'r', 'b'].includes(p[2]) && i !== lastMovedIndex) {
            const isTargeted = isSquareAttacked(i, oppColor);
            const isProtected = isSquareAttacked(i, turn);
            
            if (isTargeted && !isProtected) return i;
        }
    }
    return null;
}

function initiateBetrayal(targetIndex) {
    const p = layout[targetIndex];
    const name = p[2] === 'r' ? 'Kale' : p[2] === 'n' ? 'At' : 'Fil';
    const oppName = turn === 'w' ? 'SİYAH' : 'BEYAZ';

    if (confirm(`İHANET! ${name} korunmadı! \n\n${oppName}, bu taşı kendi hamlen olarak kullanmak ister misin? \n(İptal dersen taş oyundan silinir)`)) {
        // Taşın rengini geçici olarak değiştir
        layout[targetIndex] = (p[0] === 'w' ? 'b' : 'w') + p.substring(1);
        isBetrayalMoveMode = true;
        betrayalTarget = targetIndex;
        draw();
        updateStatus();
    } else {
        layout[targetIndex] = '';
        completeTurn();
    }
}

function executeMove(from, to) {
    const piece = layout[from], type = piece[2];
    if (type === 'p' && to === enPassantTarget) layout[getIndex(Math.floor(from/8), to%8)] = '';
    // Basit taş değişimi
    layout[to] = layout[from];
    layout[from] = '';
    // Şah ve Kale hareket kayıtları (Rok için gerekebilir)
    if (type === 'k') hasMoved[piece[0]+'-k'] = true;
    if (type === 'r') hasMoved[piece[0]+'-r-'+from] = true;
    enPassantTarget = (type === 'p' && Math.abs(Math.floor(from/8)-Math.floor(to/8)) === 2) ? getIndex((Math.floor(from/8)+Math.floor(to/8))/2, from%8) : null;
}

function completeTurn() {
    isBetrayalMoveMode = false;
    betrayalTarget = null;
    turn = turn === 'w' ? 'b' : 'w';
    draw();
    updateStatus();
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
