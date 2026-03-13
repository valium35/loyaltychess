// --- 1. DEĞİŞKENLER VE HAFIZA SİSTEMİ ---
let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
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
    Object.keys(initialSetup).forEach(i => layout[parseInt(i)] = initialSetup[i]);
    gameLog = [];
    isBetrayalMoveMode = false;
    betrayalTarget = null;
    turn = 'w';
    draw();
    updateStatus();
    if (logElement) logElement.innerHTML = '<div class="log-placeholder">Oyun başladı...</div>';
}

// --- 3. ANALİZ VE KAYIT MOTORU ---

function getCoordsLabel(i) {
    const cols = 'abcdefgh';
    const rows = '87654321';
    return cols[i % 8] + rows[Math.floor(i / 8)];
}function analyzeAndLog(from, to, piece, isBetrayal = false) {
    let symbol = "";
    let statusClass = "";
    let currentThreats = []; 
    const movingPlayer = piece[0];
    const opponent = movingPlayer === 'w' ? 'b' : 'w';

    // 1. Tehditleri Belirle
    for (let i = 0; i < 64; i++) {
        const targetPiece = layout[i];
        if (targetPiece && targetPiece.startsWith(opponent) && ['n', 'r', 'b'].includes(targetPiece[2])) {
            if (isSquareAttacked(i, movingPlayer) && !isSquareAttacked(i, opponent)) {
                currentThreats.push(i);
            }
        }
    }

    if (isBetrayal) {
        symbol = "☠";
        statusClass = "betrayal-mark";
    } else if (currentThreats.length > 0) {
        symbol = "!";
        statusClass = "threat-mark";

        // READY (†) KONTROLÜ
        // Eğer benim ÖNCEKİ hamlemde de birileri tehlikedeyse (gameLog[length-2])
        if (gameLog.length >= 2) {
            const myLastTurn = gameLog[gameLog.length - 2];
            if (myLastTurn.threats && myLastTurn.threats.length > 0) {
                // Ortak bir kare var mı? (Önceki tehdit hala devam ediyor mu?)
                const stillVulnerable = currentThreats.some(idx => myLastMoveCheck(myLastTurn.threats, idx));
                if (stillVulnerable) {
                    symbol = "†";
                    statusClass = "ready-mark";
                }
            }
        }
    }

    // Yardımcı fonksiyon: Number vs String tip hatasını önler
    function myLastMoveCheck(arr, val) {
        return arr.map(Number).includes(Number(val));
    }

    // Log Kaydı
    const moveText = `${getCoordsLabel(from)}-${getCoordsLabel(to)}`;
    const logEntry = {
        move: moveText,
        symbol: symbol,
        threats: currentThreats, 
        player: movingPlayer
    };
    gameLog.push(logEntry);
    
    // UI Log Güncelleme
    if (logElement) {
        if (gameLog.length === 1) logElement.innerHTML = '';
        const logItem = document.createElement('div');
        logItem.className = 'log-entry';
        logItem.innerHTML = `<span>${moveText}</span> <span class="${statusClass}">${symbol}</span>`;
        logElement.prepend(logItem);
    }

    // POPUP TETİKLEME (Kesin Kontrol)
    if (symbol === "†") {
        console.log("İhanet tespit edildi, popup tetikleniyor...");
        const victimIdx = currentThreats[0];
        
        // Önce basit bir alert ile test edelim
        // alert("İhanet Hazır: " + getCoordsLabel(victimIdx)); 

        // logic_alerts.js içindeki fonksiyonu çağır
        if (typeof openPopup === "function") {
            openPopup(
                `İHANET UYARISI: ${getCoordsLabel(victimIdx)} karesindeki subay sahipsiz kaldı!`,
                "LAW 2: THE CHOICE",
                "Bu taş artık saf değiştirmeye hazır."
            );
        } else {
            console.error("HATA: openPopup fonksiyonu logic_alerts.js içinde bulunamadı!");
        }
    }
}



