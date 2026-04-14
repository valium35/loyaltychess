// controllers/player_controller.js - OYUNCU KUMANDASI
import { GameCore } from '../core/game_core.js';
import { EventSystem } from '../core/event_system.js';
import { Renderer } from '../ui/renderer.js';

export const PlayerController = {
    selectedSquare: null,

    init() {
        window.addEventListener('squareClicked', (e) => {
            this.handleInput(e.detail);
        });
        console.log("⚪ Oyuncu Kumandası Aktif.");
    },

    handleInput(idx) {
        // Sıra beyazda değilse veya oyun bittiyse girişi reddet
        if (GameCore.turn !== 'w' || GameCore.checkGameOver()) return;

        const legalMovesForThisSquare = GameCore.getLegalMoves(idx);

        // --- 1. SEÇİM MODU ---
        // Eğer hiçbir yer seçili değilse ve tıklanan karenin hamle vizesi (canControl) varsa seç:
        if (this.selectedSquare === null) {
            if (legalMovesForThisSquare.length > 0) {
                this.selectedSquare = idx;
                
                // Hamleleri göstermek için render tetikle
                EventSystem.add({ 
                    type: 'triggerRender', 
                    detail: { selected: idx, moves: legalMovesForThisSquare } 
                });
            }
            return;
        }

        // --- 2. HAMLE MODU (Bir kare zaten seçiliyse) ---
        const legalMoves = GameCore.getLegalMoves(this.selectedSquare);

        if (legalMoves.includes(idx)) {
            const movingPiece = GameCore.board[this.selectedSquare];

            // 🔴 TERFİ KONTROLÜ (Sadece kendi piyonun için)
            if (movingPiece === 'w-p' && Math.floor(idx / 8) === 0) {
                Renderer.showPromotionModal('w', (promotedPiece) => {
                    this.completeMove(this.selectedSquare, idx, promotedPiece);
                });
            } else {
                // ✅ NORMAL VEYA İHANET HAMLESİ
                this.completeMove(this.selectedSquare, idx);
            }
        } else {
            // Yanlış yere tıklandıysa:
            // Eğer tıkladığın yer yeni bir seçilebilir taşsa, oraya odaklan:
            if (legalMovesForThisSquare.length > 0) {
                this.selectedSquare = idx;
                EventSystem.add({ 
                    type: 'triggerRender', 
                    detail: { selected: idx, moves: legalMovesForThisSquare } 
                });
            } else {
                // Boşluğa tıklandıysa seçimi iptal et
                this.selectedSquare = null;
                EventSystem.add({ 
                    type: 'triggerRender', 
                    detail: { selected: null, moves: [] } 
                });
            }
        }
    },

    // Hamleyi bitirme ve sistemi tetikleme
    completeMove(from, to, promotion = null) {
    // 1. Hamleyi yap (Execute içinde turn otomatik olarak rakibe geçer)
    const moveData = GameCore.execute(from, to, promotion);
    this.selectedSquare = null; 

    if (moveData) {
        // 2. Hamle bitti bilgisini yay (Manager bunu duyup Renderer'ı ve Botu çağıracak)
        EventSystem.add({ type: 'moveExecuted', detail: moveData });
        
        // --- 🚩 DÜZELTME ---
        // Burada sıra zaten karşıya geçti. Ekstra bir 'w' kontrolüne gerek yok.
        // GameManager zaten 'moveFinished' duyduğunda Renderer.render() yapacak.
    }
}
};