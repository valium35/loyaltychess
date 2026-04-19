// bot/ai.js - YAPAY ZEKA (MİMARİ GÜNCELLEME)
import { GameCore } from '../core/game_core.js';
import { BetrayalJudge } from '../core/betrayal_judge.js';

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
                fetch(`./ml_lab/ml_weights.json?v=${Date.now()}`).catch(() => ({ json: () => ([]) }))
            ]);
            
            this.openingBook = await bookRes.json();
            this.openingSequences = this.openingBook; 
            this.mlWeights = await weightsRes.json();
            console.log("🧠 Bot hafızası tazelendi. Simülasyonlar artık mühürlü.");
        } catch (err) {
            console.error("Bot yüklenirken hata:", err);
        }
    },

    getBestMove() {
        GameCore.isSimulating = true; // 🚩 Dış dünyayı (Renderer vb.) kilitli tut
        this.killerMoves = {}; 
        
        const aiColor = GameCore.turn; 
        const currentGamePath = GameCore.history.map(h => h.fromSq + h.toSq);
        const moveNumber = currentGamePath.length;

        // 🎲 AÇILIŞ KİTABI (UCIToMove ile devam eder)
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

        const depth = 3; 
        let bestMove = null;
        let bestValue = -Infinity;
        
        const moves = this.getAllLegalMoves(aiColor);
        moves.sort((a, b) => this.movePriority(b, depth) - this.movePriority(a, depth));

        for (const move of moves) {
            const backup = this.backupState();
            
            // 🧪 LABORATUVARDA DENEME
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
            // 🚩 Şah kontrolü artık AI'nın simüle ettiği listeye göre yapılıyor
            return this.isKingInCheckInSimulation(color) ? -100000 : 0;
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
        if (alpha < standPat) alpha = standPat;

        let moves = this.getAllLegalMoves(color).filter(m => 
            this.isCapture(m) || GameCore.activeBetrayals.some(b => b.sq === m.from)
        );
        
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

    // 🚩 YENİ: Simülasyon İçin Özel Şah Kontrolü
    // Bu fonksiyon, GameCore'a "Sahiplik bilgisini benim listemden al" der.
    isKingInCheckInSimulation(color) {
        return GameCore.isCheck(color, GameCore.board, (idx) => {
            return BetrayalJudge.getServantColor(GameCore, idx, GameCore.activeBetrayals);
        });
    },

    isCapture(move) {
        return GameCore.board[move.to] !== '' || move.to === GameCore.enPassantSquare;
    },

    buildAttackMap(color) {
        const map = new Set();
        for (let i = 0; i < 64; i++) {
            // canControl artık BetrayalJudge üzerinden fiili sahibi buluyor
            if (GameCore.canControl(i, color)) {
                const moves = GameCore.getPieceMoves(i, GameCore.board, true);
                for (const target of moves) map.add(target);
            }
        }
        return map;
    },

    evaluateBoard(color) {
        let score = 0;
        const board = GameCore.board;

        for (let i = 0; i < 64; i++) {
            const piece = board[i];
            if (!piece) continue;

            const [pColor, pType] = piece.split('-');
            let val = this.pieceValues[pType] || 0;

            // ⚔️ AKTİF İHANET DEĞERLENDİRMESİ
            const isHain = GameCore.activeBetrayals.some(b => b.sq === i && b.target === color);
            if (isHain) val += 5000; 

            // ML Weights (Eğer varsa)
            if (this.mlWeights.length > 0) {
                const r = Math.floor(i / 8);
                const c = i % 8;
                const weight = (pColor === 'b') ? this.mlWeights[r][c] : this.mlWeights[7-r][c];
                val += weight * 5; 
            }

            score += (pColor === 'b' ? val : -val);
        }

        // Mobilite puanı
        const myMovesCount = this.getAllLegalMoves(color).length;
        score += (color === 'b' ? myMovesCount : -myMovesCount);

        return (color === 'b') ? score : -score;
    },

    getAllLegalMoves(color) {
        let moves = [];
        for (let i = 0; i < 64; i++) {
            if (GameCore.canControl(i, color)) {
                // getLegalMoves artık isCheck çağırırken default parametreleri kullanır
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

        const attackerType = fromPiece.split('-')[1];

        if (targetPiece) {
            const victimType = targetPiece.split('-')[1];
            score += (this.pieceValues[victimType] * 10) - (this.pieceValues[attackerType] / 10);
        }

        // İHANET İNFAZ ÖNCELİĞİ
        if (GameCore.activeBetrayals.some(b => b.sq === move.from)) {
            score += 20000; 
            if (targetPiece) score += 40000; 
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
            activeBetrayals: GameCore.activeBetrayals.map(b => ({...b})),
            historyLen: GameCore.history.length
        };
    },

    restoreState(backup) {
        GameCore.board = [...backup.board];
        GameCore.turn = backup.turn;
        GameCore.enPassantSquare = backup.enPassant;
        GameCore.hasMoved = { ...backup.hasMoved };
        GameCore.activeBetrayals = backup.activeBetrayals.map(b => ({...b})); 
        GameCore.history.length = backup.historyLen;
    },

    uciToMove(uci) {
        const files = "abcdefgh";
        const fromIdx = files.indexOf(uci[0]) + (8 - parseInt(uci[1])) * 8;
        const toIdx = files.indexOf(uci[2]) + (8 - parseInt(uci[3])) * 8;
        return { from: fromIdx, to: toIdx };
    }
};