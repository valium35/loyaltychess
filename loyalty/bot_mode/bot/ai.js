import { GameCore } from '../core/game_core.js';
import { BetrayalJudge } from '../core/betrayal_judge.js';

export const AI = {
    openingBook: {}, 
    mlWeights: [],
    pieceValues: { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 },

    openingSequences: {
        "sah_gambiti": ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3", "g7g5"],
        "italyan_acilisi": ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"],
        "sicilya_savunmasi": ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4"],
        "fransiz_savunmasi": ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "g8f6"],
        "caro_kann": ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4"],
        "vezir_gambiti": ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6"],
        "ruy_lopez": ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6"],
        "scotch_game": ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4", "e5d4"],
        "london_system": ["d2d4", "d7d5", "c1f4", "g8f6", "e2e3", "c7c5"]
    },

    async initialize() {
        try {
            const [bookRes, weightsRes] = await Promise.all([
                fetch('./ml_lab/opening_book.json'),
                fetch('./ml_lab/ml_weights.json')
            ]);
            this.openingBook = await bookRes.json();
            this.mlWeights = await weightsRes.json();
            console.log("🧠 Botun hafızası ve sezgileri yüklendi!");
        } catch (err) {
            console.error("Bot yüklenirken hata oluştu:", err);
        }
    },

    getBestMove() {
        GameCore.isSimulating = true;
        const currentGamePath = GameCore.history.map(h => h.fromSq + h.toSq);
        const moveNumber = currentGamePath.length;

        if (moveNumber < 12) {
            for (let name in this.openingSequences) {
                const sequence = this.openingSequences[name];
                const isMatching = currentGamePath.every((move, idx) => move === sequence[idx]);
                if (isMatching && sequence[moveNumber]) {
                    const nextMoveUCI = sequence[moveNumber];
                    console.log(`📡 Rota Tespit Edildi: ${name.toUpperCase()}.`);
                    GameCore.isSimulating = false;
                    return this.uciToMove(nextMoveUCI);
                }
            }
        }

        const currentFen = this.getSimpleFen();
        if (this.openingBook && this.openingBook[currentFen]) {
            const bookEntry = this.openingBook[currentFen];
            let bestBookMove = Array.isArray(bookEntry) ? bookEntry[0] : bookEntry;
            GameCore.isSimulating = false; 
            return this.uciToMove(bestBookMove);
        }

        console.log("🧩 Minimax düşünmeye başlıyor...");
        const depth = 4; 
        let candidates = [];
        let bestValue = -Infinity;
        
        const moves = this.getAllLegalMoves('b', false);
        moves.sort((a, b) => this.movePriority(b) - this.movePriority(a));

        for (const move of moves) {
            const backup = this.backupState();
            GameCore.execute(move.from, move.to);
            const boardValue = this.minimax(depth - 1, -Infinity, Infinity, false);
            this.restoreState(backup);

            if (boardValue > bestValue) {
                bestValue = boardValue;
                candidates = [move];
            } else if (boardValue === bestValue) {
                candidates.push(move);
            }
        }

        GameCore.isSimulating = false;
        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    },

    minimax(depth, alpha, beta, isMaximizing) {
        if (depth === 0) return this.quiescence(alpha, beta, 0);
        const color = isMaximizing ? 'b' : 'w';
        const moves = this.getAllLegalMoves(color, false);
        if (moves.length === 0) {
            if (GameCore.isCheck(color)) return isMaximizing ? -100000 : 100000;
            return 0;
        }
        moves.sort((a, b) => this.movePriority(b) - this.movePriority(a));
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                const backup = this.backupState();
                GameCore.execute(move.from, move.to);
                const evaluation = this.minimax(depth - 1, alpha, beta, false);
                this.restoreState(backup);
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                const backup = this.backupState();
                GameCore.execute(move.from, move.to);
                const evaluation = this.minimax(depth - 1, alpha, beta, true);
                this.restoreState(backup);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    },

    quiescence(alpha, beta, qDepth) {
        if (qDepth > 4) return this.evaluateBoard();

        let standPat = this.evaluateBoard();
        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;

        const captureMoves = this.getAllLegalMoves('b', true).filter(m => GameCore.board[m.to]);
        captureMoves.sort((a, b) => this.movePriority(b) - this.movePriority(a));

        for (const move of captureMoves) {
            const backup = this.backupState();
            GameCore.execute(move.from, move.to);
            const score = -this.quiescence(-beta, -alpha, qDepth + 1);
            this.restoreState(backup);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    },

    evaluateBoard() {
        let score = 0;
        const whiteCheck = GameCore.isCheck('w');
        const blackCheck = GameCore.isCheck('b');

        for (let i = 0; i < 64; i++) {
            const piece = GameCore.board[i];
            if (!piece) continue;

            const [color, type] = piece.split('-');
            const r = Math.floor(i / 8);
            const c = i % 8;
            let val = this.pieceValues[type] || 0;
            const opponentColor = (color === 'w' ? 'b' : 'w');

            const isAttacked = GameCore.isSquareAttacked(i, opponentColor);
            const isProtected = GameCore.isSquareAttacked(i, color);

            if (isAttacked) {
                if (!isProtected) {
                    val -= (this.pieceValues[type] * 5.0); 
                    val -= 2500; 
                } else {
                    val -= (this.pieceValues[type] * 0.6); 
                }
            }

            if (type === 'q' && isAttacked && !isProtected) val -= 60000; 

            if (isAttacked && BetrayalJudge.betrayableTypes.includes(type)) {
                if (!isProtected) {
                    const escapeMoves = GameCore.getLegalMoves(i).length;
                    val -= (escapeMoves === 0) ? (this.pieceValues[type] * 10) : (this.pieceValues[type] * 4);
                }
            }

            if (color === 'b') {
                if (whiteCheck) {
                    if (isAttacked && !isProtected) {
                        val -= (this.pieceValues[type] * 2.5); 
                    } else {
                        val += 1500; 
                    }
                }
            } else {
                if (blackCheck && type === 'k') val -= 5000;
            }

            if (this.mlWeights.length > 0) {
                const weight = (color === 'b') ? this.mlWeights[r][c] : this.mlWeights[7-r][c];
                val += weight * 65; 
            }

            score += (color === 'b' ? val : -val);
        }
        return score;
    },

    movePriority(move) {
        const fromPiece = GameCore.board[move.from];
        const targetPiece = GameCore.board[move.to];
        if (!fromPiece) return 0;
        const attackerType = fromPiece.split('-')[1];
        const color = fromPiece.split('-')[0];
        const opponentColor = (color === 'w' ? 'b' : 'w');
        let score = 0;

        if (targetPiece) {
            const victimType = targetPiece.split('-')[1];
            score = (this.pieceValues[victimType] * 10) - this.pieceValues[attackerType];
            if (GameCore.isSquareAttacked(move.to, opponentColor)) {
                score -= (this.pieceValues[attackerType] * 1.5);
            }
        }

        if (attackerType === 'p') {
            const row = Math.floor(move.to / 8);
            if (row === 0 || row === 7) score += 900;
        }
        return score;
    },

    getSimpleFen() {
        let rows = [];
        for (let r = 0; r < 8; r++) {
            let rowStr = "";
            let empty = 0;
            for (let c = 0; c < 8; c++) {
                const piece = GameCore.board[r * 8 + c];
                if (!piece) empty++;
                else {
                    if (empty > 0) { rowStr += empty; empty = 0; }
                    const [color, type] = piece.split('-');
                    rowStr += (color === 'w' ? type.toUpperCase() : type);
                }
            }
            if (empty > 0) rowStr += empty;
            rows.push(rowStr);
        }
        return rows.join('/') + " " + GameCore.turn;
    },

    uciToMove(uci) {
        const files = "abcdefgh";
        const fromIdx = files.indexOf(uci[0]) + (8 - parseInt(uci[1])) * 8;
        const toIdx = files.indexOf(uci[2]) + (8 - parseInt(uci[3])) * 8;
        return { from: fromIdx, to: toIdx };
    },

  getAllLegalMoves(color, isQuiescence = false) {
    let moves = [];
    
    // 🚨 REKÜRSİF DÖNGÜ KIRICI: 
    // Bot derin düşüncedeyken (Quiescence) veya çok derin dallardayken 
    // sadece kendi taşlarına odaklansın.
    const allowBetrayalSorgu = !isQuiescence; 

    for (let i = 0; i < 64; i++) {
        const piece = GameCore.board[i];
        if (!piece) continue;

        let isBetrayable = false;
        
        // 🚨 KRİTİK DEĞİŞİKLİK: 
        // Bot simülasyondayken BetrayalJudge'ı ağır sorgularla yormuyoruz.
        // Sadece ana hamle sırasında (ilk aşamada) ihanetleri listeye alıyoruz.
        if (allowBetrayalSorgu && GameCore) {
            // Sadece mevcut activeBetrayals listesinde var mı diye bakmak çok daha hızlıdır
            // Ama senin mantığın getSquareStatus üzerinden gittiği için onu koruyalım:
            const status = BetrayalJudge.getSquareStatus(GameCore, i);
            isBetrayable = (color === 'b' && status === 2) || (color === 'w' && status === 1);
        }

        if (piece.startsWith(color) || isBetrayable) {
            // getLegalMoves yerine doğrudan getPieceMoves kullanarak 
            // GameCore'daki isCheck döngülerinden kaçınabiliriz (isteğe bağlı hız için)
            const targets = GameCore.getLegalMoves(i);
            for (const to of targets) {
                moves.push({ from: i, to: to });
            }
        }
    }
    return moves;
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
        GameCore.board = backup.board;
        GameCore.turn = backup.turn;
        GameCore.enPassantSquare = backup.enPassant;
        GameCore.hasMoved = backup.hasMoved;
        if (GameCore.history.length > backup.historyLen) GameCore.history.length = backup.historyLen;
    }
};