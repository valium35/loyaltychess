// core/game_core.js - OYUNUN MERKEZİ OTORİTESİ
import { BetrayalJudge } from '../core/betrayal_judge.js';

export const GameCore = {
    board: Array(64).fill(''),
    turn: 'w',
    enPassantSquare: null,
    hasMoved: {},
    history: [],
    lastMove: null,
    threatHistory: Array(64).fill(null),
    activeBetrayals: [],
    isSimulating: false,

    // --- 🚩 ANA GİRİŞ NOKTASI (COMMIT) ---
    commitMove(from, to, promotionPiece = null) {
        const moveResult = this.applyMove(from, to, promotionPiece);
        if (!moveResult) return null;

        const moveData = {
            ...moveResult,
            fromSq: this.indexToCoord(from),
            toSq: this.indexToCoord(to)
        };
        this.history.push(moveData);
        this.lastMove = moveData;

        this.runDomainLogic();
        this.switchTurn();

        return moveData;
    },

    runDomainLogic() {
        if (this.isSimulating) return;
        this.clearExpiredThreats();
        this.updateThreatHistory();
    },

    switchTurn() {
        this.turn = this.turn === 'w' ? 'b' : 'w';
    },

    reset() {
        const layout = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
        this.board = Array(64).fill('');
        layout.forEach((type, i) => {
            this.board[i] = `b-${type}`;
            this.board[i + 8] = 'b-p';
            this.board[i + 48] = 'w-p';
            this.board[i + 56] = `w-${type}`;
        });
        this.hasMoved = { 'w-k': false, 'b-k': false, 'w-r-56': false, 'w-r-63': false, 'b-r-0': false, 'b-r-7': false };
        this.turn = 'w';
        this.enPassantSquare = null;
        this.history = [];
        this.lastMove = null;
        this.threatHistory = Array(64).fill(null);
        this.activeBetrayals = [];
        this.isSimulating = false;
        window.GameCore = this;
    },

    applyMove(from, to, promotionPiece = null) {
        const originalPiece = this.board[from];
        if (!originalPiece) return null;
        
        const betrayal = this.activeBetrayals.find(b => b.sq === from && b.target === this.turn);
        this.threatHistory[to] = null; 

        if (betrayal) {
            this.board[to] = ''; 
            this.board[from] = ''; 
            this.activeBetrayals = this.activeBetrayals.filter(b => b.sq !== from);
        } else {
            const [color, type] = originalPiece.split('-');
            const final = this.handleSpecialRules(from, to, color, type, promotionPiece);
            this.board[to] = final; 
            this.board[from] = '';
            if (type === 'k') this.hasMoved[`${color}-k`] = true;
            if (type === 'r') this.hasMoved[`${color}-r-${from}`] = true;
        }

        return { from, to, piece: originalPiece, color: originalPiece.split('-')[0], isBetrayal: !!betrayal };
    },

    updateThreatHistory() {
        if (this.isSimulating) return;

        // 1. Sicil Kaydı (Tehdit Geçmişi Güncelleme)
        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (!piece) { this.threatHistory[i] = null; continue; }
            const [color, type] = piece.split('-');
            if (!['n', 'b', 'r'].includes(type)) { this.threatHistory[i] = null; continue; }

            const opponent = (color === 'w' ? 'b' : 'w');
            // Yeni isSquareAttacked yapısı kullanılıyor
            if (this.isSquareAttacked(i, opponent) && !this.isSquareAttacked(i, color)) {
                if (this.threatHistory[i] === null) {
                    this.threatHistory[i] = { start: this.history.length, stage: "threat" };
                }
            } else {
                this.threatHistory[i] = null;
            }
        }

        // 2. İhanet Vizesi (BetrayalJudge SAF Parametrelerle Çağrılıyor)
        let newBetrayals = [];
        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (!piece) continue;
            const [color] = piece.split('-');

            const status = BetrayalJudge.evaluateStatus({
                piece: piece,
                isAttacked: this.isSquareAttacked(i, color === 'w' ? 'b' : 'w'),
                isProtected: this.isSquareAttacked(i, color),
                threatEntry: this.threatHistory[i],
                historyLength: this.history.length,
                currentTurn: this.turn,
                isCheck: this.isCheck(color)
            });

            if (status === 2) { 
                newBetrayals.push({
                    sq: i,
                    target: (color === 'w' ? 'b' : 'w')
                });
            }
        }
        this.activeBetrayals = newBetrayals;
    },

    clearExpiredThreats() {
        for (let i = 0; i < 64; i++) {
            const t = this.threatHistory[i];
            if (t && this.history.length > t.start + 1) this.threatHistory[i] = null;
        }
    },

    canControl(idx, turn) {
        const piece = this.board[idx];
        if (!piece) return false;
        // Judge'ın yeni getServantColor yapısı
        return BetrayalJudge.getServantColor(this, idx) === turn;
    },

    /**
     * @param {number} targetIdx - Hedef kare
     * @param {string} attackerColor - Saldıran renk ('w' veya 'b')
     * @param {Array} board - Kontrol edilecek tahta
     * @param {Function} getOwnerFn - Taşın sahibini dönen fonksiyon (Dependency Injection)
     */
    isSquareAttacked(targetIdx, attackerColor, board = this.board, getOwnerFn = null) {
        // AI simülasyonlarında hayalet taşları engellemek için getOwnerFn kullanılır
        const getOwner = getOwnerFn || ((idx) => BetrayalJudge.getServantColor(this, idx));

        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (!piece) continue;

            if (getOwner(i) === attackerColor) {
                const moves = this.getPieceMoves(i, board, true);
                if (moves.includes(targetIdx)) return true;
            }
        }
        return false;
    },

    isCheck(color, boardState = this.board, getOwnerFn = null) {
        const kingIdx = boardState.findIndex(p => p === color + '-k');
        if (kingIdx === -1) return false;
        const opponent = (color === 'w' ? 'b' : 'w');
        return this.isSquareAttacked(kingIdx, opponent, boardState, getOwnerFn);
    },

    simulateMove(from, to) {
        const tempPiece = this.board[to];
        this.board[to] = this.board[from];
        this.board[from] = '';
        return tempPiece; 
    },

    undoSimulatedMove(from, to, capturedPiece) {
        this.board[from] = this.board[to];
        this.board[to] = capturedPiece;
    },

    getPieceMoves(idx, boardState = this.board, onlyAttacks = false) {
        const piece = boardState[idx];
        if (!piece) return [];
        const [originalColor, type] = piece.split('-');
        const { r, c } = this.getCoords(idx);
        let moves = [];

        const sliding = (dirs) => {
            dirs.forEach(d => {
                for (let j = 1; j < 8; j++) {
                    const t = this.getIndex(r + d[0] * j, c + d[1] * j);
                    if (t === null) break;
                    const targetPiece = boardState[t];
                    if (!targetPiece) moves.push(t);
                    else {
                        if (onlyAttacks || targetPiece[0] !== originalColor) moves.push(t);
                        break;
                    }
                }
            });
        };

        switch (type) {
            case 'r': sliding([[1, 0], [-1, 0], [0, 1], [0, -1]]); break;
            case 'b': sliding([[1, 1], [1, -1], [-1, 1], [-1, -1]]); break;
            case 'q': sliding([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]); break;
            case 'n':
                [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(d => {
                    const t = this.getIndex(r + d[0], c + d[1]);
                    if (t !== null && (onlyAttacks || !boardState[t] || boardState[t][0] !== originalColor)) moves.push(t);
                });
                break;
            case 'k':
                [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(d => {
                    const t = this.getIndex(r + d[0], c + d[1]);
                    if (t !== null && (onlyAttacks || !boardState[t] || boardState[t][0] !== originalColor)) moves.push(t);
                });
                if (!onlyAttacks && !this.isCheck(originalColor, boardState) && !this.activeBetrayals.some(b => b.sq === idx)) {
                    if (this.canCastle(originalColor, 'short', boardState)) moves.push(originalColor === 'w' ? 62 : 6);
                    if (this.canCastle(originalColor, 'long', boardState)) moves.push(originalColor === 'w' ? 58 : 2);
                }
                break;
            case 'p':
                const dir = originalColor === 'w' ? -1 : 1;
                [this.getIndex(r + dir, c - 1), this.getIndex(r + dir, c + 1)].forEach(diag => {
                    if (diag !== null && (onlyAttacks || (boardState[diag] && boardState[diag][0] !== originalColor) || diag === this.enPassantSquare)) moves.push(diag);
                });
                if (!onlyAttacks) {
                    const f1 = this.getIndex(r + dir, c);
                    if (f1 !== null && !boardState[f1]) {
                        moves.push(f1);
                        if (r === (originalColor === 'w' ? 6 : 1)) {
                            const f2 = this.getIndex(r + 2 * dir, c);
                            if (f2 !== null && !boardState[f2] && !boardState[f1]) moves.push(f2);
                        }
                    }
                }
                break;
        }
        return moves;
    },

    getLegalMoves(idx) {
        const piece = this.board[idx];
        if (!piece || !this.canControl(idx, this.turn)) return [];
        return this.getPieceMoves(idx).filter(to => {
            const testBoard = [...this.board];
            testBoard[to] = testBoard[idx];
            testBoard[idx] = '';
            return !this.isCheck(this.turn, testBoard);
        });
    },

    handleSpecialRules(from, to, color, type, promotionPiece) {
        let final = `${color}-${type}`;
        if (type === 'p' && from % 8 !== to % 8 && this.board[to] === '') {
            this.board[color === 'w' ? to + 8 : to - 8] = '';
        }
        if (type === 'k' && Math.abs(from - to) === 2) {
            const short = to > from;
            const rF = short ? (color === 'w' ? 63 : 7) : (color === 'w' ? 56 : 0);
            const rT = short ? (color === 'w' ? 61 : 5) : (color === 'w' ? 59 : 3);
            this.board[rT] = this.board[rF]; this.board[rF] = '';
        }
        this.enPassantSquare = (type === 'p' && Math.abs(from - to) === 16) ? (from + to) / 2 : null;
        if (type === 'p' && Math.floor(to / 8) === (color === 'w' ? 0 : 7)) {
            final = promotionPiece || `${color}-q`;
        }
        return final;
    },

    canCastle(color, side, boardState) {
        if (this.hasMoved[`${color}-k`]) return false;
        const row = color === 'w' ? 7 : 0;
        const short = side === 'short';
        const rIdx = short ? (color === 'w' ? 63 : 7) : (color === 'w' ? 56 : 0);
        if (this.hasMoved[`${color}-r-${rIdx}`]) return false;
        const path = short ? [5, 6] : [1, 2, 3];
        if (path.some(c => boardState[this.getIndex(row, c)] !== '')) return false;
        const opponent = (color === 'w' ? 'b' : 'w');
        return !short ? [2, 3].every(c => !this.isSquareAttacked(this.getIndex(row, c), opponent, boardState)) 
                      : [5, 6].every(c => !this.isSquareAttacked(this.getIndex(row, c), opponent, boardState));
    },

    getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; },
    getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; },
    indexToCoord(idx) {
        const files = 'abcdefgh';
        return files[idx % 8] + (8 - Math.floor(idx / 8));
    },
    checkGameOver() {
        const hasMove = this.board.some((p, idx) => this.canControl(idx, this.turn) && this.getLegalMoves(idx).length > 0);
        if (!hasMove) return this.isCheck(this.turn) ? "MAT" : "PAT";
        return null;
    }
};