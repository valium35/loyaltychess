// bot/ai.js - LOYALTYBRAIN ZEKASI
import { GameCore } from '../core/game_core.js';

export const AI = {
    // 1. EN İYİ HAMLEYİ BUL (Şimdilik rastgele, yarın puanlı!)
    getBestMove() {
        let allPossibleMoves = [];
           console.log("AI: Tahtayı tarıyorum, sıra kimde?", GameCore.turn);
        // Tahtayı tara, siyah (b) taşlarını bul
        for (let i = 0; i < 64; i++) {
            if (GameCore.board[i] && GameCore.board[i].startsWith('b')) {
                const moves = GameCore.getPieceMoves(i);
                moves.forEach(target => {
                    allPossibleMoves.push({ from: i, to: target });
                });
            }
        }
     console.log("AI: Bulunan toplam hamle sayısı:", allPossibleMoves.length); // <-- TEST LOGU
        // Eğer hamle varsa birini seç
        if (allPossibleMoves.length > 0) {
            // Şimdilik rastgele seçiyoruz
            const randomIndex = Math.floor(Math.random() * allPossibleMoves.length);
            return allPossibleMoves[randomIndex];
        }

        return null; // Hamle yok (Mat veya Pat durumu)
    }
};