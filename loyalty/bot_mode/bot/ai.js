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
            
            const bookData = await bookRes.json();
            this.openingBook = bookData;
            this.openingSequences = bookData; 
            
            this.mlWeights = await weightsRes.json();
            console.log("🧠 Botun hafızası yüklendi! Açılış sayısı:", Object.keys(this.openingSequences).length);
        } catch (err) {
            console.error("Bot yüklenirken hata oluştu:", err);
            this.openingBook = {};
            this.openingSequences = {};
            this.mlWeights = [];
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
                const randomIndex = Math.floor(Math.random() * compatibleMoves.length);
                const selectedUCI = compatibleMoves[randomIndex];
                console.log(`🎯 Path Found! Hamle: ${selectedUCI}`);
                GameCore.isSimulating = false;
                return this.uciToMove(selectedUCI);
            }
        }

        const depth = 3; 
        let bestMove = null;
        let bestValue = -Infinity;
        
        const moves = this.getAllLegalMoves(aiColor, false);
        moves.sort((a, b) => this.movePriority(b, depth) - this.movePriority(a, depth));

        for (const move of moves) {
            const backup = this.backupState();
            GameCore.execute(move.from, move.to);
            
            // 🚩 NOISE (Gürültü) SİLİNDİ: Botun daha istikrarlı olması için saf puanı alıyoruz
            const val = -this.negamax(depth - 1, -Infinity, Infinity);
            
            this.restoreState(backup);

            if (val > bestValue) {
                bestValue = val;
                bestMove = move;
            }
        }

        // 🕵️‍♂️ DEDEKTİF LOGLARI: Botun niyetini burada ifşa ediyoruz
       // 🕵️‍♂️ İHANET DEDEKTİFİ: Kim kime ihanet ediyor?
        if (bestMove) {
            const piece = GameCore.board[bestMove.from];
            const fromCoord = GameCore.indexToCoord(bestMove.from);
            const toCoord = GameCore.indexToCoord(bestMove.to);
            const [pieceColor, pieceType] = piece.split('-');
            
            // 🚩 İHANET KONTROLÜ: Taş, sırası olan oyuncunun RENGİNDEN FARKLI MI?
            const isBetrayalMove = GameCore.activeBetrayals.includes(bestMove.from) && pieceColor !== GameCore.turn;

            if (isBetrayalMove) {
                // Siyahın (Bot) beyaz taşı kullanması durumu
                if (GameCore.turn === 'b') {
                    console.log(
                        `%c ⚔️ SİYAH İHANETİ: ${fromCoord} (${piece}) -> ${toCoord} `, 
                        "background: #ff0000; color: #ffffff; font-weight: bold; font-size: 13px; border-radius: 4px; padding: 2px 5px;"
                    );
                } 
                // Beyazın (Senin) siyah taşı kullanman durumu (veya AI simülasyonu)
                else {
                    console.log(
                        `%c ⚔️ BEYAZ İHANETİ: ${fromCoord} (${piece}) -> ${toCoord} `, 
                        "background: #ffcc00; color: #000000; font-weight: bold; font-size: 13px; border-radius: 4px; padding: 2px 5px;"
                    );
                }
            } else {
                // Normal hamleler
                console.log(
                    `%c ♟️ Normal Hamle: %c${fromCoord} -> ${toCoord} %c| %cSkor: ${bestValue.toFixed(2)}`,
                    "color: #888;", "color: #007acc; font-weight: bold;", "color: #888;", "color: #28a745;"
                );
            }
        }
        GameCore.isSimulating = false;
        return bestMove;
    },

    negamax(depth, alpha, beta) { 
        if (depth === 0) return this.quiescence(alpha, beta, 0);

        const color = GameCore.turn;
        const moves = this.getAllLegalMoves(color, true);
        
        if (moves.length === 0) {
            return GameCore.isCheck(color) ? -100000 : 0;
        }

        moves.sort((a, b) => this.movePriority(b, depth) - this.movePriority(a, depth));

        let maxEval = -Infinity;
        for (const move of moves) {
            const backup = this.backupState();
            GameCore.execute(move.from, move.to);
            
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

        // 🚩 AGRESİF QUIESCENCE: Sadece capture değil, Hain infazlarını da asla atlama!
        let moves = this.getAllLegalMoves(color, true).filter(m => 
            this.isCapture(m) || GameCore.activeBetrayals.includes(m.from)
        );
        
        for (const move of moves) {
            const backup = this.backupState();
            GameCore.execute(move.from, move.to);
            const score = -this.quiescence(-beta, -alpha, qDepth + 1);
            this.restoreState(backup);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    },

    isCapture(move) {
        return GameCore.board[move.to] !== '' || move.to === GameCore.enPassantSquare;
    },

    buildAttackMap(color) {
        const map = new Set();
        for (let i = 0; i < 64; i++) {
            const piece = GameCore.board[i];
            if (piece && piece.startsWith(color)) {
                const moves = GameCore.getPieceMoves(i, GameCore.board, true);
                for (const target of moves) {
                    map.add(target);
                }
            }
        }
        return map;
    },

    evaluateBoard(color) {
        let score = 0;
        const attackMaps = {
            w: this.buildAttackMap('w'),
            b: this.buildAttackMap('b')
        };

        // Mobility puanını azalttık ki taşları sabit tutmaya çalışmasın
        const myMovesCount = this.getAllLegalMoves(color, true).length;
        score += myMovesCount * 1; 

        for (let i = 0; i < 64; i++) {
            const piece = GameCore.board[i];
            if (!piece) continue;

            const [pColor, pType] = piece.split('-');
            const r = Math.floor(i / 8);
            const c = i % 8;
            let val = this.pieceValues[pType] || 0;

            if (pType === 'k' && GameCore.history.length < 30) {
                val -= 20;
            }

            const opponentColor = (pColor === 'w' ? 'b' : 'w');
            const isAttacked = attackMaps[opponentColor].has(i);
            const isProtected = attackMaps[pColor].has(i);

            if (isAttacked) {
                if (pColor === 'b') val -= 50;
                const isCritical = ['n', 'b', 'r', 'q', 'k'].includes(pType);
                
                if (pColor === 'w' && ['n', 'b', 'r'].includes(pType) && !isProtected) {
                    const status = BetrayalJudge.getSquareStatus(GameCore, i);
                    if (status === 2) {
                        const baseValue = this.pieceValues[pType];
                        // 🚩 İHANET ÖDÜLÜ ARTIRILDI: %120 bonus
                        let betrayalBonus = baseValue * 1.2; 
                        const hainMoves = GameCore.getPieceMoves(i);
                        let maxCaptureValue = 0;
                        for (const targetIdx of hainMoves) {
                            const targetPiece = GameCore.board[targetIdx];
                            if (targetPiece && targetPiece.startsWith('w')) {
                                const victimType = targetPiece.split('-')[1];
                                const currentCaptureVal = this.pieceValues[victimType] * 0.8;
                                if (currentCaptureVal > maxCaptureValue) maxCaptureValue = currentCaptureVal;
                            }
                        }
                        val += (betrayalBonus + maxCaptureValue);
                    } else if (status === 1) {
                        val += (this.pieceValues[pType] * 0.4 + 150); // Mavi durumunda da daha hevesli olsun
                    }
                } 
                else if (isCritical) {
                    val -= isProtected ? (this.pieceValues[pType] * 0.3) : (this.pieceValues[pType] * 1.5);
                } else {
                    val -= 30; 
                }
            }

            if (this.mlWeights.length > 0) {
                const weight = (pColor === 'b') ? this.mlWeights[r][c] : this.mlWeights[7-r][c];
                val += weight * 5; 
            }

            score += (pColor === 'b' ? val : -val);
        }

        return (color === 'b') ? score : -score;
    },

    getAllLegalMoves(color, isSim) {
    let moves = [];

    for (let i = 0; i < 64; i++) {
        const piece = GameCore.board[i];
        if (!piece) continue;

        let canMove = piece.startsWith(color);

        // 🚩 KİLİT FIX: ihanetli taş kontrolü doğru hale getirildi
        if (!canMove) {
            const betrayal = GameCore.activeBetrayals.find(b => b.sq === i);
            if (betrayal && betrayal.target === color) {
                canMove = true;
            }
        }

        if (canMove) {
            const targets = GameCore.getLegalMoves(i);
            for (const to of targets) {
                moves.push({ from: i, to: to });
            }
        }
    }

    return moves;
},

    movePriority(move, depth) {
    const fromPiece = GameCore.board[move.from];
    const targetPiece = GameCore.board[move.to];
    if (!fromPiece) return 0;

    const attackerType = fromPiece.split('-')[1];
    let score = 0;

    if (targetPiece) {
        const victimType = targetPiece.split('-')[1];
        score = this.pieceValues[victimType] - (this.pieceValues[attackerType] / 10);
    }
if (GameCore.activeBetrayals.some(b => b.sq === move.from)) {
    score += 5000; 
}
    // 🚩 KİLİT FIX: ihanet kontrolü (DOĞRU FORMAT)
    if (GameCore.activeBetrayals.some(b => b.sq === move.from)) {
        score += 2500; // ihanetli taşı oynamaya zorlar
    }

    if (this.killerMoves[depth] &&
        this.killerMoves[depth].from === move.from &&
        this.killerMoves[depth].to === move.to) {
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
            activeBetrayals: [...GameCore.activeBetrayals],
            historyLen: GameCore.history.length
        };
    },

    restoreState(backup) {
        GameCore.board = [...backup.board];
        GameCore.turn = backup.turn;
        GameCore.enPassantSquare = backup.enPassant;
        GameCore.hasMoved = { ...backup.hasMoved };
        GameCore.activeBetrayals = [...backup.activeBetrayals]; 
        if (GameCore.history.length > backup.historyLen) {
            GameCore.history.length = backup.historyLen;
        }
    },

    uciToMove(uci) {
        const files = "abcdefgh";
        const fromIdx = files.indexOf(uci[0]) + (8 - parseInt(uci[1])) * 8;
        const toIdx = files.indexOf(uci[2]) + (8 - parseInt(uci[3])) * 8;
        return { from: fromIdx, to: toIdx };
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
    }
};