// ui/renderer.js - GÖRSEL MOTOR
import { GameCore } from '../core/game_core.js';
import { BetrayalJudge } from '../core/betrayal_judge.js';

export const Renderer = {
    render(selectedSquare = null, validMoves = []) {
        const boardEl = document.getElementById('chess-board');
        if (!boardEl) return;

        // 🚩 LOGLAR (Mevcut haliyle korundu)
        if (GameCore.activeBetrayals.length > 0 && !GameCore.isSimulating) {
            console.log("🕵️‍♂️ RENDERER KONTROL: Şu anki Aktif Hainler:", GameCore.activeBetrayals);
        }
        if (GameCore.activeBetrayals.length > 0 && !GameCore.isSimulating) {
            console.group("🕵️‍♂️ SADAKAT RAPORU (Tüm Hainler)");
            GameCore.activeBetrayals.forEach(b => {
                let coord, target;
                if (typeof b === 'string') {
                    [coord, target] = b.split(' -> ');
                } else {
                    coord = GameCore.indexToCoord(b.sq);
                    target = b.target;
                }
                const colorName = target === 'w' ? "BEYAZIN Emrinde" : "SİYAHIN Emrinde";
                console.log(`📍 Taş: %c${coord}%c -> %c${colorName}`, "color: yellow; font-weight: bold", "color: inherit", "color: orange; font-weight: bold");
            });
            console.groupEnd();
        }

        boardEl.innerHTML = ''; 

        for (let i = 0; i < 64; i++) {
            const sq = document.createElement('div');
            const row = Math.floor(i / 8);
            const col = i % 8;
            
            sq.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
            
            const lastMove = GameCore.lastMove; 
            if (lastMove && (lastMove.from === i || lastMove.to === i)) {
                sq.classList.add('last-move');
            }

            const status = BetrayalJudge.getSquareStatus(GameCore, i);
            const piece = GameCore.board[i];

            if (piece && status > 0) {
                const betrayalEntry = GameCore.activeBetrayals.find(b => {
                    if (typeof b === 'string') {
                        const coord = b.split(' -> ')[0];
                        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                        const file = files.indexOf(coord[0]);
                        const rank = 8 - parseInt(coord[1]);
                        return (rank * 8 + file) === i;
                    }
                    return b.sq === i;
                });

                // 🔄 ÖNCELİK DEĞİŞTİRİLDİ: Artık önce Status 2 (Kırmızı) kontrol ediliyor!
                if (status === 2 && betrayalEntry) {
                    // 🔴 İHANET: Kırmızı her zaman önceliklidir
                    sq.classList.add('betrayal-active'); 
                    
                    const target = typeof betrayalEntry === 'string' 
                                   ? betrayalEntry.split(' -> ')[1] 
                                   : betrayalEntry.target;
                                   
                    sq.classList.add(`target-${target}`);
                } 
                else if (status === 1) {
                    // 🔵 TEHDİT: Sadece ihanet kesinleşmemişse mavi göster
                    sq.classList.add('raw-threat'); 
                }
            }

            if (selectedSquare === i) sq.classList.add('active');

            if (validMoves && validMoves.includes(i)) {
                const dot = document.createElement('div');
                dot.className = 'valid-move-dot'; 
                sq.appendChild(dot);
            }

            if (piece) {
                const pEl = document.createElement('div');
                pEl.className = `piece ${piece}`;
                if (status === 2) pEl.classList.add('hain-piece');
                sq.appendChild(pEl);
            }

            sq.onclick = () => {
                window.dispatchEvent(new CustomEvent('squareClicked', { detail: i }));
            };

            boardEl.appendChild(sq);
        }
    },

    showPromotionModal(color, callback) {
        const modal = document.createElement('div');
        modal.className = 'promotion-modal';
        const pieces = ['q', 'r', 'b', 'n']; 
        pieces.forEach(type => {
            const btn = document.createElement('div');
            btn.className = `piece ${color}-${type} promo-option`; 
            btn.onclick = () => {
                modal.remove(); 
                callback(`${color}-${type}`); 
            };
            modal.appendChild(btn);
        });
        document.body.appendChild(modal);
    }
};