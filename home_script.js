const board = document.getElementById('chess-board');
let layout = Array(64).fill('');

// Başlangıç testi için birkaç taş koyalım
layout[52] = 'w-p'; // Beyaz Piyon
layout[1]  = 'b-n'; // Siyah At

function draw() {
    board.innerHTML = '';
    layout.forEach((p, i) => {
        const sq = document.createElement('div');
        const isBlack = (Math.floor(i/8) + (i%8)) % 2 !== 0;
        sq.className = square ${isBlack ? 'black' : 'white'};
        if (p) {
            const piece = document.createElement('div');
            piece.className = piece ${p};
            sq.appendChild(piece);
        }
        board.appendChild(sq);
    });
}

function nextStep() {
    document.getElementById('status').innerText = "Hamle yapıldı!";
    // İleride buraya kurallar gelecek
}

draw();
