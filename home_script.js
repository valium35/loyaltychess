const board = document.getElementById('chess-board');
const nextBtn = document.getElementById('next-btn');
const statusText = document.getElementById('status');
let currentStep = 0;

// Taş kodları ve CSS sınıfları eşleşmesi
const piecesToClass = {
    'r': 'b-r', 'n': 'b-n', 'b': 'b-b', 'q': 'b-q', 'k': 'b-k', 'p': 'b-p',
    'R': 'w-r', 'N': 'w-n', 'B': 'w-b', 'Q': 'w-q', 'K': 'w-k', 'P': 'w-p'
};

// Standart Dizilim
let layout = [
    'r','n','b','q','k','b','n','r',
    'p','p','p','p','p','p','p','p',
    '','','','','','','','',
    '','','','','','','','',
    '','','','','','','','',
    '','','','','','','','',
    'P','P','P','P','P','P','P','P',
    'R','N','B','Q','K','B','N','R'
];

// Tahtayı Çizme Fonksiyonu
function drawBoard() {
    board.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const row = Math.floor(i / 8);
        const col = i % 8;
        square.className = square ${(row + col) % 2 === 0 ? 'white' : 'black'};
        
        if (layout[i]) {
            const pieceDiv = document.createElement('div');
            pieceDiv.className = piece ${piecesToClass[layout[i]]};
            square.appendChild(pieceDiv);
        }
        board.appendChild(square);
    }
}

// "Next Step" Butonu İşlemleri (Örnek Mantık)
nextBtn.addEventListener('click', () => {
    // Burada daha önce konuştuğumuz tutorial hamlelerini işletebiliriz
    statusText.innerText = "Hamle yapılıyor...";
    // ... Senaryo kodları buraya gelecek
    drawBoard();
});

// Oyunu Başlat
drawBoard();
