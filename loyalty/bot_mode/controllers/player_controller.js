// controllers/player_controller.js - OYUNCU KUMANDASI
import { GameCore } from '../core/game_core.js';
import { GameManager } from '../game_manager.js';

export const PlayerController = {
    selectedSquare: null,

    init() {
        // Doğrudan DOM yerine Renderer'ın ürettiği event'i dinliyoruz
        window.addEventListener('squareClicked', (e) => {
            this.handleInput(e.detail);
        });
        console.log("⚪ Oyuncu Kumandası Aktif.");
    },

    handleInput(idx) {
        // 1. GÜVENLİK FİLTRESİ
        // Sıra bizde değilse ('w'), bot düşünüyorsa veya oyun bittiyse dokunma.
        if (GameCore.turn !== 'w' || GameCore.checkGameOver()) return;

        const legalMovesForThisSquare = GameCore.getLegalMoves(idx);

        // --- SEÇİM MODU ---
        if (this.selectedSquare === null) {
            if (legalMovesForThisSquare.length > 0) {
                this.select(idx, legalMovesForThisSquare);
            }
            return;
        }

        // --- HAMLE MODU ---
        const legalMoves = GameCore.getLegalMoves(this.selectedSquare);

        if (legalMoves.includes(idx)) {
            this.handleMoveExecution(this.selectedSquare, idx);
        } else {
            // Seçimi değiştirme veya iptal (Başka bir kendi taşımıza tıkladıysak seç, boşluğa tıkladıysak bırak)
            if (legalMovesForThisSquare.length > 0) {
                this.select(idx, legalMovesForThisSquare);
            } else {
                this.deselect();
            }
        }
    },

    // 🚩 YARDIMCI: Seçim İşlemi
    select(idx, moves) {
        this.selectedSquare = idx;
        window.dispatchEvent(new CustomEvent('triggerRender', { 
            detail: { selected: idx, moves: moves } 
        }));
    },

    // 🚩 YARDIMCI: Seçimi Bırakma
    deselect() {
        this.selectedSquare = null;
        window.dispatchEvent(new CustomEvent('triggerRender', { 
            detail: { selected: null, moves: [] } 
        }));
    },

    // 🚩 HAMLE İNFAZI VE TERFİ KONTROLÜ
    handleMoveExecution(from, to) {
        const movingPiece = GameCore.board[from];

        // Piyon terfisi kontrolü (Beyaz piyon 0. satıra ulaştı mı?)
        if (movingPiece === 'w-p' && Math.floor(to / 8) === 0) {
            // Renderer'ı globalden değil, import ettiğimiz yerden de çağırabiliriz 
            // ama Manager üzerinden bir UI tetikleyicisi daha temiz olur. 
            // Şimdilik senin yapına sadık kalarak Renderer'ı kullanıyoruz.
            import('../ui/renderer.js').then(({ Renderer }) => {
                Renderer.showPromotionModal('w', (promotedPiece) => {
                    this.completeMove(from, to, promotedPiece);
                });
            });
        } else {
            this.completeMove(from, to);
        }
    },

    completeMove(from, to, promotion = null) {
        this.selectedSquare = null; 
        
        // ⚔️ ASIL YETKİLİYE (MANAGER) EMRİ VER:
        // Manager; commitMove'u çağıracak, Judge'ı işletecek, turn'ü çevirecek.
        GameManager.processMove(from, to, promotion);
    }
};