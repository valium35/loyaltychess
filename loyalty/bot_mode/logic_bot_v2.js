/**
 * LoyaltyChess: logic_bot_v2.js
 * SIFIRDAN STABİL MİMARİ - FULL FİZİK GÜNCELLEMESİ (TAMİR EDİLDİ)
 */

// --- 1. GLOBAL DURUM ---
let board = Array(64).fill('');
let turn = 'w'; 
let gameHistory = [];
let redoStack = [];
let hasMoved = {}; 
let enPassantSquare = null;
let selectedSquare = null;

const pieceValues = { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 };

// --- 2. BAŞLATMA ---
function initGame() {
    const initialPositions = {
        0:'b-r', 1:'b-n', 2:'b-b', 3:'b-q', 4:'b-k', 5:'b-b', 6:'b-n', 7:'b-r',
        8:'b-p', 9:'b-p', 10:'b-p', 11:'b-p', 12:'b-p', 13:'b-p', 14:'b-p', 15:'b-p',
        48:'w-p', 49:'w-p', 50:'w-p', 51:'w-p', 52:'w-p', 53:'w-p', 54:'w-p', 55:'w-p',
        56:'w-r', 57:'w-n', 58:'w-b', 59:'w-q', 60:'w-k', 61:'w-b', 62:'w-n', 63:'w-r'
    };
    board.fill('');
    Object.entries(initialPositions).forEach(([idx, p]) => board[idx] = p);
    
    hasMoved = { 'w-k': false, 'b-k': false, 'w-r-56': false, 'w-r-63': false, 'b-r-0': false, 'b-r-7': false };
    turn = 'w';
    gameHistory = [];
    redoStack = [];
    enPassantSquare = null;
    selectedSquare = null;
    
    renderBoard();
    updateStatus();
}

// --- 3. TEMEL TAHTA FONKSİYONLARI ---
function getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; }
function getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; }

function findKing(color) {
    for (let i = 0; i < 64; i++) if (board[i] === `${color}-k`) return i;
    return -1;
}

