// core/tactics_engine.js
export const TacticsEngine = {
    // Bir karenin belirli bir renk tarafından korunup korunmadığını söyler
    isSquareProtected(board, targetSquare, defenderColor) {
        const attackerPieces = board.getAllPieces(defenderColor);
        
        for (const piece of attackerPieces) {
            // Şah çekme kuralına bakmadan, taşın "bakış" menzilini alırız
            const coverage = piece.getAttackRange(board); 
            if (coverage.includes(targetSquare)) {
                return true; 
            }
        }
        return false;
    }
};