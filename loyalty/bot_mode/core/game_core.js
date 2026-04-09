// core/game_core.js - OYUNUN BEYNİ
import { BetrayalJudge } from '../core/betrayal_judge.js';

export const GameCore = {
    board: Array(64).fill(''),
    turn: 'w',
    enPassantSquare: null,
    hasMoved: {},
    history: [],
    lastMove: null,
    isBetrayalPhase: false,
    betrayalPieceIdx: null,
    threatHistory: Array(64).fill(null),
    activeBetrayals: [],
    isSimulating: false,

    init() {
        const layout = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
        this.board = Array(64).fill('');

        layout.forEach((type, i) => {
            this.board[i] = `b-${type}`;
            this.board[i + 8] = 'b-p';
            this.board[i + 48] = 'w-p';
            this.board[i + 56] = `w-${type}`;
        });

        this.hasMoved = {
            'w-k': false, 'b-k': false,
            'w-r-56': false, 'w-r-63': false,
            'b-r-0': false, 'b-r-7': false
        };

        this.turn = 'w';
        this.enPassantSquare = null;
        this.history = [];
        this.lastMove = null;
        this.isBetrayalPhase = false;
        this.betrayalPieceIdx = null;
        this.threatHistory = Array(64).fill(null);
        this.activeBetrayals = [];
        this.isSimulating = false;

        console.log("🚀 LoyaltyChess: Motor ve Sabıka Kaydı hazır.");
    },

    getCoords(i) {
        return { r: Math.floor(i / 8), c: i % 8 };
    },

    getIndex(r, c) {
        return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c;
    },

    isSquareAttacked(idx, attackerColor, boardState = this.board) {
        if (idx === null || idx < 0) return false;
        for (let i = 0; i < 64; i++) {
            const piece = boardState[i];
            if (piece && piece.startsWith(attackerColor)) {
                const moves = this.getPieceMoves(i, boardState, true);
                if (moves.includes(idx)) return true;
            }
        }
        return false;
    },

    isCheck(color, boardState = this.board) {
        const kingIdx = boardState.findIndex(p => p === color + '-k');
        if (kingIdx === -1) return false;
        const enemyColor = (color === 'w') ? 'b' : 'w';
        return this.isSquareAttacked(kingIdx, enemyColor, boardState);
    },

    getPieceMoves(idx, boardState = this.board, onlyAttacks = false) {
        const piece = boardState[idx];
        if (!piece) return [];
        const [color, type] = piece.split('-');

        // 🚩 İHANET KİMLİK KONTROLÜ
        const isBetraying = (color !== this.turn && !this.isSimulating);
        const friendlyColor = isBetraying ? (color === 'w' ? 'b' : 'w') : color;

        const { r, c } = this.getCoords(idx);
        let moves = [];

        const slidingMoves = (dirs) => {
            dirs.forEach(d => {
                for (let j = 1; j < 8; j++) {
                    const target = this.getIndex(r + d[0] * j, c + d[1] * j);
                    if (target === null) break;
                    const targetPiece = boardState[target];
                    if (!targetPiece) {
                        moves.push(target);
                    } else {
                        if (onlyAttacks) moves.push(target);
                        else if (targetPiece[0] !== friendlyColor) moves.push(target);
                        break;
                    }
                }
            });
        };

        switch (type) {
            case 'r':
                slidingMoves([[1, 0], [-1, 0], [0, 1], [0, -1]]);
                break;
            case 'b':
                slidingMoves([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
                break;
            case 'q':
                slidingMoves([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
                break;
            case 'n':
                [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(d => {
                    const target = this.getIndex(r + d[0], c + d[1]);
                    if (target !== null && (onlyAttacks || !boardState[target] || boardState[target][0] !== friendlyColor)) {
                        moves.push(target);
                    }
                });
                break;
            case 'k':
                [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(d => {
                    const target = this.getIndex(r + d[0], c + d[1]);
                    if (target !== null && (onlyAttacks || !boardState[target] || boardState[target][0] !== friendlyColor)) {
                        moves.push(target);
                    }
                });
                if (!onlyAttacks && !this.isCheck(color, boardState) && !isBetraying) {
                    if (this.canCastle(color, 'short', boardState)) moves.push(color === 'w' ? 62 : 6);
                    if (this.canCastle(color, 'long', boardState)) moves.push(color === 'w' ? 58 : 2);
                }
                break;
            case 'p':
                const dir = color === 'w' ? -1 : 1;
                [this.getIndex(r + dir, c - 1), this.getIndex(r + dir, c + 1)].forEach(diag => {
                    if (diag !== null) {
                        if (onlyAttacks || (boardState[diag] && boardState[diag][0] !== friendlyColor) || diag === this.enPassantSquare) {
                            moves.push(diag);
                        }
                    }
                });
                if (!onlyAttacks) {
                    const f1 = this.getIndex(r + dir, c);
                    if (f1 !== null && !boardState[f1]) {
                        moves.push(f1);
                        const startRow = color === 'w' ? 6 : 1;
                        const f2 = this.getIndex(r + 2 * dir, c);
                        if (r === startRow && !boardState[f2] && !boardState[f1]) {
                            moves.push(f2);
                        }
                    }
                }
                break;
        }
        return moves;
    },

    canCastle(color, side, boardState) {
        if (this.hasMoved[`${color}-k`]) return false;
        const row = color === 'w' ? 7 : 0;
        const isShort = side === 'short';
        const rookIdx = isShort ? (color === 'w' ? 63 : 7) : (color === 'w' ? 56 : 0);

        if (this.hasMoved[`${color}-r-${rookIdx}`]) return false;

        const path = isShort ?
            [this.getIndex(row, 5), this.getIndex(row, 6)] :
            [this.getIndex(row, 1), this.getIndex(row, 2), this.getIndex(row, 3)];

        if (path.some(idx => boardState[idx] !== '')) return false;

        const enemyColor = color === 'w' ? 'b' : 'w';
        const checkSquares = isShort ?
            [this.getIndex(row, 5), this.getIndex(row, 6)] :
            [this.getIndex(row, 2), this.getIndex(row, 3)];

        if (checkSquares.some(idx => this.isSquareAttacked(idx, enemyColor, boardState))) return false;
        return true;
    },

    getLegalMoves(idx) {
        const piece = this.board[idx];
        if (!piece) return [];
        const [color, type] = piece.split('-');
        const betrayalStatus = BetrayalJudge.getSquareStatus(this, idx);
        const isBetrayable = (betrayalStatus === 2);
        const isMyTurn = (color === this.turn);

        if (!isMyTurn && !isBetrayable) return [];

        return this.getPieceMoves(idx).filter(to => {
            if (!isMyTurn && isBetrayable && type === 'r' && Math.abs(idx - to) === 2) return false;

            const testBoard = [...this.board];
            if (!isMyTurn && isBetrayable) {
                testBoard[idx] = '';
                testBoard[to] = '';
            } else {
                testBoard[to] = testBoard[idx];
                testBoard[idx] = '';
            }

            if (this.isCheck(this.turn, testBoard)) return false;
            if (!isMyTurn && isBetrayable && this.isCheck(color, testBoard)) return false;

            return true;
        });
    },

    updateThreatHistory() {
        if (this.isSimulating) return;

        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (!piece) {
                this.threatHistory[i] = null;
                continue;
            }

            const [color, type] = piece.split('-');
            if (!BetrayalJudge.betrayableTypes.includes(type)) {
                this.threatHistory[i] = null;
                continue;
            }

            const opponent = (color === 'w' ? 'b' : 'w');
            const isCurrentlyAttacked = this.isSquareAttacked(i, opponent);

            if (isCurrentlyAttacked) {
                if (this.threatHistory[i] === null) {
                    this.threatHistory[i] = this.history.length;
                    console.log(`📝 NOTER: ${this.indexToCoord(i)} için tehdit dosyası açıldı. Hamle: ${this.history.length}`);
                }
            } else {
                this.threatHistory[i] = null;
            }
        }

        this.activeBetrayals = [];
        for (let i = 0; i < 64; i++) {
            if (BetrayalJudge.getSquareStatus(this, i) === 2) {
                this.activeBetrayals.push(i);
            }
        }

        if (this.activeBetrayals.length > 0) {
            console.log("🔥 İNFAZ LİSTESİ GÜNCEL:", this.activeBetrayals.map(idx => this.indexToCoord(idx)));
        }
    },

    handleSpecialRules(from, to, color, type, promotionPiece) {
        let finalPiece = `${color}-${type}`;

        // En Passant Capture
        if (type === 'p' && from % 8 !== to % 8 && this.board[to] === '') {
            this.board[color === 'w' ? to + 8 : to - 8] = '';
        }

        // Castling
        if (type === 'k' && Math.abs(from - to) === 2) {
            const isShort = to > from;
            const rFrom = isShort ? (color === 'w' ? 63 : 7) : (color === 'w' ? 56 : 0);
            const rTo = isShort ? (color === 'w' ? 61 : 5) : (color === 'w' ? 59 : 3);
            this.board[rTo] = this.board[rFrom];
            this.board[rFrom] = '';
            this.hasMoved[`${color}-r-${rFrom}`] = true;
        }

        // En Passant Target Square
        this.enPassantSquare = (type === 'p' && Math.abs(from - to) === 16) ? (from + to) / 2 : null;

        // Promotion
        if (type === 'p' && Math.floor(to / 8) === (color === 'w' ? 0 : 7)) {
            finalPiece = promotionPiece || `${color}-q`;
        }

        return finalPiece;
    },

  execute(from, to, promotionPiece = null) {
    const originalPiece = this.board[from];
    if (!originalPiece) return null;

    const [color, type] = originalPiece.split('-');
    const capturedPiece = this.board[to];
    const isBetrayal = (color !== this.turn);
    const finalPiece = this.handleSpecialRules(from, to, color, type, promotionPiece);

    if (type === 'k') this.hasMoved[`${color}-k`] = true;
    if (type === 'r') this.hasMoved[`${color}-r-${from}`] = true;

    if (isBetrayal) {
        this.board[to] = '';
        this.board[from] = '';
        // Simülasyon değilse log bas
        if (!this.isSimulating) {
            console.log(`⚔️ İHANET İNFAZI: ${this.indexToCoord(from)} -> ${this.indexToCoord(to)}`);
        }
    } else {
        this.board[to] = finalPiece;
        this.board[from] = '';
    }

    const moveData = {
        from, to, piece: finalPiece, color, isBetrayal,
        captured: capturedPiece,
        fromSq: this.indexToCoord(from),
        toSq: this.indexToCoord(to)
    };

    this.history.push(moveData);

    // 🚨 KRİTİK BARİKAT: Simülasyon içindeysek sabıka kaydı güncelleme ve ağır loglama yapma!
    if (this.isSimulating) {
        this.turn = (this.turn === 'w' ? 'b' : 'w');
        this.lastMove = moveData;
        return moveData;
    }

    // --- BURADAN AŞAĞISI SADECE GERÇEK OYUNDA ÇALIŞIR ---
    this.updateThreatHistory();

    const threatStatus = this.threatHistory
        .map((startAt, idx) => ({
            square: this.indexToCoord(idx),
            startedAtMove: startAt,
            currentHistoryLen: this.history.length,
            piece: this.board[idx]
        }))
        .filter(item => item.startedAtMove !== null);

    if (threatStatus.length > 0) {
        console.log(`--- 🏁 Hamle Sonu | Sabıka Kayıtları (Toplam: ${this.history.length}) ---`);
        console.table(threatStatus);
    }

    this.turn = (this.turn === 'w' ? 'b' : 'w');
    this.lastMove = moveData;
    return moveData;
},

    indexToCoord(idx) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        return files[idx % 8] + (8 - Math.floor(idx / 8));
    },

    checkGameOver() {
        const color = this.turn;
        const hasMove = this.board.some((p, idx) =>
            p?.startsWith(color) && this.getLegalMoves(idx).length > 0
        );
        if (!hasMove) return this.isCheck(color) ? "MAT" : "PAT";
        return null;
    }
};