// --- 4. HAREKET VE SALDIRI KONTROLÜ ---

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
    const color = piece[0], type = piece[2], r = Math.floor(i / 8), c = i % 8;
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
                if (tr < 0 || tr > 7 || tc < 0 || tc > 7) break;
                const target = tr * 8 + tc;
                if (!layout[target]) moves.push(target);
                else { if (onlyAttacks || layout[target][0] !== color) moves.push(target); break; }
            }
        });
    } else if (type === 'n' || type === 'k') {
        directions[type].forEach(d => {
            const tr = r + d[0], tc = c + d[1];
            if (tr >= 0 && tr <= 7 && tc >= 0 && tc <= 7) {
                const target = tr * 8 + tc;
                if (onlyAttacks || !layout[target] || layout[target][0] !== color) moves.push(target);
            }
        });
    } else if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        if (!onlyAttacks) {
            const f1 = (r + dir) * 8 + c;
            if (r + dir >= 0 && r + dir <= 7 && !layout[f1]) {
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
                if (target >= 0 && target < 64 && (onlyAttacks || (layout[target] && layout[target][0] !== color))) moves.push(target);
            }
        });
    }
    return moves;
}

// --- 5. TIKLAMA VE TUR YÖNETİMİ ---

function handleSquareClick(i) {
    if (isBetrayalMoveMode && betrayalTarget !== null) {
        let moves = getRawMoves(betrayalTarget);
        if (moves.includes(i)) {
            const from = betrayalTarget;
            const piece = layout[from];
            if(layout[i] && layout[i].includes('-k')) return; 

            layout[i] = piece;
            layout[from] = '';
            analyzeAndLog(from, i, piece, true);
            
            setTimeout(() => {
                layout[i] = '';
                draw();
            }, 500);

            isBetrayalMoveMode = false;
            betrayalTarget = null;
            completeTurn();
        }
        return;
    }

    if (selectedSquare === null) {
        if (layout[i] && layout[i].startsWith(turn)) {
            selectedSquare = i;
            draw();
        }
    } else {
        const moves = getRawMoves(selectedSquare);
        if (moves.includes(i)) {
            const piece = layout[selectedSquare];
            const from = selectedSquare;
            layout[i] = piece;
            layout[selectedSquare] = '';
            analyzeAndLog(from, i, piece);
            selectedSquare = null;
            completeTurn();
        } else {
            selectedSquare = (layout[i] && layout[i].startsWith(turn)) ? i : null;
            draw();
        }
    }
}

function completeTurn() {
    turn = (turn === 'w' ? 'b' : 'w');
    draw();
    updateStatus();
}

function draw() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const isBlack = (Math.floor(i / 8) + (i % 8)) % 2 !== 0;
        square.className = `square ${isBlack ? 'black' : 'white'} ${selectedSquare === i ? 'active-law' : ''}`;
        
        const currentThreats = gameLog.length > 0 ? gameLog[gameLog.length-1].threats : [];
        if (currentThreats && currentThreats.includes(i) && gameLog[gameLog.length-1].symbol === "†") {
            square.style.boxShadow = "inset 0 0 15px #ff6600";
            square.title = "İhanet için tıkla!";
            square.onclick = () => {
                isBetrayalMoveMode = true;
                betrayalTarget = i;
                statusElement.innerText = "İHANET HAMLESİ SEÇİN!";
                draw();
            };
        } else {
            square.onclick = () => handleSquareClick(i);
        }

        if (layout[i]) {
            const p = document.createElement('div');
            p.className = `piece ${layout[i]}`;
            square.appendChild(p);
        }
        boardElement.appendChild(square);
    }
}

function updateStatus() {
    statusElement.innerText = "SIRA: " + (turn === 'w' ? "BEYAZDA" : "SİYAHTA");
}

initGame();
