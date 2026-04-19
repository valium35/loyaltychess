// bot/ai.js - YAPAY ZEKA
import { GameCore } from '../core/game_core.js';

export const AI = {
    openingBook: {},
    openingSequences: {},
    mlWeights: [],
    killerMoves: {},
    pieceValues: { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 },

    async initialize() {
        try {
            const [bookRes, weightsRes] = await Promise.all([
                fetch(`./ml_lab/opening_book.json?v=${Date.now()}`).catch(() => ({ json: () => ({}) })),
                fetch(`./ml_lab/ml_weights.json?v=${Date.now()}`).catch(() => ({ json: () => [] }))
            ]);

            this.openingBook = await bookRes.json();
            this.openingSequences = this.openingBook;
            this.mlWeights = await weightsRes.json();
            console.log("🧠 Bot hafızası hazır. Saf strateji devrede.");
        } catch (err) {
            console.error("Bot yüklenirken hata:", err);
        }
    },

    getBestMove() {
        GameCore.isSimulating = true;
        this.killerMoves = {};

        const aiColor = GameCore.turn;
        const currentGamePath = GameCore.history.map(h => h.fromSq + h.toSq);
        const moveNumber = currentGamePath.length;

        // 🎲 AÇILIŞ KİTABI
        if (moveNumber < 12 && this.openingSequences) {
            let compatibleMoves = [];
            for (let name in this.openingSequences) {
                const sequence = this.openingSequences[name];
                const isMatching = sequence.slice(0, moveNumber).every((m, idx) => m === currentGamePath[idx]);
                if (isMatching && sequence[moveNumber]) {
                    compatibleMoves.push(sequence[moveNumber]);
                }
            }
            if (compatibleMoves.length > 0) {
                GameCore.isSimulating = false;
                return this.uciToMove(compatibleMoves[Math.floor(Math.random() * compatibleMoves.length)]);
            }
        }

        const depth = 2; // Stabilite için 2 idealdir
        let bestMove = null;
        let bestValue = -Infinity;

        const moves = this.getAllLegalMoves(aiColor);
        moves.sort((a, b) => this.movePriority(b, depth) - this.movePriority(a, depth));

        for (const move of moves) {
            const backup = this.backupState();
            GameCore.simulateMove(move.from, move.to);
            const val = -this.negamax(depth - 1, -Infinity, Infinity);
            this.restoreState(backup);

            if (val > bestValue) {
                bestValue = val;
                bestMove = move;
            }
        }

        GameCore.isSimulating = false;
        return bestMove;
    },

    negamax(depth, alpha, beta) {
        if (depth === 0) return this.quiescence(alpha, beta, 0);

        const color = GameCore.turn;
        const moves = this.getAllLegalMoves(color);

        if (moves.length === 0) {
            return GameCore.isCheck(color) ? -100000 : 0;
        }

        moves.sort((a, b) => this.movePriority(b, depth) - this.movePriority(a, depth));

        let maxEval = -Infinity;
        for (const move of moves) {
            const backup = this.backupState();
            GameCore.simulateMove(move.from, move.to);
            const evaluation = -this.negamax(depth - 1, -beta, -alpha);
            this.restoreState(backup);

            if (evaluation >= beta) {
                this.killerMoves[depth] = move;
                return beta;
            }

            if (evaluation > maxEval) maxEval = evaluation;
            if (evaluation > alpha) alpha = evaluation;
        }
        return maxEval;
    },

    quiescence(alpha, beta, qDepth) {
        const color = GameCore.turn;
        let standPat = this.evaluateBoard(color);

        if (qDepth > 4) return standPat;

        if (standPat >= beta) return beta;

        // DELTA PRUNING: Ciddi fark varsa aramayı kes (Hızlandırır)
        const BIGGEST_PIECE = 900;
        if (standPat < alpha - BIGGEST_PIECE) return alpha;

        if (alpha < standPat) alpha = standPat;

        let moves = this.getAllLegalMoves(color).filter(m => this.isCapture(m));
        moves.sort((a, b) => this.movePriority(b, 0) - this.movePriority(a, 0));

        for (const move of moves) {
            const backup = this.backupState();
            GameCore.simulateMove(move.from, move.to);
            const score = -this.quiescence(-beta, -alpha, qDepth + 1);
            this.restoreState(backup);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    },

    isSquareSafe(squareIdx, myColor) {
        const enemyColor = myColor === 'w' ? 'b' : 'w';
        return !GameCore.isSquareAttacked(squareIdx, enemyColor);
    },

    isCapture(move) {
        return GameCore.board[move.to] !== '' || move.to === GameCore.enPassantSquare;
    },

    evaluateBoard(color) {
        let score = 0;
        const board = GameCore.board;
        const historyLen = GameCore.history.length;

        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (!piece) continue;

            const [pColor, pType] = piece.split('-');
            let val = this.pieceValues[pType] || 0;

            const { r, c } = GameCore.getCoords(i);

            // Merkez Kontrolü
            if ((r >= 3 && r <= 4) && (c >= 3 && c <= 4)) {
                val += 20;
            }

            // Açılış Disiplini
            if (historyLen < 15) {
                if ((pType === 'n' || pType === 'b') && (r === 0 || r === 7)) val -= 40;
                if (pType === 'q' && (r !== 0 && r !== 7)) val -= 30;
            }

            // Piyon İlerlemesi
            if (pType === 'p') {
                const progress = pColor === 'w' ? (7 - r) : r;
                val += progress * 5;
            }

            score += (pColor === 'b' ? val : -val);
        }

        const myMoves = this.getAllLegalMoves(color).length;
        score += (color === 'b' ? myMoves * 5 : -myMoves * 5);

        const myKingIdx = board.findIndex(p => p === color + '-k');
        if (myKingIdx !== -1) {
            const { r: kr, c: kc } = GameCore.getCoords(myKingIdx);
            if (historyLen < 20 && kc > 2 && kc < 5) score -= 40;
        }

        const myQueenIdx = board.findIndex(p => p === color + '-q');
        if (myQueenIdx !== -1 && !this.isSquareSafe(myQueenIdx, color)) {
            score -= 900; 
        }

        return (color === 'b') ? score : -score;
    },

    getAllLegalMoves(color) {
        let moves = [];
        for (let i = 0; i < 64; i++) {
            const piece = GameCore.board[i];
            if (piece && piece.startsWith(color)) {
                const targets = GameCore.getLegalMoves(i);
                for (const to of targets) {
                    moves.push({ from: i, to: to });
                }
            }
        }
        return moves;
    },

    movePriority(move, depth) {
        let score = 0;
        const fromPiece = GameCore.board[move.from];
        const targetPiece = GameCore.board[move.to];
        if (!fromPiece) return 0;

        const myColor = fromPiece.split('-')[0];
        const attackerType = fromPiece.split('-')[1];
        const attackerValue = this.pieceValues[attackerType] || 0;

        if (targetPiece) {
            const victimType = targetPiece.split('-')[1];
            const victimValue = this.pieceValues[victimType] || 0;

            if (victimValue < attackerValue && !this.isSquareSafe(move.to, myColor)) {
                score -= 5000;
            } else {
                score += (victimValue * 100) - attackerValue;
            }
        }

        if (!this.isSquareSafe(move.from, myColor)) {
            if (this.isSquareSafe(move.to, myColor)) {
                score += attackerValue * 2;
            }
        }

        if (this.killerMoves[depth] && this.killerMoves[depth].from === move.from && this.killerMoves[depth].to === move.to) {
            score += 2000;
        }
        return score;
    },

    backupState() {
        return {
            board: [...GameCore.board],
            turn: GameCore.turn,
            enPassant: GameCore.enPassantSquare,
            hasMoved: { ...GameCore.hasMoved },
            historyLen: GameCore.history.length
        };
    },

    restoreState(backup) {
        GameCore.board = [...backup.board];
        GameCore.turn = backup.turn;
        GameCore.enPassantSquare = backup.enPassant;
        GameCore.hasMoved = { ...backup.hasMoved };
        GameCore.history.length = backup.historyLen;
    },

    uciToMove(uci) {
        const files = "abcdefgh";
        const fromIdx = files.indexOf(uci[0]) + (8 - parseInt(uci[1])) * 8;
        const toIdx = files.indexOf(uci[2]) + (8 - parseInt(uci[3])) * 8;
        return { from: fromIdx, to: toIdx };
    },

    checkEndgame() {
        const pieceCount = GameCore.board.filter(p => p !== '').length;
        return pieceCount < 12;
    }
};