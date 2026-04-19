// core/game_core.js - PURE CHESS ENGINE

export const GameCore = {
    board: Array(64).fill(''),
    turn: 'w',
    enPassantSquare: null,
    hasMoved: {},
    history: [],
    lastMove: null,
    isSimulating: false,

    // -----------------------------
    // RESET
    // -----------------------------
    reset() {
        const layout = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

        this.board = Array(64).fill('');

        layout.forEach((type, i) => {
            this.board[i] = `b-${type}`;
            this.board[i + 8] = 'b-p';
            this.board[i + 48] = 'w-p';
            this.board[i + 56] = `w-${type}`;
        });

        this.hasMoved = {
            'w-k': false,
            'b-k': false,
            'w-r-56': false,
            'w-r-63': false,
            'b-r-0': false,
            'b-r-7': false
        };

        this.turn = 'w';
        this.enPassantSquare = null;
        this.history = [];
        this.lastMove = null;
        this.isSimulating = false;
    },

    // -----------------------------
    // CORE MOVE (SADE MEKANİK)
    // -----------------------------
    applyMove(from, to, promotionPiece = null) {
        const piece = this.board[from];
        if (!piece) return null;

        const captured = this.board[to];
        const [color, type] = piece.split('-');

        const finalPiece = this.handleSpecialRules(
            from,
            to,
            color,
            type,
            promotionPiece
        );

        this.board[to] = finalPiece;
        this.board[from] = '';

        // state flags
        if (type === 'k') this.hasMoved[`${color}-k`] = true;
        if (type === 'r') this.hasMoved[`${color}-r-${from}`] = true;

        this.enPassantSquare =
            type === 'p' && Math.abs(from - to) === 16
                ? (from + to) / 2
                : null;

        return {
            from,
            to,
            piece,
            color,
            captured: !!captured
        };
    },

    // -----------------------------
    // MOVE GENERATION
    // -----------------------------
    getLegalMoves(idx) {
        const piece = this.board[idx];
        if (!piece || !piece.startsWith(this.turn)) return [];

        return this.getPieceMoves(idx).filter(to => {
            const captured = this.simulateMove(idx, to);
            const safe = !this.isCheck(this.turn);
            this.undoSimulatedMove(idx, to, captured);
            return safe;
        });
    },

    getPieceMoves(idx, boardState = this.board, onlyAttacks = false) {
        const piece = boardState[idx];
        if (!piece) return [];

        const [color, type] = piece.split('-');
        const { r, c } = this.getCoords(idx);

        let moves = [];

        const sliding = (dirs) => {
            dirs.forEach(d => {
                for (let i = 1; i < 8; i++) {
                    const t = this.getIndex(r + d[0] * i, c + d[1] * i);
                    if (t === null) break;

                    const target = boardState[t];

                    if (!target) {
                        moves.push(t);
                    } else {
                        if (onlyAttacks || !target.startsWith(color)) {
                            moves.push(t);
                        }
                        break;
                    }
                }
            });
        };

        switch (type) {
            case 'r':
                sliding([[1,0],[-1,0],[0,1],[0,-1]]);
                break;

            case 'b':
                sliding([[1,1],[1,-1],[-1,1],[-1,-1]]);
                break;

            case 'q':
                sliding([
                    [1,0],[-1,0],[0,1],[0,-1],
                    [1,1],[1,-1],[-1,1],[-1,-1]
                ]);
                break;

            case 'n':
                [
                    [2,1],[2,-1],[-2,1],[-2,-1],
                    [1,2],[1,-2],[-1,2],[-1,-2]
                ].forEach(d => {
                    const t = this.getIndex(r + d[0], c + d[1]);
                    if (t !== null) {
                        if (onlyAttacks || !boardState[t] || !boardState[t].startsWith(color)) {
                            moves.push(t);
                        }
                    }
                });
                break;

            case 'k':
                [
                    [1,0],[-1,0],[0,1],[0,-1],
                    [1,1],[1,-1],[-1,1],[-1,-1]
                ].forEach(d => {
                    const t = this.getIndex(r + d[0], c + d[1]);
                    if (t !== null) {
                        if (onlyAttacks || !boardState[t] || !boardState[t].startsWith(color)) {
                            moves.push(t);
                        }
                    }
                });
                break;

            case 'p':
                const dir = color === 'w' ? -1 : 1;

                // capture
                [this.getIndex(r + dir, c - 1), this.getIndex(r + dir, c + 1)]
                    .forEach(t => {
                        if (
                            t !== null &&
                            (boardState[t] && !boardState[t].startsWith(color) ||
                             t === this.enPassantSquare)
                        ) {
                            moves.push(t);
                        }
                    });

                // forward
                if (!onlyAttacks) {
                    const f1 = this.getIndex(r + dir, c);

                    if (f1 !== null && !boardState[f1]) {
                        moves.push(f1);

                        const startRow = color === 'w' ? 6 : 1;
                        if (r === startRow) {
                            const f2 = this.getIndex(r + 2 * dir, c);
                            if (f2 !== null && !boardState[f2]) {
                                moves.push(f2);
                            }
                        }
                    }
                }
                break;
        }

        return moves;
    },

    // -----------------------------
    // CHECK / ATTACK
    // -----------------------------
    isCheck(color, board = this.board) {
        const king = board.findIndex(p => p === `${color}-k`);
        if (king === -1) return false;

        const enemy = color === 'w' ? 'b' : 'w';

        return this.isSquareAttacked(king, enemy, board);
    },

    isSquareAttacked(target, attackerColor, board = this.board) {
        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (!piece || !piece.startsWith(attackerColor)) continue;

            const moves = this.getPieceMoves(i, board, true);
            if (moves.includes(target)) return true;
        }
        return false;
    },

    checkGameOver() {
        const hasMove = this.board.some((p, i) =>
            p && p.startsWith(this.turn) &&
            this.getLegalMoves(i).length > 0
        );

        if (!hasMove) {
            return this.isCheck(this.turn) ? "MAT" : "PAT";
        }

        return null;
    },

    // -----------------------------
    // SIMULATION
    // -----------------------------
    simulateMove(from, to) {
        const temp = this.board[to];
        this.board[to] = this.board[from];
        this.board[from] = '';
        return temp;
    },

    undoSimulatedMove(from, to, captured) {
        this.board[from] = this.board[to];
        this.board[to] = captured;
    },

    // -----------------------------
    // UTIL
    // -----------------------------
    handleSpecialRules(from, to, color, type, promotionPiece) {
        let final = `${color}-${type}`;

        // en passant capture
        if (type === 'p' && from % 8 !== to % 8 && !this.board[to]) {
            const cap = color === 'w' ? to + 8 : to - 8;
            this.board[cap] = '';
        }

        // castling rook move
        if (type === 'k' && Math.abs(from - to) === 2) {
            const short = to > from;
            const rFrom = short
                ? (color === 'w' ? 63 : 7)
                : (color === 'w' ? 56 : 0);

            const rTo = short
                ? (color === 'w' ? 61 : 5)
                : (color === 'w' ? 59 : 3);

            this.board[rTo] = this.board[rFrom];
            this.board[rFrom] = '';
        }

        // promotion
        if (type === 'p' && Math.floor(to / 8) === (color === 'w' ? 0 : 7)) {
            final = promotionPiece || `${color}-q`;
        }

        return final;
    },

    getCoords(i) {
        return { r: Math.floor(i / 8), c: i % 8 };
    },

    getIndex(r, c) {
        return (r < 0 || r > 7 || c < 0 || c > 7)
            ? null
            : r * 8 + c;
    },

    indexToCoord(i) {
        const files = 'abcdefgh';
        return files[i % 8] + (8 - Math.floor(i / 8));
    }
};