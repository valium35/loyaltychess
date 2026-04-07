import { GameCore } from '../core/game_core.js';

export const AI = {
    openingBook: {}, 
    mlWeights: [],
    pieceValues: { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 },

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
        GameCore.isSimulating = true; // Simülasyon modunu aç

        // --- 📘 1. ADIM: AÇILIŞ KİTABI (Sıra Kontrollü) ---
        const currentFen = this.getSimpleFen();
        if (this.openingBook[currentFen]) {
            const bookMoveUCI = this.openingBook[currentFen];
            console.log("📚 Kitap hamlesi yapılıyor:", bookMoveUCI);
            GameCore.isSimulating = false; 
            return this.uciToMove(bookMoveUCI);
        }

        // --- 🧠 2. ADIM: MİNİMAX HESAPLAMA (Kaos Faktörü Ekli) ---
        const depth = 3;
        let candidates = []; // En iyi hamleler havuzu
        let bestValue = -Infinity;
        const moves = this.getAllLegalMoves('b');

        // Hamleleri önceliklendir (Budamayı hızlandırır)
        moves.sort((a, b) => this.movePriority(b) - this.movePriority(a));

        for (const move of moves) {
            const backup = this.backupState();
            GameCore.execute(move.from, move.to);
            
            // Minimax'ı çağır (Sıra beyazda olduğu için false)
            const boardValue = this.minimax(depth - 1, -Infinity, Infinity, false);
            
            this.restoreState(backup);

            // 🎲 KAOS FAKTÖRÜ: En iyi hamleleri bir havuzda topla
            if (boardValue > bestValue) {
                bestValue = boardValue;
                candidates = [move]; // Yeni bir zirve bulundu, havuzu sıfırla
            } else if (boardValue === bestValue) {
                candidates.push(move); // Aynı kalitede başka bir hamle, havuza ekle
            }
        }

        GameCore.isSimulating = false; // Simülasyonu kapat

        // Havuzdaki en iyi hamleler arasından rastgele birini seç (Monotonluğu kırar)
        if (candidates.length === 0) return null;
        const finalMove = candidates[Math.floor(Math.random() * candidates.length)];
        console.log(`🤖 Hamle seçildi. Aday sayısı: ${candidates.length} | Skor: ${bestValue}`);
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
        const turn = GameCore.turn;

        for (let i = 0; i < 64; i++) {
            const piece = GameCore.board[i];
            if (!piece) continue;

            const [color, type] = piece.split('-');
            const r = Math.floor(i / 8);
            const c = i % 8;

            let val = this.pieceValues[type] || 0;

            // 👸 VEZİR SİGORTASI: Vezir tehlikedeyse devasa ceza puanı ver
            if (type === 'q') {
                const opponent = (color === 'w' ? 'b' : 'w');
                if (GameCore.isSquareAttacked(i, opponent)) {
                    val -= 15000; // Vezir gitmişse oyun bitmiştir mantığı
                }
            }

            // ML Sezgileri (Konum Avantajı)
            if (this.mlWeights.length > 0) {
                const weight = (color === 'b') ? this.mlWeights[r][c] : this.mlWeights[7-r][c];
                val += weight * 70; 
            }

            // Temel Koruma Kontrolü
            const isAttacked = GameCore.isSquareAttacked(i, color === 'b' ? 'w' : 'b');
            if (isAttacked) {
                const isDefended = GameCore.isSquareAttacked(i, color);
                if (!isDefended) {
                    val -= (this.pieceValues[type] * 1.5);
                } else {
                    val -= (this.pieceValues[type] * 0.1);
                }
            }

            if (type === 'k' && GameCore.isCheck(color)) {
                val -= 1000;
            }

            score += (color === 'b' ? val : -val);
        }

        // Mobilite Bonusu
        const bMoves = this.getAllLegalMoves('b').length;
        const wMoves = this.getAllLegalMoves('w').length;
        score += (bMoves - wMoves) * 10;

        return score;
    },

    movePriority(move) {
        const target = GameCore.board[move.to];
        return target ? this.pieceValues[target.split('-')[1]] : 0;
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
        // 🚨 FEN SONUNA SIRA EKLEME: Kitabın doğru çalışması için şart.
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
            if (GameCore.board[i] && GameCore.board[i].startsWith(color)) {
                const targets = GameCore.getLegalMoves(i);
                targets.forEach(to => moves.push({ from: i, to: to }));
            }
        }
        return moves;
    },

    backupState() {
        return {
            board: [...GameCore.board],
            turn: GameCore.turn,
            enPassant: GameCore.enPassantSquare,
            hasMoved: JSON.parse(JSON.stringify(GameCore.hasMoved)),
            history: [...GameCore.history],
            threatHistory: [...GameCore.threatHistory] // Sabıka kaydını da yedekle
        };
    },

    restoreState(backup) {
        GameCore.board = backup.board;
        GameCore.turn = backup.turn;
        GameCore.enPassantSquare = backup.enPassant;
        GameCore.hasMoved = backup.hasMoved;
        GameCore.history = backup.history;
        GameCore.threatHistory = backup.threatHistory;
    }
};