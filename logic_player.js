// --- 1. DEĞİŞKENLER VE DURUM ---

let layout = Array(64).fill('');

let turn = 'w';

let selectedSquare = null;

let enPassantTarget = null; // Geçerken alış karesi

let hasMoved = { 'w-k': false, 'b-k': false, 'w-r-56': false, 'w-r-63': false, 'b-r-0': false, 'b-r-7': false };
let isBetrayalMoveMode = false; // İhanet hamlesi mi yapılıyor?
let betrayalTarget = null;     // İhanet eden taş hangisi?


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

    Object.keys(initialSetup).forEach(i => layout[i] = initialSetup[i]);

    draw();

    updateStatus();

}



// --- 3. HAREKET KONTROLLERİ (HAKEM) ---

function getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; }

function getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; }



function findKing(color) {

    for (let i = 0; i < 64; i++) if (layout[i] === color + '-k') return i;

    return -1;

}



// Bir kareye belirli bir renk saldırıyor mu?

function isSquareAttacked(targetIndex, attackerColor) {

    for (let i = 0; i < 64; i++) {

        if (layout[i] && layout[i].startsWith(attackerColor)) {

            const moves = getRawMoves(i); // Şah kontrolü yapmayan hamle listesi

            if (moves.includes(targetIndex)) return true;

        }

    }

    return false;

}



// Şahın güvenliğini test eden simülasyon

function testMoveForSafety(from, to, color) {

    const originalFrom = layout[from];

    const originalTo = layout[to];

    

    // Geçici hamle yap

    layout[to] = originalFrom;

    layout[from] = '';

    

    const kingPos = findKing(color);

    const opponent = color === 'w' ? 'b' : 'w';

    const safe = !isSquareAttacked(kingPos, opponent);

    

    // Geri al

    layout[from] = originalFrom;

    layout[to] = originalTo;

    return safe;

}



// Sadece yasal (Şahı tehlikeye atmayan) hamleleri getir

function getLegalMoves(i) {

    const rawMoves = getRawMoves(i);

    const color = layout[i][0];

    return rawMoves.filter(move => testMoveForSafety(i, move, color));

}



// Taşların temel gidiş kuralları

