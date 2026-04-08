import { GameCore } from '../core/game_core.js';
import { BetrayalJudge } from '../core/betrayal_judge.js';

export const AI = {
    openingBook: {}, 
    mlWeights: [],
    pieceValues: { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 },

    // 📘 PROFESYONEL AÇILIŞ ROTALARI (Hamle Zincirleri)
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

        // --- 📡 ADIM 1: AKILLI AÇILIŞ RADARI (Hamle Zinciri Kontrolü) ---
        // Mevcut oyunun hamle geçmişini UCI formatında (e2e4, e7e5 gibi) birleştiriyoruz
        const currentGamePath = GameCore.history.map(h => h.fromSq + h.toSq);
        const moveNumber = currentGamePath.length;

        if (moveNumber < 12) { // İlk 6 tam hamle boyunca radarı açık tut
            for (let name in this.openingSequences) {
                const sequence = this.openingSequences[name];
                
                // Eğer yapılan hamleler bu açılışın başına tam uyuyorsa
                const isMatching = currentGamePath.every((move, idx) => move === sequence[idx]);
                
                if (isMatching && sequence[moveNumber]) {
                    const nextMoveUCI = sequence[moveNumber];
                    console.log(`📡 Rota Tespit Edildi: ${name.toUpperCase()}. Kitap hamlesi: ${nextMoveUCI}`);
                    GameCore.isSimulating = false;
                    return this.uciToMove(nextMoveUCI);
                }
            }
        }

        // --- 📘 ADIM 2: STANDART FEN KİTABI SORGUSU (Yedek Plan) ---
        const currentFen = this.getSimpleFen();
        if (this.openingBook && this.openingBook[currentFen]) {
            const bookEntry = this.openingBook[currentFen];
            let bestBookMove = Array.isArray(bookEntry) ? bookEntry[0] : bookEntry;
            console.log("📚 Standart kitap hamlesi uygulanıyor:", bestBookMove);
            GameCore.isSimulating = false; 
            return this.uciToMove(bestBookMove);
        }

        // --- 🧠 ADIM 3: MİNİMAX (ZİNCİR KOPTU VEYA OYUN ORTASI) ---
        console.log("🧩 Kitap dışı pozisyon, Minimax düşünmeye başlıyor...");
        const depth = 3;
        let candidates = [];
        let bestValue = -Infinity;
        const moves = this.getAllLegalMoves('b');

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
        
        const finalMove = candidates[Math.floor(Math.random() * candidates.length)];
        console.log(`🤖 Hamle seçildi. Aday: ${candidates.length} | Skor: ${bestValue}`);
        return finalMove;
    },

    minimax(depth, alpha, beta, isMaximizing) {
        if (depth === 0) return this.evaluateBoard();
        
        const color = isMaximizing ? 'b' : 'w';
        const moves = this.getAllLegalMoves(color);
        
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

    evaluateBoard() {
        let score = 0;
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

            // 🛡️ TAKAS VE GÜVENLİK ANALİZİ
            if (isAttacked) {
                if (!isProtected) {
                    val -= (this.pieceValues[type] * 1.6); 
                } else {
                    val -= (this.pieceValues[type] * 0.4);
                }
            }

            // 👸 VEZİR DOKUNULMAZLIĞI
            if (type === 'q' && isAttacked && !isProtected) {
                val -= 30000; 
            }

            // 🛡️ İHANET ANALİZİ
            if (isAttacked && BetrayalJudge.betrayableTypes.includes(type)) {
                if (!isProtected) {
                    const escapeMoves = GameCore.getLegalMoves(i).length;
                    if (escapeMoves === 0) {
                        val -= (this.pieceValues[type] * 6); 
                    } else {
                        val -= (this.pieceValues[type] * 2);
                    }
                }
            }

            // 🎯 AGRESİFLİK DENGESİ
            if (color === 'b') {
                const targets = GameCore.getPieceMoves(i);
                targets.forEach(targetIdx => {
                    const targetPiece = GameCore.board[targetIdx];
                    if (targetPiece && targetPiece.startsWith('w')) {
                        val += (this.pieceValues[targetPiece.split('-')[1]] * 0.05); 
                    }
                });
            }

            // ML Sezgileri (Python'dan gelen ağırlıklar)
            if (this.mlWeights.length > 0) {
                const weight = (color === 'b') ? this.mlWeights[r][c] : this.mlWeights[7-r][c];
                val += weight * 65; 
            }

            if (type === 'k' && GameCore.isCheck(color)) {
                val -= 1000;
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
        let score = 0;

        if (targetPiece) {
            const victimType = targetPiece.split('-')[1];
            score = (this.pieceValues[victimType] * 10) - this.pieceValues[attackerType];
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
                if (!piece) {
                    empty++;
                } else {
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
        if (GameCore.history.length > backup.historyLen) {
            GameCore.history.length = backup.historyLen;
        }
    }
};