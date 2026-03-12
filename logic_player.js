// --- 1. DEĞİŞKENLER VE DURUM ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let enPassantTarget = null;
let hasMoved = { 'w-k': false, 'b-k': false }; // Dinamik anahtarlar aşağıda eklenecek

// İhanet Mekaniği Değişkenleri
let isBetrayalMoveMode = false;
let betrayalTarget = null;
let threatsFromLastTurn = [];

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
    // Rok takibi için kale konumlarını sıfırla
    hasMoved = { 'w-k': false, 'b-k': false, 'w-r-56': false, 'w-r-63': false, 'b-r-0': false, 'b-r-7': false };
    draw();
    updateStatus();
}

// --- 3. HAKEM MANTIĞI ---
function getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; }
function getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; }

function findKing(color) {
    for (let i = 0; i < 64; i++) if (layout[i] === color + '-k') return i;
    return -1;
}

function isSquareAttacked(targetIndex, attackerColor) {
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            // Tehdit kontrolünde piyonların sadece çaprazlarına bakmak için true gönderiyoruz
            if (getRawMoves(i, true).includes(targetIndex)) return true;
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
    const safe = !isSquareAttacked(kingPos, color === 'w' ? 'b' : 'w');
    layout[from] = originalFrom;
    layout[to] = originalTo;
    return safe;
}

function getLegalMoves(i) {
    const piece = layout[i];
    if (!piece) return [];
    const rawMoves = getRawMoves(i);
    const color = piece[0];
    return rawMoves.filter(move => testMoveForSafety(i, move, color));
}

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
                else { if (onlyAttacks || layout[target][0] !== color) moves.push(target); break; }
            }
        });
    } else if (type === 'n' || type === 'k') {
        directions[type].forEach(d => {
            const target = getIndex(r + d[0], c + d[1]);
            if (target !== null && (onlyAttacks || !layout[target] || layout[target][0] !== color)) moves.push(target);
        });
        
        // ROK KONTROLÜ (Düzeltildi)
        if (type === 'k' && !onlyAttacks && !hasMoved[color+'-k'] && !isSquareAttacked(i, color==='w'?'b':'w')) {
            const r7 = getIndex(r, 7), r0 = getIndex(r, 0);
            // Kısa Rok
            if (!hasMoved[color+'-r-'+r7] && !layout[getIndex(r,5)] && !layout[getIndex(r,6)] && !isSquareAttacked(getIndex(r,5), color==='w'?'b':'w')) moves.push(getIndex(r,6));
            // Uzun Rok
            if (!has
