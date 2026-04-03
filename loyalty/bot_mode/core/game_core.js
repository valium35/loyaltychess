// core/game_core.js - OYUNUN BEYNİ
export const GameCore = {
    board: Array(64).fill(''),
    turn: 'w',
    enPassantSquare: null,
    hasMoved: {},
    history: [],
    lastMove: null,

    // 1. BAŞLATMA
    init() {
        const initialPositions = {
            0:'b-r', 1:'b-n', 2:'b-b', 3:'b-q', 4:'b-k', 5:'b-b', 6:'b-n', 7:'b-r',
            8:'b-p', 9:'b-p', 10:'b-p', 11:'b-p', 12:'b-p', 13:'b-p', 14:'b-p', 15:'b-p',
            48:'w-p', 49:'w-p', 50:'w-p', 51:'w-p', 52:'w-p', 53:'w-p', 54:'w-p', 55:'w-p',
            56:'w-r', 57:'w-n', 58:'w-b', 59:'w-q', 60:'w-k', 61:'w-b', 62:'w-n', 63:'w-r'
        };

        this.board = Array(64).fill('');
        Object.entries(initialPositions).forEach(([idx, p]) => {
            this.board[parseInt(idx)] = p;
        });

        this.hasMoved = { 
            'w-k': false, 'b-k': false, 
            'w-r-56': false, 'w-r-63': false, 
            'b-r-0': false, 'b-r-7': false 
        };

        this.turn = 'w';
        this.enPassantSquare = null;
        this.history = [];
    },

    getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; },
    getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; },

    // 2. TEHDİT KONTROLÜ
    isSquareAttacked(idx, attackerColor) {
        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (piece && piece.startsWith(attackerColor)) {
                // onlyAttacks=true göndererek sonsuz döngüyü (şah şahı korur mu?) engelliyoruz
                const moves = this.getPieceMoves(i, this.board, true);
                if (moves.includes(idx)) return true;
            }
        }
        return false;
    },

    // 3. TAŞ HAREKETLERİ
    getPieceMoves(idx, boardState = this.board, onlyAttacks = false) {
        const piece = boardState[idx];
        if (!piece) return [];
        const [color, type] = piece.split('-');
        const enemy = color === 'w' ? 'b' : 'w';
        const { r, c } = this.getCoords(idx);
        let moves = [];

        const slidingMoves = (dirs) => {
            dirs.forEach(d => {
                for (let j = 1; j < 8; j++) {
                    const target = this.getIndex(r + d[0] * j, c + d[1] * j);
                    if (target === null) break;
                    if (!boardState[target]) { moves.push(target); } 
                    else { 
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
                    const target = this.getIndex(r + d[0], c + d[1]);
                    if (target !== null && (!boardState[target] || boardState[target][0] !== color)) moves.push(target);
                });
                break;
            case 'k':
                [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(d => {
                    const target = this.getIndex(r + d[0], c + d[1]);
                    if (target !== null && (!boardState[target] || boardState[target][0] !== color)) moves.push(target);
                });
                
                // ROK KONTROLÜ
                if (!onlyAttacks) {
                    const row = color === 'w' ? 56 : 0;
                    // Kısa Rok
                    if (!this.hasMoved[color+'-k'] && !this.hasMoved[color+'-r-'+(row+7)]) {
                        if (this.board[row+5] === '' && this.board[row+6] === '') {
                            if (!this.isSquareAttacked(row+4, enemy) && !this.isSquareAttacked(row+5, enemy) && !this.isSquareAttacked(row+6, enemy)) {
                                moves.push(row+6);
                            }
                        }
                    }
                    // Uzun Rok
                    if (!this.hasMoved[color+'-k'] && !this.hasMoved[color+'-r-'+row]) {
                        if (this.board[row+1] === '' && this.board[row+2] === '' && this.board[row+3] === '') {
                            if (!this.isSquareAttacked(row+4, enemy) && !this.isSquareAttacked(row+2, enemy) && !this.isSquareAttacked(row+3, enemy)) {
                                moves.push(row+2);
                            }
                        }
                    }
                }
                break;
            case 'p':
                const dir = color === 'w' ? -1 : 1;
                if (!onlyAttacks) {
                    const f1 = this.getIndex(r + dir, c);
                    if (f1 !== null && !boardState[f1]) {
                        moves.push(f1);
                        const startRow = color === 'w' ? 6 : 1;
                        const f2 = this.getIndex(r + 2 * dir, c);
                        if (r === startRow && !boardState[f2] && !boardState[f1]) moves.push(f2);
                    }
                }
                // Piyon Saldırıları ve En Passant
                [this.getIndex(r + dir, c - 1), this.getIndex(r + dir, c + 1)].forEach(diag => {
                    if (diag !== null) {
                        const targetPiece = boardState[diag];
                        if (targetPiece && targetPiece[0] !== color) moves.push(diag);
                        else if (diag === this.enPassantSquare) moves.push(diag);
                        else if (onlyAttacks) moves.push(diag);
                    }
                });
                break;
        }
        return moves;
    },

    getLegalMoves(idx) {
        const piece = this.board[idx];
        if (!piece || piece[0] !== this.turn) return [];
        return this.getPieceMoves(idx); 
    },

    execute(from, to) {
        const piece = this.board[from];
        if (!piece) return null;
        const moveData = { from, to, piece, captured: this.board[to] };

        // 1. En Passant İnfazı
        if (piece.endsWith('-p') && from % 8 !== to % 8 && this.board[to] === '') {
            const capturedPawnIdx = (this.turn === 'w') ? to + 8 : to - 8;
            this.board[capturedPawnIdx] = ''; 
        }

        // 2. Rok İnfazı
        if (piece.endsWith('-k') && Math.abs(from - to) === 2) {
            const isShort = to > from;
            const rFrom = isShort ? (this.turn === 'w' ? 63 : 7) : (this.turn === 'w' ? 56 : 0);
            const rTo = isShort ? (this.turn === 'w' ? 61 : 5) : (this.turn === 'w' ? 59 : 3);
            this.board[rTo] = this.board[rFrom];
            this.board[rFrom] = '';
        }

        // 3. hasMoved Takibi
        if (piece === 'w-k') this.hasMoved['w-k'] = true;
        if (piece === 'b-k') this.hasMoved['b-k'] = true;
        if (from === 56) this.hasMoved['w-r-56'] = true;
        if (from === 63) this.hasMoved['w-r-63'] = true;
        if (from === 0) this.hasMoved['b-r-0'] = true;
        if (from === 7) this.hasMoved['b-r-7'] = true;

        // 4. En Passant Hedefi Belirle
        this.enPassantSquare = null; 
        if (piece.endsWith('-p') && Math.abs(from - to) === 16) {
            this.enPassantSquare = (from + to) / 2;
        }

        // 5. Tahtayı Güncelle
        this.board[to] = piece;
        this.board[from] = '';
        this.turn = (this.turn === 'w' ? 'b' : 'w');
        this.lastMove = { from, to, piece };

        return moveData;
    }
};