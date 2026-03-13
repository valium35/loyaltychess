let layout = Array(64).fill('');
let turn = 'w';
let selectedSquare = null;
let gameLog = []; 
let isBetrayalMoveMode = false;
let betrayalTarget = null;

const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');
const logElement = document.getElementById('move-history');

const initialSetup = {
    0:'b-r',1:'b-n',2:'b-b',3:'b-q',4:'b-k',5:'b-b',6:'b-n',7:'b-r',
    8:'b-p',9:'b-p',10:'b-p',11:'b-p',12:'b-p',13:'b-p',14:'b-p',15:'b-p',
    48:'w-p',49:'w-p',50:'w-p',51:'w-p',52:'w-p',53:'w-p',54:'w-p',55:'w-p',
    56:'w-r',57:'w-n',58:'w-b',59:'w-q',60:'w-k',61:'w-b',62:'w-n',63:'w-r'
};

function initGame() {
    layout.fill('');
    Object.keys(initialSetup).forEach(i => layout[parseInt(i)] = initialSetup[i]);
    gameLog = [];
    turn = 'w';
    draw();
}

function getCoordsLabel(i) {
    return 'abcdefgh'[i % 8] + '87654321'[Math.floor(i / 8)];
}

function analyzeAndLog(from, to, piece, isBetrayal = false) {
    let symbol = "";
    let statusClass = "";
    let currentThreats = []; 
    const movingPlayer = piece[0];
    const opponent = movingPlayer === 'w' ? 'b' : 'w';

    // Tehdit Kontrolü
    for (let i = 0; i < 64; i++) {
        const target = layout[i];
        if (target && target.startsWith(opponent) && ['n','r','b'].includes(target[2])) {
            if (isSquareAttacked(i, movingPlayer) && !isSquareAttacked(i, opponent)) {
                currentThreats.push(i);
            }
        }
    }

    if (isBetrayal) {
        symbol = "☠"; statusClass = "betrayal-mark";
    } else if (currentThreats.length > 0) {
        symbol = "!"; statusClass = "threat-mark";
        
        // READY (†) KONTROLÜ
        if (gameLog.length >= 2) {
            const prevLog = gameLog[gameLog.length - 2];
            if (prevLog.threats && prevLog.threats.some(idx => currentThreats.includes(idx))) {
                symbol = "†"; statusClass = "ready-mark";
            }
        }
    }

    const logEntry = { move: `${getCoordsLabel(from)}-${getCoordsLabel(to)}`, symbol, threats: currentThreats };
    gameLog.push(logEntry);
    
    if (logElement) {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<span>${logEntry.move}</span> <span class="${statusClass}">${symbol}</span>`;
        logElement.prepend(div);
    }

    if (symbol === "†") {
        showPop("LAW 2: THE CHOICE", "Bir subay saf değiştirmeye hazır!", "Sahipsiz kalan taşı kontrol edebilirsiniz.", "#ff6600");
    }
}

function isSquareAttacked(idx, attackerColor) {
    for (let i = 0; i < 64; i++) {
        if (layout[i] && layout[i].startsWith(attackerColor)) {
            if (getRawMoves(i, true).includes(idx)) return true;
        }
    }
    return false;
}

function getRawMoves(i, onlyAttacks = false) {
    const piece = layout[i]; if (!piece) return [];
    const color = piece[0], type = piece[2], r = Math.floor(i/8), c = i%8;
    let moves = [];
    const dirs = {
        'r':[[1,0],[-1,0],[0,1],[0,-1]], 'b':[[1,1],[1,-1],[-1,1],[-1,-1]],
        'q':[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],
        'n':[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]],
        'k':[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
    };

    if (['r','b','q'].includes(type)) {
        dirs[type].forEach(d => {
            for(let j=1; j<8; j++) {
                let tr = r+d[0]*j, tc = c+d[1]*j;
                if (tr<0||tr>7||tc<0||tc>7) break;
                let t = tr*8+tc;
                if (!layout[t]) moves.push(t);
                else { if (onlyAttacks || layout[t][0]!==color) moves.push(t); break; }
            }
        });
    } else if (['n','k'].includes(type)) {
        dirs[type].forEach(d => {
            let tr = r+d[0], tc = c+d[1];
            if (tr>=0&&tr<=7&&tc>=0&&tc<=7) {
                let t = tr*8+tc;
                if (onlyAttacks || !layout[t] || layout[t][0]!==color) moves.push(t);
            }
        });
    } else if (type === 'p') {
        let d = color === 'w' ? -1 : 1;
        if (!onlyAttacks && !layout[(r+d)*8+c]) moves.push((r+d)*8+c);
        [c-1, c+1].forEach(dc => {
            let t = (r+d)*8+dc;
            if (dc>=0&&dc<=7&&t>=0&&t<64 && (onlyAttacks || (layout[t] && layout[t][0]!==color))) moves.push(t);
        });
    }
    return moves;
}

function handleSquareClick(i) {
    if (isBetrayalMoveMode && betrayalTarget !== null) {
        if (getRawMoves(betrayalTarget).includes(i)) {
            const p = layout[betrayalTarget];
            layout[i] = p; layout[betrayalTarget] = '';
            analyzeAndLog(betrayalTarget, i, p, true);
            setTimeout(() => { layout[i] = ''; draw(); }, 500);
            isBetrayalMoveMode = false; betrayalTarget = null;
            turn = turn === 'w' ? 'b' : 'w'; draw();
        }
        return;
    }
    if (selectedSquare === null) {
        if (layout[i] && layout[i].startsWith(turn)) { selectedSquare = i; draw(); }
    } else {
        if (getRawMoves(selectedSquare).includes(i)) {
            const p = layout[selectedSquare];
            layout[i] = p; layout[selectedSquare] = '';
            analyzeAndLog(selectedSquare, i, p);
            selectedSquare = null; turn = turn === 'w' ? 'b' : 'w'; draw();
        } else {
            selectedSquare = (layout[i] && layout[i].startsWith(turn)) ? i : null; draw();
        }
    }
}

function draw() {
    boardElement.innerHTML = '';
    const lastLog = gameLog[gameLog.length-1];
    for (let i = 0; i < 64; i++) {
        const div = document.createElement('div');
        div.className = `square ${(Math.floor(i/8)+i%8)%2 ? 'black':'white'} ${selectedSquare===i?'active-law':''}`;
        
        if (lastLog && lastLog.symbol === "†" && lastLog.threats.includes(i)) {
            div.style.boxShadow = "inset 0 0 15px #ff6600";
            div.onclick = () => { isBetrayalMoveMode = true; betrayalTarget = i; draw(); };
        } else {
            div.onclick = () => handleSquareClick(i);
        }

        if (layout[i]) {
            const p = document.createElement('div');
            p.className = `piece ${layout[i]}`;
            div.appendChild(p);
        }
        boardElement.appendChild(div);
    }
    statusElement.innerText = "SIRA: " + (turn==='w'?'BEYAZDA':'SİYAHTA');
}

initGame();
