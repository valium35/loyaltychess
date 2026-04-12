import { GameCore } from '../core/game_core.js';
import { BetrayalJudge } from '../core/betrayal_judge.js';

export const AI = {
    openingBook: {}, 
    mlWeights: [],
    pieceValues: { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 },
async initialize() {
        try {
            const [bookRes, weightsRes] = await Promise.all([
                fetch('./ml_lab/opening_book.json').catch(() => ({ json: () => ({}) })),
                fetch('./ml_lab/ml_weights.json').catch(() => ({ json: () => ([]) }))
            ]);
            this.openingBook = await bookRes.json();
            this.mlWeights = await weightsRes.json();
            console.log("🧠 Botun hafızası ve sezgileri yüklendi!");
        } catch (err) {
            console.error("Bot yüklenirken hata oluştu:", err);
            // Hata olsa bile oyunun çökmemesi için boş objelerle devam et
            this.openingBook = {};
            this.mlWeights = [];
        }
    },
    // ... openingSequences ve initialize kısımları aynı kalıyor ...

    getBestMove() {
        GameCore.isSimulating = true;
        
        // 5. MADDE: Hamle başı ihanetleri cache'le
        this.currentHainBeyazlar = [...GameCore.activeBetrayals];

        const currentGamePath = GameCore.history.map(h => h.fromSq + h.toSq);
        const moveNumber = currentGamePath.length;

        // 5. MADDE: Opening book (Partial Match)
        if (moveNumber < 12) {
            for (let name in this.openingSequences) {
                const sequence = this.openingSequences[name];
                const isMatching = sequence.slice(0, moveNumber).every((m, idx) => m === currentGamePath[idx]);
                if (isMatching && sequence[moveNumber]) {
                    GameCore.isSimulating = false;
                    return this.uciToMove(sequence[moveNumber]);
                }
            }
        }

        const depth = 3; 
        let bestMove = null;
        let bestValue = -Infinity;
        
        const moves = this.getAllLegalMoves('b', false);
        moves.sort((a, b) => this.movePriority(b) - this.movePriority(a));

        for (const move of moves) {
            const backup = this.backupState();
            GameCore.execute(move.from, move.to);
            
            // 🔴 KRİTİK 2: Standart Negamax işareti (-negamax)
            const val = -this.negamax(depth - 1, -Infinity, Infinity, 'w');
            
            this.restoreState(backup);

            if (val > bestValue) {
                bestValue = val;
                bestMove = move;
            }
        }

        GameCore.isSimulating = false;
        return bestMove;
    },

    negamax(depth, alpha, beta, color) {
        if (depth === 0) return this.quiescence(alpha, beta, 0, color);

        const moves = this.getAllLegalMoves(color, true);
        if (moves.length === 0) {
            return GameCore.isCheck(color) ? -100000 : 0;
        }

        moves.sort((a, b) => this.movePriority(b) - this.movePriority(a));

        let maxEval = -Infinity;
        for (const move of moves) {
            const backup = this.backupState();
            GameCore.execute(move.from, move.to);
            
            // 🔴 KRİTİK 2: Negamax recursion işareti düzeltildi
            const evaluation = -this.negamax(depth - 1, -beta, -alpha, color === 'b' ? 'w' : 'b');
            
            this.restoreState(backup);
            
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);
            if (alpha >= beta) break;
        }
        return maxEval;
    },

    quiescence(alpha, beta, qDepth, color) {
        let standPat = this.evaluateBoard(color);
        if (qDepth > 4) return standPat;

        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;

        const captureMoves = this.getAllLegalMoves(color, true).filter(m => this.isCapture(m));
        
        for (const move of captureMoves) {
            const backup = this.backupState();
            GameCore.execute(move.from, move.to);
            
            const score = -this.quiescence(-beta, -alpha, qDepth + 1, color === 'b' ? 'w' : 'b');
            
            this.restoreState(backup);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    },

    isCapture(move) {
        return GameCore.board[move.to] !== '' || move.to === GameCore.enPassantSquare;
    },

    // 🔴 KRİTİK 1: GÜVENLİ ATTACK MAP (Pseudo-moves kullanımı)
    buildAttackMap(color) {
        const map = new Set();
        for (let i = 0; i < 64; i++) {
            const piece = GameCore.board[i];
            if (piece && piece.startsWith(color)) {
                // Pinlenmiş taşlar hala saldırıyor kabul edilmelidir (X-Ray etkisi)
                // getPieceMoves(..., true) genelde şah güvenliğini (legality) kontrol etmez, 
                // bu yüzden attack map için en güvenli yoldur.
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
        
        // Attack Map'leri bir kez oluşturup cache'den kullanıyoruz (Performans için şart)
        const attackMaps = {
            w: this.buildAttackMap('w'),
            b: this.buildAttackMap('b')
        };

        for (let i = 0; i < 64; i++) {
            const piece = GameCore.board[i];
            if (!piece) continue;

            const [pColor, pType] = piece.split('-');
            const r = Math.floor(i / 8);
            const c = i % 8;
            let val = this.pieceValues[pType] || 0;

            const opponentColor = (pColor === 'w' ? 'b' : 'w');

            const isAttacked = attackMaps[opponentColor].has(i);
            const isProtected = attackMaps[pColor].has(i);

            // 🛡️ 1. DURUM: Saldırı Altındaki Taşların Analizi
            if (isAttacked) {
                const isCritical = ['n', 'b', 'r', 'q', 'k'].includes(pType);
                
                // --- ⚔️ İHANET VE AGRESİF SALDIRI MANTIĞI ---
                if (pColor === 'w' && ['n', 'b', 'r'].includes(pType) && !isProtected) {
                    const status = BetrayalJudge.getSquareStatus(GameCore, i);

                    if (status === 2) {
                        // TAŞ ZATEN HAİN: Bot bu taşı kendi askeri gibi görüp bekletir.
                        val += 2000; 

                        // 🚀 YENİ: İNFAZ BONUSU
                        // Eğer bu hain taş senin (Beyaz) bir taşını alabiliyorsa ek puan ver.
                        // Bu, botun hain taşı sadece tutmasını değil, aktif kullanmasını sağlar.
                        const hainMoves = GameCore.getPieceMoves(i);
                        for (const targetIdx of hainMoves) {
                            const targetPiece = GameCore.board[targetIdx];
                            if (targetPiece && targetPiece.startsWith('w')) {
                                // Hain taş senin bir taşını "infaz" edebiliyorsa iştahı artsın.
                                val += 1000; 
                            }
                        }
                    } else if (status === 1) {
                        // TAŞ TEHDİTTE: Hain olmasını beklemek için bekleme bonusu.
                        val += (this.pieceValues[pType] + 500); 
                    }
                } 
                // ----------------------------------------------
                
                else if (isCritical) {
                    // Standart savunma/kaçış cezaları
                    val -= isProtected ? (this.pieceValues[pType] * 0.3) : (this.pieceValues[pType] * 1.5);
                } else {
                    val -= 30; // Piyonlar için hafif huzursuzluk
                }
            }

            // 2. DURUM: ML Sezgileri (Positional Weighting) - AYNEN KORUNDU
            if (this.mlWeights.length > 0) {
                const weight = (pColor === 'b') ? this.mlWeights[r][c] : this.mlWeights[7-r][c];
                val += weight * 5; 
            }

            // 3. DURUM: Skor toplama - AYNEN KORUNDU
            score += (pColor === 'b' ? val : -val);
        }

        // Negamax uyumu için aktif renge göre döndür
        return (color === 'b') ? score : -score;
    },
    getAllLegalMoves(color, isSim) {
        let moves = [];
        for (let i = 0; i < 64; i++) {
            const piece = GameCore.board[i];
            if (!piece) continue;
            
            let canMove = piece.startsWith(color);
            // 5. MADDE: currentHainBeyazlar cache kullanımı
            if (!canMove && color === 'b' && !isSim) {
                if (this.currentHainBeyazlar.includes(i)) canMove = true;
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

    movePriority(move) {
        const fromPiece = GameCore.board[move.from];
        const targetPiece = GameCore.board[move.to];
        if (!fromPiece) return 0;
        const attackerType = fromPiece.split('-')[1];
        let score = 0;
        
        if (targetPiece) {
            const victimType = targetPiece.split('-')[1];
            score = (this.pieceValues[victimType] * 10) - this.pieceValues[attackerType];
        }

        // Gelecekte buraya Killer Moves eklenebilir.
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
        GameCore.board = backup.board;
        GameCore.turn = backup.turn;
        GameCore.enPassantSquare = backup.enPassant;
        GameCore.hasMoved = backup.hasMoved;
        GameCore.activeBetrayals = backup.activeBetrayals;
        if (GameCore.history.length > backup.historyLen) GameCore.history.length = backup.historyLen;
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