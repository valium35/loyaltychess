export const BetrayalJudge = {

    betrayableTypes: ['n', 'b', 'r'],

    getServantColor(core, idx) {
        const piece = core.board[idx];
        if (!piece) return null;

        const [originalColor] = piece.split('-');
        const betrayal = core.activeBetrayals.find(b => b.sq === idx);

        return betrayal ? betrayal.target : originalColor;
    },

    getSquareStatus(core, idx) {
        // 🛡️ safety
        if (!core || idx === null || idx === undefined || idx < 0 || idx > 63) return 0;

        const piece = core.board[idx];
        if (!piece) return 0;

        const [color, type] = piece.split('-');

        // sadece ihanet edebilir taşlar
        if (!this.betrayableTypes.includes(type)) return 0;

        // şah altındaysa ihanet yok
        if (core.isCheck(color)) return 0;

        const opponent = (color === 'w' ? 'b' : 'w');

        // saldırı yoksa
        const isAttacked = core.isSquareAttacked(idx, opponent, core.board, true);
        if (!isAttacked) return 0;

        // koruma varsa sadece uyarı (mavi)
        const isProtected = core.isSquareAttacked(idx, color, core.board, true);

        const threatStartedAtMove =
            (core.threatHistory && core.threatHistory[idx] !== null)
                ? core.threatHistory[idx]
                : null;

        // 🟦 her zaman korunuyorsa ihanet yok
        if (isProtected) return 1;

        // 🔴 gecikmeli ihanet kuralı
        if (threatStartedAtMove !== null) {

            const hasOwnerMissedHisChance =
                threatStartedAtMove < core.history.length;

            const isNotOwnersTurn =
                core.turn !== color;

            if (hasOwnerMissedHisChance && isNotOwnersTurn) {
                return 2;
            }
        }

        // default: mavi (risk var ama henüz ihanet yok)
        return 1;
    }
};