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
    activeBetrayals: [], // Format: [{sq: index, target: 'w'/'b'}]
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
        
        window.GameCore = this; // Konsoldan müdahale için dışa açtık
        console.log("🚀 LoyaltyChess: Motor ve Sabıka Kaydı (Target-Based) hazır.");
    },

    getCoords(i) { return { r: Math.floor(i / 8), c: i % 8 }; },
    getIndex(r, c) { return (r < 0 || r > 7 || c < 0 || c > 7) ? null : r * 8 + c; },

    // ⚖️ ANAYASA MADDESİ: Taşın kimlik ve kontrol vizesi
   // GameCore.js
canControl(idx, turn) {
    const piece = this.board[idx];
    if (!piece) return false;
    const pieceColor = piece.split('-')[0];

    // 1. Kendi taşınsa zaten oynat (Beyazsan 'w' taşları)
    if (pieceColor === turn) return true;

    // 2. İhanet kontrolü (Sen Beyazsan 'w', listedeki 'target'ı 'w' olan rakip taşları oynatabilirsin)
    const betrayal = this.activeBetrayals.find(b => {
        const bSq = typeof b === 'object' ? b.sq : this.coordToIndex(b.split(' -> ')[0]);
        const bTarget = typeof b === 'object' ? b.target : b.split(' -> ')[1];
        return bSq === idx && bTarget === turn;
    });

    return !!betrayal;
},

    isSquareAttacked(idx, attackerColor, boardState = this.board, ignoreBetrayal = true) {
        if (idx === null || idx < 0) return false;
        for (let i = 0; i < 64; i++) {
            const piece = boardState[i];
            if (!piece || piece.split('-')[0] !== attackerColor) continue;
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
        const [originalColor, type] = piece.split('-');
        const friendlyColor = originalColor; 
        const { r, c } = this.getCoords(idx);
        let moves = [];

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
                if (!onlyAttacks && !this.isCheck(originalColor, boardState) && !this.activeBetrayals.some(b => b.sq === idx)) {
                    if (this.canCastle(originalColor, 'short', boardState)) moves.push(originalColor === 'w' ? 62 : 6);
                    if (this.canCastle(originalColor, 'long', boardState)) moves.push(originalColor === 'w' ? 58 : 2);
                }
                break;
            case 'p':
                const dir = originalColor === 'w' ? -1 : 1;
                [this.getIndex(r + dir, c - 1), this.getIndex(r + dir, c + 1)].forEach(diag => {
                    if (diag !== null && (onlyAttacks || (boardState[diag] && boardState[diag][0] !== friendlyColor) || diag === this.enPassantSquare)) moves.push(diag);
                });
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
        if (!this.canControl(idx, this.turn)) return [];

        const pieceColor = piece.split('-')[0];
        const isHainHamlesi = pieceColor !== this.turn;

        return this.getPieceMoves(idx).filter(to => {
            const testBoard = [...this.board];
            testBoard[to] = testBoard[idx];
            testBoard[idx] = '';

            if (isHainHamlesi) {
                const opponentColor = (this.turn === 'w' ? 'b' : 'w');
                const kingIdx = this.getKingIdx(opponentColor, testBoard);
                if (kingIdx !== -1 && this.isSquareAttacked(kingIdx, this.turn, testBoard, true)) return false;
            }
            return !this.isCheck(this.turn, testBoard);
        });
    },

    getKingIdx(color, boardState = this.board) {
        return boardState.findIndex(p => p === color + '-k');
    },

    updateThreatHistory() {
        if (this.isSimulating) return;

        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            if (!piece) { this.threatHistory[i] = null; continue; }
            
            const [color, type] = piece.split('-');
            if (!BetrayalJudge.betrayableTypes.includes(type)) { 
                this.threatHistory[i] = null; 
                continue; 
            }
            
            const opponentColor = (color === 'w' ? 'b' : 'w');
            if (this.isSquareAttacked(i, opponentColor, this.board, true)) {
                if (this.threatHistory[i] === null) this.threatHistory[i] = this.history.length;
            } else { 
                this.threatHistory[i] = null; 
            }
        }

        // 🔄 YENİ: Target-Based İhanet Listesi Oluşturma
        let newBetrayals = [];
        for (let i = 0; i < 64; i++) {
            if (BetrayalJudge.getSquareStatus(this, i) === 2) {
                const piece = this.board[i];
                const pieceColor = piece.split('-')[0];
                // Kural: İhanet vizesi (target) her zaman rakibe çıkar.
                newBetrayals.push({ sq: i, target: pieceColor === 'w' ? 'b' : 'w' });
            }
        }
        this.activeBetrayals = [...newBetrayals];
        
        if (this.activeBetrayals.length > 0) {
            console.log("🔥 Hain Listesi (Target-Based):", this.activeBetrayals.map(b => `${this.indexToCoord(b.sq)} -> ${b.target}`));
        }
    },

    execute(from, to, promotionPiece = null) {
        const originalPiece = this.board[from];
        if (!originalPiece) return null;
        const [color, type] = originalPiece.split('-');
        
        // ⚔️ İHANET KONTROLÜ: Hamleyi yapan kişi o taşın hedefi mi?
        const betrayal = this.activeBetrayals.find(b => b.sq === from && b.target === this.turn);

        this.threatHistory[to] = null; 

        if (betrayal) {
            // İHANET İNFAZI: İki kareyi de boşalt, taşı sil.
            this.board[to] = ''; 
            this.board[from] = ''; 
            this.activeBetrayals = this.activeBetrayals.filter(b => b.sq !== from);
            if (!this.isSimulating) console.log(`⚔️ İHANET GERÇEKLEŞTİ: ${this.indexToCoord(from)} (Hedef: ${this.turn})`);
        } else {
            const final = this.handleSpecialRules(from, to, color, type, promotionPiece);
            this.board[to] = final; 
            this.board[from] = '';
            if (type === 'k') this.hasMoved[`${color}-k`] = true;
            if (type === 'r') this.hasMoved[`${color}-r-${from}`] = true;
        }

        const moveData = { 
            from, to, piece: originalPiece, color, 
            isBetrayal: !!betrayal, 
            fromSq: this.indexToCoord(from), 
            toSq: this.indexToCoord(to) 
        };
        
        this.history.push(moveData);
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
        const hasMove = this.board.some((p, idx) => this.canControl(idx, color) && this.getLegalMoves(idx).length > 0);
        if (!hasMove) return this.isCheck(color) ? "MAT" : "PAT";
        return null;
    }
};