function getRawMoves(i) {

    const piece = layout[i];

    const color = piece[0];

    const type = piece[2];

    const { r, c } = getCoords(i);

    let moves = [];



    // --- KALE & VEZİR ---

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

    // --- FİL & VEZİR ---

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

    // --- AT ---

    if (type === 'n') {

        [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(d => {

            const target = getIndex(r+d[0], c+d[1]);

            if (target !== null && (!layout[target] || layout[target][0] !== color)) moves.push(target);

        });

    }

    // --- ŞAH ---

    if (type === 'k') {

        [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d => {

            const target = getIndex(r+d[0], c+d[1]);

            if (target !== null && (!layout[target] || layout[target][0] !== color)) moves.push(target);

        });

        // ROK (Sadece raw move olarak ekle, legalMoves'da isSquareAttacked ile elenecek)

        if (!hasMoved[color+'-k']) {

            if (!hasMoved[color+'-r-'+getIndex(r,7)] && !layout[getIndex(r,5)] && !layout[getIndex(r,6)]) moves.push(getIndex(r,6));

            if (!hasMoved[color+'-r-'+getIndex(r,0)] && !layout[getIndex(r,1)] && !layout[getIndex(r,2)] && !layout[getIndex(r,3)]) moves.push(getIndex(r,2));

        }

    }

    // --- PİYON ---

    if (type === 'p') {

        const dir = color === 'w' ? -1 : 1;

        const start = color === 'w' ? 6 : 1;

        const forward = getIndex(r+dir, c);

        if (forward !== null && !layout[forward]) {

            moves.push(forward);

            const double = getIndex(r+2*dir, c);

            if (r === start && !layout[double]) moves.push(double);

        }

        [getIndex(r+dir, c-1), getIndex(r+dir, c+1)].forEach(diag => {

            if (diag !== null && ((layout[diag] && layout[diag][0] !== color) || diag === enPassantTarget)) {

                if (Math.abs((diag%8) - c) === 1) moves.push(diag);

            }

        });

    }

    return moves;

}



// --- 4. OYUN DÖNGÜSÜ ---

function handleSquareClick(i) {

    const piece = layout[i];

    if (selectedSquare === null) {

        if (piece && piece.startsWith(turn)) { selectedSquare = i; draw(); }

    } else {

        const legalMoves = getLegalMoves(selectedSquare);

        if (legalMoves.includes(i)) {

            executeMove(selectedSquare, i);

            selectedSquare = null;

          const potentialBetrayal = checkBetrayalOpportunity();
    if (potentialBetrayal !== null) {
        handleBetrayal(potentialBetrayal);
    } else {
        completeTurn();
    }
        draw();

        updateStatus();

    }

}



function executeMove(from, to) {

    const piece = layout[from];

    const type = piece[2];

    

    // Geçerken Alış (Taşı silme)

    if (type === 'p' && to === enPassantTarget) {

        const enemyPawn = getIndex(Math.floor(from/8), to%8);

        layout[enemyPawn] = '';

    }

    

    // Rok (Kaleyi taşıma)

    if (type === 'k' && Math.abs((from%8) - (to%8)) === 2) {

        const rookFrom = (to%8 === 6) ? getIndex(Math.floor(to/8), 7) : getIndex(Math.floor(to/8), 0);

        const rookTo = (to%8 === 6) ? getIndex(Math.floor(to/8), 5) : getIndex(Math.floor(to/8), 3);

        layout[rookTo] = layout[rookFrom];

        layout[rookFrom] = '';

    }



    // Hareket kaydı

    if (type === 'k') hasMoved[piece] = true;

    if (type === 'r') hasMoved[piece + '-' + from] = true;

    

    // En Passant Hedefi Belirle

    enPassantTarget = (type === 'p' && Math.abs(Math.floor(from/8) - Math.floor(to/8)) === 2) 

                      ? getIndex((Math.floor(from/8) + Math.floor(to/8)) / 2, from%8) : null;



    layout[to] = layout[from];

    layout[from] = '';

}



function isCheckmate(color) {

    const opponent = color === 'w' ? 'b' : 'w';

    const kingPos = findKing(color);

    if (!isSquareAttacked(kingPos, opponent)) return false; // Şah yoksa mat yok



    for (let i = 0; i < 64; i++) {

        if (layout[i] && layout[i].startsWith(color)) {

            if (getLegalMoves(i).length > 0) return false; // Kurtuluş hamlesi var

        }

    }

    return true;

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

    statusElement.innerText = "SIRA: " + (turn === 'w' ? "BEYAZDA" : "SİYAHTA");

}

// --- İHANET TESPİT FONKSİYONU ---
function checkBetrayalOpportunity() {
    const opponentColor = turn === 'w' ? 'b' : 'w';
    const kingPos = findKing(turn);

    // KURAL: Eğer Şah çekilmişse ihanet gerçekleşmez. (Önce Şah kurtarılmalı)
    if (isSquareAttacked(kingPos, opponentColor)) return null;

    for (let i = 0; i < 64; i++) {
        const piece = layout[i];
        
        // Sadece sırası gelen oyuncunun At (n), Fil (b) ve Kalesine (r) bakıyoruz.
        // (Şah ve Piyonlar kuralların gereği ihanet etmezler)
        if (piece && piece.startsWith(turn) && ['n', 'b', 'r'].includes(piece[2])) {
            
            const isTargeted = isSquareAttacked(i, opponentColor); // Rakip istiyor mu?
            const isProtected = isSquareAttacked(i, turn);         // Kendi rengi koruyor mu?

            if (isTargeted && !isProtected) {
                return i; // Korunmasız taşın konumunu bulduk!
            }
        }
    }
    return null;
}
function handleBetrayal(targetIndex) {
    const pType = layout[targetIndex][2];
    const name = pType === 'r' ? 'Kale' : pType === 'n' ? 'At' : 'Fil';
    
    const choice = confirm(`${name} korunmasız kaldı! \n\nTAMAM: İhanet etsin (Rakip adına hamle yapar). \nİPTAL: Feda edilsin (Tahta dışına çıkar).`);
    
    if (choice) {
        // İHANET: Taşın rengini hemen değiştiriyoruz
        const oldPiece = layout[targetIndex];
        const newColor = oldPiece[0] === 'w' ? 'b' : 'w';
        layout[targetIndex] = newColor + oldPiece.substring(1);
        
        isBetrayalMoveMode = true;
        betrayalTarget = targetIndex;
        alert("İHANET! Şimdi bu taşı rakip adına bir kez hareket ettir.");
    } else {
        // FEDA: Taş sessizce tahtadan kalkar
        layout[targetIndex] = '';
        completeTurn(); // Sıra rakibe geçer
    }
    draw();
}

function handleBetrayal(targetIndex) {
    const pType = layout[targetIndex][2];
    const name = pType === 'r' ? 'Kale' : pType === 'n' ? 'At' : 'Fil';
    
    const choice = confirm(`${name} korunmasız kaldı! \n\nTAMAM: İhanet etsin (Rakip adına hamle yapar). \nİPTAL: Feda edilsin (Tahta dışına çıkar).`);
    
    if (choice) {
        // İHANET: Taşın rengini hemen değiştiriyoruz
        const oldPiece = layout[targetIndex];
        const newColor = oldPiece[0] === 'w' ? 'b' : 'w';
        layout[targetIndex] = newColor + oldPiece.substring(1);
        
        isBetrayalMoveMode = true;
        betrayalTarget = targetIndex;
        alert("İHANET! Şimdi bu taşı rakip adına bir kez hareket ettir.");
    } else {
        // FEDA: Taş sessizce tahtadan kalkar
        layout[targetIndex] = '';
        completeTurn(); // Sıra rakibe geçer
    }
    draw();
}

function handleBetrayal(targetIndex) {
    const pType = layout[targetIndex][2];
    const name = pType === 'r' ? 'Kale' : pType === 'n' ? 'At' : 'Fil';
    
    const choice = confirm(`${name} korunmasız kaldı! \n\nTAMAM: İhanet etsin (Rakip adına hamle yapar). \nİPTAL: Feda edilsin (Tahta dışına çıkar).`);
    
    if (choice) {
        // İHANET: Taşın rengini hemen değiştiriyoruz
        const oldPiece = layout[targetIndex];
        const newColor = oldPiece[0] === 'w' ? 'b' : 'w';
        layout[targetIndex] = newColor + oldPiece.substring(1);
        
        isBetrayalMoveMode = true;
        betrayalTarget = targetIndex;
        alert("İHANET! Şimdi bu taşı rakip adına bir kez hareket ettir.");
    } else {
        // FEDA: Taş sessizce tahtadan kalkar
        layout[targetIndex] = '';
        completeTurn(); // Sıra rakibe geçer
    }
    draw();
}

// Bu yardımcı fonksiyonu da ekleyelim, turn değişimini temiz yapar
function completeTurn() {
    isBetrayalMoveMode = false;
    betrayalTarget = null;
    turn = turn === 'w' ? 'b' : 'w';
    updateStatus();
    draw();
}
initGame(); 