// --- 4. HAREKET ÜRETİCİ ---
function getPieceMoves(idx, boardState = board, onlyAttacks = false) {
    const piece = boardState[idx];
    if (!piece) return [];
    const [color, type] = piece.split('-');
    const { r, c } = getCoords(idx);
    let moves = [];

    const slidingMoves = (dirs) => {
        dirs.forEach(d => {
            for (let j = 1; j < 8; j++) {
                const target = getIndex(r + d[0] * j, c + d[1] * j);
                if (target === null) break;
                if (!boardState[target]) { 
                    moves.push(target); 
                } else { 
                    if (boardState[target][0] !== color) moves.push(target); 
                    break; 
                }
            }
        });
    };

    switch (type) {
        case 'r': slidingMoves([[1, 0], [-1, 0], [0, 1], [0, -1]]); break;
        case 'b': slidingMoves([[1, 1], [1, -1], [-1, 1], [-1, -1]]); break;
        case 'q': slidingMoves([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]); break;
        case 'n':
            [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(d => {
                const target = getIndex(r + d[0], c + d[1]);
                if (target !== null && (!boardState[target] || boardState[target][0] !== color)) moves.push(target);
            });
            break;
        case 'k':
            [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(d => {
                const target = getIndex(r + d[0], c + d[1]);
                if (target !== null && (!boardState[target] || boardState[target][0] !== color)) moves.push(target);
            });

            if (!onlyAttacks && !hasMoved[`${color}-k`]) {
                const opponentColor = color === 'w' ? 'b' : 'w';
                const rookK = getIndex(r, 7);
                const f = getIndex(r, 5), g = getIndex(r, 6);
                if (boardState[rookK] === `${color}-r` && !hasMoved[`${color}-r-${rookK}`] && !boardState[f] && !boardState[g]) {
                    if (!isSquareAttacked(idx, opponentColor, boardState) && !isSquareAttacked(f, opponentColor, boardState) && !isSquareAttacked(g, opponentColor, boardState)) moves.push(g);
                }
                const rookQ = getIndex(r, 0);
                const d_sq = getIndex(r, 3), c_pos = getIndex(r, 2), b_sq = getIndex(r, 1);
                if (boardState[rookQ] === `${color}-r` && !hasMoved[`${color}-r-${rookQ}`] && !boardState[d_sq] && !boardState[c_pos] && !boardState[b_sq]) {
                    if (!isSquareAttacked(idx, opponentColor, boardState) && !isSquareAttacked(d_sq, opponentColor, boardState) && !isSquareAttacked(c_pos, opponentColor, boardState)) moves.push(c_pos);
                }
            }
            break;
        case 'p':
            const dir = color === 'w' ? -1 : 1;
            if (!onlyAttacks) {
                const f1 = getIndex(r + dir, c);
                if (f1 !== null && !boardState[f1]) {
                    moves.push(f1);
                    const startRow = color === 'w' ? 6 : 1;
                    const f2 = getIndex(r + 2 * dir, c);
                    if (r === startRow && !boardState[f2] && !boardState[f1]) moves.push(f2);
                }
            }
            [getIndex(r + dir, c - 1), getIndex(r + dir, c + 1)].forEach(diag => {
                if (diag !== null) {
                    if (onlyAttacks) {
                        moves.push(diag);
                    } else {
                        if (boardState[diag] && boardState[diag][0] !== color) moves.push(diag);
                        else if (diag === enPassantSquare) moves.push(diag);
                    }
                }
            });
            break;
    }
    return moves;
}

function getLegalMoves(idx) {
    const piece = board[idx];
    if (!piece || piece[0] !== turn) return [];
    
    return getPieceMoves(idx).filter(to => {
        const tempBoard = [...board];
        const isKing = piece.endsWith('-k');
        
        // Hamleyi simüle et
        tempBoard[to] = tempBoard[idx];
        tempBoard[idx] = '';
        
        // En Passant alma simülasyonu
        if (piece.endsWith('-p') && to === enPassantSquare) {
            const victimIdx = getIndex(getCoords(idx).r, getCoords(to).c);
            tempBoard[victimIdx] = '';
        }

        const kingPos = isKing ? to : findKing(turn);
        const opponentColor = (turn === 'w' ? 'b' : 'w');
        return !isSquareAttacked(kingPos, opponentColor, tempBoard);
    });
}

function isSquareAttacked(targetIdx, attackerColor, boardState = board) {
    if (targetIdx === null || targetIdx === -1) return false;
    for (let i = 0; i < 64; i++) {
        if (boardState[i] && boardState[i].startsWith(attackerColor)) {
            const moves = getPieceMoves(i, boardState, true);
            if (moves.includes(targetIdx)) return true;
        }
    }
    return false;
}

// --- 5. İNFAZ VE ETKİLEŞİM ---
function executeMove(from, to) {
    const piece = board[from];
    if (!piece) return;
    const [color, type] = piece.split('-');
    
    // Rok İnfazı
    if (type === 'k' && Math.abs(getCoords(from).c - getCoords(to).c) === 2) {
        const r = getCoords(from).r;
        const isKingside = getCoords(to).c === 6;
        const rFrom = isKingside ? getIndex(r, 7) : getIndex(r, 0);
        const rTo = isKingside ? getIndex(r, 5) : getIndex(r, 3);
        board[rTo] = board[rFrom];
        board[rFrom] = '';
        hasMoved[`${color}-r-${rFrom}`] = true;
    }

    // En Passant İnfazı
    if (type === 'p' && to === enPassantSquare) {
        const victimIdx = getIndex(getCoords(from).r, getCoords(to).c);
        board[victimIdx] = '';
    }

    // En Passant İzi Bırakma
    if (type === 'p' && Math.abs(getCoords(from).r - getCoords(to).r) === 2) {
        enPassantSquare = getIndex((getCoords(from).r + getCoords(to).r) / 2, getCoords(to).c);
    } else {
        enPassantSquare = null;
    }

    // Bayrakları Güncelle
    if (type === 'k') hasMoved[`${color}-k`] = true;
    if (type === 'r') hasMoved[`${color}-r-${from}`] = true;

    // Asıl Hareket
    board[to] = board[from];
    board[from] = '';

    // Piyon Terfisi (Vezir)
    if (type === 'p' && (getCoords(to).r === 0 || getCoords(to).r === 7)) {
        board[to] = `${color}-q`;
    }

    gameHistory.push(`${from}-${to}`);
    selectedSquare = null;
    const previousTurn = turn;
    turn = (turn === 'w' ? 'b' : 'w');
    
    renderBoard();
    updateStatus();
    checkGameEnd();

    if (previousTurn === 'w' && turn === 'b') {
        setTimeout(botMove, 500);
    }
}

function handleSquareClick(idx) {
    if (turn !== 'w') return;
    if (selectedSquare === null) {
        if (board[idx] && board[idx].startsWith('w')) {
            selectedSquare = idx;
            renderBoard();
        }
    } else {
        const moves = getLegalMoves(selectedSquare);
        if (moves.includes(idx)) {
            executeMove(selectedSquare, idx);
        } else {
            selectedSquare = (board[idx] && board[idx].startsWith('w')) ? idx : null;
            renderBoard();
        }
    }
}

// --- 6. BOT VE OYUN SONU ---
function botMove() {
    let allMoves = [];
    for(let i = 0; i < 64; i++) {
        if(board[i] && board[i].startsWith('b')) {
            const moves = getLegalMoves(i);
            moves.forEach(target => allMoves.push({ from: i, to: target }));
        }
    }

    if (allMoves.length > 0) {
        const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        executeMove(randomMove.from, randomMove.to);
    } else {
        checkGameEnd();
    }
}

function checkGameEnd() {
    let hasAnyLegalMove = false;
    let whitePieces = [];
    let blackPieces = [];

    for (let i = 0; i < 64; i++) {
        if (board[i]) {
            if (board[i].startsWith('w')) whitePieces.push(board[i]);
            else blackPieces.push(board[i]);

            if (board[i].startsWith(turn) && !hasAnyLegalMove) {
                if (getLegalMoves(i).length > 0) hasAnyLegalMove = true;
            }
        }
    }

    // --- Yetersiz Materyal Kontrolü ---
    if (whitePieces.length === 1 && blackPieces.length === 1) { // Sadece Şahlar kaldı
        alert("BERABERE! YETERSİZ MATERYAL.");
        return;
    }

    if (!hasAnyLegalMove) {
        const kingPos = findKing(turn);
        const isCheck = isSquareAttacked(kingPos, turn === 'w' ? 'b' : 'w');
        if (isCheck) {
            alert(turn === 'w' ? "MAT! LOYALTYBRAIN KAZANDI!" : "MAT! TEBRİKLER, KAZANDIN!");
        } else {
            alert("PAT! OYUN BERABERE BİTTİ.");
        }
    }
}

// --- 7. GÖRSEL TAZELEME VE YARDIMCI ---
function renderBoard() {
    const boardEl = document.getElementById('chess-board');
    if (!boardEl) return;
    boardEl.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const sq = document.createElement('div');
        sq.className = `square ${(Math.floor(i/8) + i%8) % 2 === 0 ? 'white' : 'black'}`;
        if (selectedSquare === i) sq.classList.add('active');
        if (board[i]) {
            const p = document.createElement('div');
            p.className = `piece ${board[i]}`;
            sq.appendChild(p);
        }
        sq.onclick = () => handleSquareClick(i);
        boardEl.appendChild(sq);
    }
}

function updateStatus() {
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.innerText = turn === 'w' ? "SIRA BEYAZDA" : "LOYALTYBRAIN DÜŞÜNÜYOR...";
}

function undoMove() {
    if (gameHistory.length < 2) return;
    gameHistory.pop(); gameHistory.push(); // Geri alırken bot hamlesini de siler
    gameHistory.pop(); 
    initGame();
    const historyCopy = [...gameHistory];
    gameHistory = [];
    historyCopy.forEach(move => {
        const [f, t] = move.split('-').map(Number);
        executeMove(f, t);
    });
}

window.onload = initGame;