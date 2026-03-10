// --- 1. TAHTA AYARLARI VE BAŞLANGIÇ DİZİLİMİ ---
let layout = Array(64).fill('');
const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');

// Standart Dizilim (Senin home_script'teki taş isimlerinle aynı)
const initialSetup = {
    0: 'b-r', 1: 'b-n', 2: 'b-b', 3: 'b-q', 4: 'b-k', 5: 'b-b', 6: 'b-n', 7: 'b-r',
    8: 'b-p', 9: 'b-p', 10: 'b-p', 11: 'b-p', 12: 'b-p', 13: 'b-p', 14: 'b-p', 15: 'b-p',
    48: 'w-p', 49: 'w-p', 50: 'w-p', 51: 'w-p', 52: 'w-p', 53: 'w-p', 54: 'w-p', 55: 'w-p',
    56: 'w-r', 57: 'w-n', 58: 'w-b', 59: 'w-q', 60: 'w-k', 61: 'w-b', 62: 'w-n', 63: 'w-r'
};

// --- 2. OYUN DURUMU (STATE) ---
let turn = 'w'; // 'w' = Beyaz, 'b' = Siyah
let selectedSquare = null;

// --- 3. TAHTAYI OLUŞTUR VE ÇİZ ---
function initGame() {
    // Dizilimi yerleştir
    Object.keys(initialSetup).forEach(index => {
        layout[index] = initialSetup[index];
    });
    updateStatus();
    draw();
}

function draw() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        // Kare renklerini senin CSS'ine göre ayarlar (white/black sınıfları)
        const row = Math.floor(i / 8);
        const col = i % 8;
        square.className = `square ${(row + col) % 2 !== 0 ? 'black' : 'white'}`;
        
        // Tıklama olayını bağla
        square.onclick = () => handleSquareClick(i);

        // Seçili kareye senin "active-law" vurgunu ekleyelim
        if (selectedSquare === i) square.classList.add('active-law');

        if (layout[i]) {
            const piece = document.createElement('div');
            piece.className = `piece ${layout[i]}`;
            square.appendChild(piece);
        }
        boardElement.appendChild(square);
    }
}

// --- 4. HAREKET VE TIKLAMA MANTIĞI ---
function handleSquareClick(i) {
    const piece = layout[i];

    // Henüz seçim yapılmadıysa
    if (selectedSquare === null) {
        if (piece && piece.startsWith(turn)) {
            selectedSquare = i;
            draw();
        }
    } 
    // Taş zaten seçiliyse (Hedef kareye tıklanıyor)
    else {
        // Eğer aynı renkten başka bir taşa tıklarsa seçimi değiştir
        if (piece && piece.startsWith(turn)) {
            selectedSquare = i;
            draw();
        } else {
            // HAMLEYİ GERÇEKLEŞTİR
            executeMove(selectedSquare, i);
            selectedSquare = null;
            
            // Sırayı değiştir
            turn = (turn === 'w') ? 'b' : 'w';
            updateStatus();
            draw();
        }
    }
}

function executeMove(from, to) {
    // Eğer hedefte rakip taş varsa, onu "al" (Capture)
    layout[to] = layout[from];
    layout[from] = '';
    
    // TODO: Buraya İhanet Yasası Kontrolü gelecek!
    // checkLoyaltyRules(to);
}

function updateStatus() {
    const playerText = turn === 'w' ? 'BEYAZ' : 'SİYAH';
    statusElement.innerText = `SIRA: ${playerText} OYUNCUDA`;
    
    // Senin yeşil kutuyu sıraya göre renklendirelim
    statusElement.style.background = turn === 'w' ? '#f1c40f' : '#2c3e50';
    statusElement.style.color = turn === 'w' ? '#000' : '#fff';
}

// Başlat!
initGame();
