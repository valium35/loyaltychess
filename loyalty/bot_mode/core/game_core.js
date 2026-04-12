// core/game_core.js - OYUNUN BEYNİ
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

    init() {
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
        console.log("🚀 LoyaltyChess: Motor ve Sabıka Kaydı hazır.");
    },

    getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; },
    getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; },

  isSquareAttacked(idx, attackerColor, boardState = this.board, ignoreBetrayal = true) {
    if (idx === null || idx < 0) return false;

    for (let i = 0; i < 64; i++) {
        const piece = boardState[i];
        if (!piece) continue;

        // 🚩 FİZİKSEL RENK KONTROLÜ: Sadece gerçek rengine bakıyoruz.
        const pieceColor = piece.split('-')[0];
        if (pieceColor !== attackerColor) continue;

        // getPieceMoves(..., true) sadece saldırı menzilini hesaplar.
        // includes(idx) ile bu karenin o taşın menzilinde olup olmadığına bakıyoruz.
        if (this.getPieceMoves(i, boardState, true).includes(idx)) return true;
    }
    return false;
},

    isCheck(color, boardState = this.board) {
        const kingIdx = boardState.findIndex(p => p === color + '-k');
        if (kingIdx === -1) return false;
        return this.isSquareAttacked(kingIdx, color === 'w' ? 'b' : 'w', boardState, true);
    },

    getPieceMoves(idx, boardState = this.board, onlyAttacks = false) {
    const piece = boardState[idx];
    if (!piece) return [];
    
    // 🚩 FİZİKSEL RENK: İhanet etkisinden bağımsız, taşın üzerindeki gerçek renk.
    const [originalColor, type] = piece.split('-');
    const friendlyColor = originalColor; 
    const { r, c } = this.getCoords(idx);
    let moves = [];

    // Sliding mantığı (Kale, Fil, Vezir) - AYNEN KORUNDU
    const sliding = (dirs) => {
        dirs.forEach(d => {
            for (let j = 1; j < 8; j++) {
                const target = this.getIndex(r + d[0] * j, c + d[1] * j);
                if (target === null) break;
                const targetPiece = boardState[target];
                if (!targetPiece) moves.push(target);
                else {
                    if (onlyAttacks) moves.push(target);
                    else if (targetPiece[0] !== friendlyColor) moves.push(target);
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
                if (t !== null && (onlyAttacks || !boardState[t] || boardState[t][0] !== friendlyColor)) moves.push(t);
            });
            break;
        case 'k':
            [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(d => {
                const t = this.getIndex(r + d[0], c + d[1]);
                if (t !== null && (onlyAttacks || !boardState[t] || boardState[t][0] !== friendlyColor)) moves.push(t);
            });
            // Rok kuralı sadece hamle üretirken geçerlidir, saldırı haritasında değil.
            if (!onlyAttacks && !this.isCheck(originalColor, boardState) && !this.activeBetrayals.includes(idx)) {
                if (this.canCastle(originalColor, 'short', boardState)) moves.push(originalColor === 'w' ? 62 : 6);
                if (this.canCastle(originalColor, 'long', boardState)) moves.push(originalColor === 'w' ? 58 : 2);
            }
            break;
        case 'p':
            const dir = originalColor === 'w' ? -1 : 1;
            // Piyon saldırı çaprazları
            [this.getIndex(r + dir, c - 1), this.getIndex(r + dir, c + 1)].forEach(diag => {
                if (diag !== null && (onlyAttacks || (boardState[diag] && boardState[diag][0] !== friendlyColor) || diag === this.enPassantSquare)) moves.push(diag);
            });
            // Piyon düz gidiş (Sadece hamle üretirken)
            if (!onlyAttacks) {
                const f1 = this.getIndex(r + dir, c);
                if (f1 !== null && !boardState[f1]) {
                    moves.push(f1);
                    if (r === (originalColor === 'w' ? 6 : 1)) {
                        const f2 = this.getIndex(r + 2 * dir, c);
                        if (!boardState[f2] && !boardState[f1]) moves.push(f2);
                    }
                }
            }
            break;
    }
    return moves;
},

 getLegalMoves(idx) {
        const piece = this.board[idx];
        if (!piece) return [];
        const [originalColor] = piece.split('-');
        
        /**
         * ⚖️ İHANET VİZESİ (Sırası Geçen Kuralı):
         * Bir taşın hain sayılması için:
         * 1. activeBetrayals listesinde olmalı.
         * 2. Taşın rengi, şu anki sıradan FARKLI olmalı (originalColor !== this.turn).
         * Bu sayede oyuncu kendi sırasındayken kendi taşını ihanet ettirip silemez.
         */
        const isHain = this.activeBetrayals.includes(idx) && originalColor !== this.turn;
        
        // Yetki Kontrolü: Ya senin kendi taşındır ya da RAKİBİN vadesi dolmuş hain taşıdır.
        if (originalColor !== this.turn && !isHain) return [];

        // getPieceMoves'tan gelen hamleleri LoyaltyChess kurallarına göre süzüyoruz
        return this.getPieceMoves(idx).filter(to => {
            const testBoard = [...this.board];
            
            if (isHain) {
                // 🚫 İHANET KURALI: Hain taş şah çekemez veya mat edemez.
                // Hain taş infaz edilir (iki kare de boşalır)
                console.log("🧪 HAIN MOVE TEST:", this.indexToCoord(idx), "->", this.indexToCoord(to));
                testBoard[to] = testBoard[idx];
                testBoard[idx] = '';
                
                const opponentColor = (this.turn === 'w' ? 'b' : 'w');
                const kingIdx = this.getKingIdx(opponentColor, testBoard);
                
                // Hain taşın gittiği kare rakip şaha saldırıyorsa bu hamle yasaktır.
                if (kingIdx !== -1 && this.isSquareAttacked(kingIdx, this.turn, testBoard, true)) {
                    return false;
                }
            } else {
                // Normal hamle: Taşı yeni yerine koy, eski yerini boşalt
                testBoard[to] = testBoard[idx]; 
                testBoard[idx] = '';
            }

            // Standart kural: Kendi şahını tehlikeye atamazsın
            return !this.isCheck(this.turn, testBoard);
        });
    },

    // Yardımcı: Şahın yerini hızlıca bulmak için (Opsiyonel, eğer Core'da yoksa ekle)
    getKingIdx(color, boardState = this.board) {
        return boardState.findIndex(p => p === color + '-k');
    },

    updateThreatHistory() {
        if (this.isSimulating) return;

        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (!piece) { this.threatHistory[i] = null; continue; }
            const [color, type] = piece.split('-');
            if (!BetrayalJudge.betrayableTypes.includes(type)) { this.threatHistory[i] = null; continue; }
            
            if (this.isSquareAttacked(i, color === 'w' ? 'b' : 'w', this.board, true)) {
                if (this.threatHistory[i] === null) this.threatHistory[i] = this.history.length;
            } else { this.threatHistory[i] = null; }
        }

        // 🚨 KRİTİK: Listeyi Judge'ın en güncel haline göre mühürle
        this.activeBetrayals = [];
        for (let i = 0; i < 64; i++) {
            if (BetrayalJudge.getSquareStatus(this, i) === 2) {
                this.activeBetrayals.push(i);
            }
        }
        
        if (this.activeBetrayals.length > 0) {
            console.log("🔥 Hain Listesi Onaylandı:", this.activeBetrayals.map(idx => this.indexToCoord(idx)));
        }
    },

   execute(from, to, promotionPiece = null) {
        const originalPiece = this.board[from];
        if (!originalPiece) return null;

        const [color, type] = originalPiece.split('-');
        const isHain = this.activeBetrayals.includes(from);

        // 🚩 KRİTİK YAMA: Taşın hedef karesindeki eski "tehdit geçmişini" sil!
        // Bu sayede taş yeni karesine "tertemiz bir sayfa" ile başlar.
        // Gittiği yer rakip menzilindeyse bile kronometre sıfırdan (bu hamleden) başlar.
        this.threatHistory[to] = null; 

        if (isHain) {
            this.board[to] = ''; 
            this.board[from] = ''; 
            if (!this.isSimulating) console.log(`⚔️ İHANET İNFAZI: ${this.indexToCoord(from)}`);
        } else {
            const final = this.handleSpecialRules(from, to, color, type, promotionPiece);
            this.board[to] = final; 
            this.board[from] = '';
            
            if (type === 'k') this.hasMoved[`${color}-k`] = true;
            if (type === 'r') this.hasMoved[`${color}-r-${from}`] = true;
        }

        const moveData = { 
            from, 
            to, 
            piece: originalPiece, 
            color, 
            isBetrayal: isHain, 
            fromSq: this.indexToCoord(from), 
            toSq: this.indexToCoord(to) 
        };
        
        this.history.push(moveData);

        // 🚨 SIRALAMA: Önce tehditler güncellenir (yeni karedeki tehdit bu hamleyle tescillenir)
        if (!this.isSimulating) this.updateThreatHistory();
        
        this.turn = this.turn === 'w' ? 'b' : 'w';
        this.lastMove = moveData;
        return moveData;
    },

    handleSpecialRules(from, to, color, type, promotionPiece) {
        let final = `${color}-${type}`;
        if (type === 'p' && from % 8 !== to % 8 && this.board[to] === '') this.board[color === 'w' ? to + 8 : to - 8] = '';
        if (type === 'k' && Math.abs(from - to) === 2) {
            const short = to > from;
            const rF = short ? (color === 'w' ? 63 : 7) : (color === 'w' ? 56 : 0);
            const rT = short ? (color === 'w' ? 61 : 5) : (color === 'w' ? 59 : 3);
            this.board[rT] = this.board[rF]; this.board[rF] = '';
        }
        this.enPassantSquare = (type === 'p' && Math.abs(from - to) === 16) ? (from + to) / 2 : null;
        if (type === 'p' && Math.floor(to / 8) === (color === 'w' ? 0 : 7)) final = promotionPiece || `${color}-q`;
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
        const checkSq = short ? [5, 6] : [2, 3];
        if (checkSq.some(c => this.isSquareAttacked(this.getIndex(row, c), color === 'w' ? 'b' : 'w', boardState, true))) return false;
        return true;
    },

    indexToCoord(idx) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        return files[idx % 8] + (8 - Math.floor(idx / 8));
    },

    checkGameOver() {
        const color = this.turn;
        const hasMove = this.board.some((p, idx) => (p?.startsWith(color) || this.activeBetrayals.includes(idx)) && this.getLegalMoves(idx).length > 0);
        if (!hasMove) return this.isCheck(color) ? "MAT" : "PAT";
        return null;
    }
};