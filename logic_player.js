// --- OYUN DURUMU ---
let layout = Array(64).fill(''); // Tahta dizilimi
let turn = 'w'; // Sıra kimde? 'w' = Beyaz, 'b' = Siyah
let selectedSquare = null; // Seçili olan karenin indeksi

const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');

// --- BAŞLANGIÇ DİZİLİMİ ---
function initGame() {
    // Standart dizilim (Test için sadeleştirilmiş veya tam dizilim koyabilirsin)
    layout[60] = 'w-k'; layout[4] = 'b-k'; // Şahlar
    layout[56] = 'w-r'; layout[63] = 'w-r'; // Kaleler
    layout[0] = 'b-r'; layout[7] = 'b-r';
    // ... diğer taşları buraya ekleyebilirsin ...
    
    updateStatus();
    draw();
}

// --- TAHTAYI ÇİZZ ---
function draw() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.className = `square ${(Math.floor(i / 8) + (i % 8)) % 2 !== 0 ? 'black' : 'white'}`;
        
        // Seçili kareyi vurgula
        if (selectedSquare === i) square.classList.add('active-law'); // Sarı vurgu için senin sınıfı kullandım

        if (layout[i]) {
            const piece = document.createElement('div');
            piece.className = `piece ${layout[i]}`;
            square.appendChild(piece);
        }

        square.onclick = () => handleSquareClick(i);
        boardElement.appendChild(square);
    }
}

// --- TIKLAMA MANTIĞI ---
function handleSquareClick(i) {
    const piece = layout[i];

    // 1. Durum: Henüz taş seçilmediyse
    if (selectedSquare === null) {
        if (piece && piece.startsWith(turn)) {
            selectedSquare = i;
            draw();
        }
    } 
    // 2. Durum: Taş zaten seçiliyse
    else {
        // Eğer kendi taşına tekrar tıklarsa seçimi iptal et
        if (piece && piece.startsWith(turn)) {
            selectedSquare = i;
        } else {
            // HAMLEYİ YAP
            movePiece(selectedSquare, i);
            selectedSquare = null;
            // SIRA DEĞİŞTİR
            turn = (turn === 'w') ? 'b' : 'w';
        }
        updateStatus();
        draw();
    }
}

function movePiece(from, to) {
    layout[to] = layout[from];
    layout[from] = '';
    
    // BURASI ÖNEMLİ: Hamle sonrası İhanet Yasası kontrolü buraya gelecek!
    // checkBetrayalRules(to); 
}

function updateStatus() {
    statusElement.innerText = `SIRA: ${turn === 'w' ? 'BEYAZDA' : 'SİYAHTA'}`;
    statusElement.style.background = turn === 'w' ? '#f1c40f' : '#333';
    statusElement.style.color = turn === 'w' ? '#000' : '#fff';
}

// Oyunu başlat
initGame();
