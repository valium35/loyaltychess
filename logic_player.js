// --- 1. DEĞİŞKENLER VE HAFIZA SİSTEMİ ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let enPassantTarget = null;
let hasMoved = {}; 

// İhanet Hafıza Ünitesi (Registry)
let gameLog = []; 
let isBetrayalMoveMode = false;
let betrayalTarget = null;

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
    hasMoved = { 'w-k': false, 'b-k': false };
    gameLog = [];
    isBetrayalMoveMode = false;
    betrayalTarget = null;
    turn = 'w';
    draw();
    updateStatus();
    logElement.innerHTML = '<div class="log-placeholder">Oyun başladı...</div>';
}

// --- 3. ANALİZ VE KAYIT MOTORU (REGISTRY) ---

function getCoordsLabel(i) {
    const cols = 'abcdefgh';
    const rows = '87654321';
    return cols[i % 8] + rows[Math.floor(i / 8)];
}

function analyzeAndLog(from, to, piece, isBetrayal = false) {
    let symbol = "";
    let statusClass = "";
    const lastPlayer = piece[0];
    const opponent = lastPlayer === 'w' ? 'b' : 'w';

    if (isBetrayal) {
        symbol = "☠";
        statusClass = "symbol-betrayal";
    } else {
        // Hamle sonrası rakip subaylara (n, r, b) tehdit analizi
        let activeThreats = [];
        for (let i = 0; i < 64; i++) {
            if (layout[i] && layout[i].startsWith(lastPlayer)) {
                let targets = getRawMoves(i, true);
                targets.forEach(t => {
                    let targetPiece = layout[t];
                    if (targetPiece && targetPiece.startsWith(opponent) && ['n', 'r', 'b'].includes(targetPiece[2])) {
                        // Korumasız mı?
                        if (!isSquareAttacked(t, opponent)) {
                            activeThreats.push(t);
                        }
                    }
                });
            }
        }

        if (activeThreats.length > 0) {
            symbol = "!"; // İlk tehdit oluştu
            statusClass = "symbol-threat";
            
            // Eğer bu taş bir önceki turda zaten ! almışsa, şimdi † (Ready) olmalı
            const lastEntry = gameLog[gameLog.length - 1];
            if (lastEntry && lastEntry.threats && lastEntry.threats.some(t => activeThreats.includes(t))) {
                symbol = "†";
                statusClass = "symbol-ready";
            }
        }
    }

    const moveText = `${getCoordsLabel(from)}-${getCoordsLabel(to)}`;
    const logEntry = {
        move: moveText,
        symbol: symbol,
        threats: [], // Bu turda oluşan tehditlerin indexleri buraya
        player: lastPlayer
    };

    gameLog.push(logEntry);
    
    // UI Güncelleme
    if (gameLog.length === 1) logElement.innerHTML = '';
    const logItem = document.createElement('div');
    logItem.className = 'log-entry';
    logItem.innerHTML = `<span>${moveText}</span> <span class="${statusClass}">${symbol}</span>`;
    logElement.prepend(logItem); // En yeni hamle üstte
}

// --- 4. HAREKET VE OYUN MANTIĞI ---

function isSquareAttacked(targetIndex, attackerColor) {
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            if (getRawMoves(i, true).includes(targetIndex)) return true;
        }
    }
    return false;
}

function getRawMoves(i, onlyAttacks = false) {
    const piece = layout[i];
    if (!piece) return [];
    const color = piece[0], type = piece[2], { r, c } = { r: Math.floor(i / 8), c: i % 8 };
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
                const tr = r + d[0]*j, tc = c + d[1]*j;
                const target = (tr < 0 || tr > 7 || tc < 0 || tc > 7) ? null : tr * 8 + tc;
                if (target === null) break;
                if (!layout[target]) moves.push(target);
                else { if (onlyAttacks || layout[target][0] !== color) moves.push(target); break; }
            }
        });
    } else if (type === 'n' || type === 'k') {
        directions[type].forEach(d => {
            const tr = r + d[0], tc = c + d[1];
            const target = (tr < 0 || tr > 7 || tc < 0 || tc > 7) ? null : tr * 8 + tc;
            if (target !== null && (onlyAttacks || !layout[target] || layout[target][0] !== color)) moves.push(target);
        });
    } else if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        if (!onlyAttacks) {
            const f1 = (r + dir >= 0 && r + dir <= 7) ? (r + dir) * 8 + c : null;
            if (f1 !== null && !layout[f1]) {
                moves.push(f1);
                if (r === (color === 'w' ? 6 : 1)) {
                    const f2 = (r + 2*dir) * 8 + c;
                    if (!layout[f2]) moves.push(f2);
                }
            }
        }
        [c-1, c+1].forEach(dc => {
            if (dc >= 0 && dc <= 7) {
                const target = (r + dir) * 8 + dc;
                if (onlyAttacks || (layout[target] && layout[target][0] !== color)) moves.push(target);
            }
        });
    }
    return moves;
}

function handleSquareClick(i) {
    if (isBetrayalMoveMode) {
        if (getRawMoves(betrayalTarget).includes(i)) {
            const fromLabel = betrayalTarget;
            layout[i] = ''; 
            layout[betrayalTarget] = ''; 
            analyzeAndLog(fromLabel, i, turn === 'w' ? 'w-b' : 'b-b', true); // İhaneti kaydet
            isBetrayalMoveMode = false;
            betrayalTarget = null;
            completeTurn();
        }
        return;
    }

    if (selectedSquare === null) {
