export const LogSystem = {
    moveCounter: 1,

    init(containerId = 'move-history') {
        this.container = document.getElementById(containerId);
    },

    generateNotation(moveData) {
        if (!moveData?.piece) return "??";

        const pieceMap = {
            p: '',
            n: 'N',
            b: 'B',
            r: 'R',
            q: 'Q',
            k: 'K'
        };

        const [color, type] = moveData.piece.split('-');
        const pChar = pieceMap[type] || '';

        const fromSq = moveData.fromSq;
        const toSq = moveData.toSq;

        // Rok
        if (type === 'k' && Math.abs(moveData.from - moveData.to) === 2) {
            return moveData.to > moveData.from ? "O-O" : "O-O-O";
        }

        // Capture
        if (moveData.captured) {
            if (type === 'p') {
                return fromSq[0] + 'x' + toSq;
            }
            return pChar + 'x' + toSq;
        }

        return pChar + toSq;
    },

    update(moveData) {
        if (!this.container || !moveData) return;

        const notation = this.generateNotation(moveData);
        const isWhite = moveData.color === 'w';

        const rowId = `move-${this.moveCounter}`;
        let row = document.getElementById(rowId);

        if (isWhite) {
            row = document.createElement('div');
            row.id = rowId;
            row.className = 'log-entry';

            row.innerHTML = `
                <span>${this.moveCounter}.</span>
                <span class="white">${notation}</span>
                <span class="black">...</span>
            `;

            this.container.prepend(row);
        } else {
            if (row) {
                const black = row.querySelector('.black');
                if (black) black.innerText = notation;
                this.moveCounter++;
            }
        }
    }
};
