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
initGame();// Koordinatları indekse çevirir (Örn: 0,0 -> 0; 1,0 -> 8)
function getIndex(row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return row * 8 + col;
}

// İndeksi koordinata çevirir (Örn: 9 -> {row: 1, col: 1})
function getCoords(index) {
    return { row: Math.floor(index / 8), col: index % 8 };
}function getValidMoves(index) {
    const piece = layout[index];
    if (!piece) return [];
    
    const color = piece[0]; // 'w' veya 'b'
    const type = piece[2];  // 'r', 'n', 'b', 'q', 'k', 'p'
    const { row, col } = getCoords(index);
    let moves = [];

    // --- KALE (Düz Gider) ---
    if (type === 'r' || type === 'q') {
        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        directions.forEach(d => {
            for (let i = 1; i < 8; i++) {
                const r = row + d[0] * i;
                const c = col + d[1] * i;
                const target = getIndex(r, c);
                if (target === null) break;

                if (!layout[target]) {
                    moves.push(target); // Boş kare
                } else {
                    if (layout[target][0] !== color) moves.push(target); // Rakibi ye
                    break; // Yol kapandı
                }
            }
        });
    }

    // --- FİL (Çapraz Gider) ---
    if (type === 'b' || type === 'q') {
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        directions.forEach(d => {
            for (let i = 1; i < 8; i++) {
                const r = row + d[0] * i;
                const c = col + d[1] * i;
                const target = getIndex(r, c);
                if (target === null) break;

                if (!layout[target]) {
                    moves.push(target);
                } else {
                    if (layout[target][0] !== color) moves.push(target);
                    break;
                }
            }
        });
    }// --- AT (L Şeklinde Zıplar) ---
    if (type === 'n') {
        const nMoves = [
            [2, 1], [2, -1], [-2, 1], [-2, -1],
            [1, 2], [1, -2], [-1, 2], [-1, -2]
        ];
        nMoves.forEach(m => {
            const r = row + m[0];
            const c = col + m[1];
            const target = getIndex(r, c);
            if (target !== null) {
                if (!layout[target] || layout[target][0] !== color) {
                    moves.push(target);
                }
            }
        });
    }

    // --- PİYON (En Zorlu Hakemlik) ---
    if (type === 'p') {
        const direction = (color === 'w') ? -1 : 1; // Beyaz yukarı (-1), Siyah aşağı (+1)
        const startRow = (color === 'w') ? 6 : 1;

        // 1. Düz İlerleme
        const oneStep = getIndex(row + direction, col);
        if (oneStep !== null && !layout[oneStep]) {
            moves.push(oneStep);
            // İlk hamlede 2 adım
            const twoStep = getIndex(row + 2 * direction, col);
            if (row === startRow && !layout[twoStep]) {
                moves.push(twoStep);
            }
        }

        // 2. Rakip Alma (Çapraz)
        const captures = [getIndex(row + direction, col - 1), getIndex(row + direction, col + 1)];
        captures.forEach(target => {
            if (target !== null && layout[target] && layout[target][0] !== color) {
                // Burada sütun kontrolü de yapıyoruz (Tahtanın dışına taşmasın)
                const targetCol = target % 8;
                if (Math.abs(targetCol - col) === 1) moves.push(target);
            }
        });
    }

    // --- ŞAH (Her yöne 1 adım) ---
    if (type === 'k') {
        const kMoves = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        kMoves.forEach(m => {
            const r = row + m[0];
            const c = col + m[1];
            const target = getIndex(r, c);
            if (target !== null) {
                if (!layout[target] || layout[target][0] !== color) {
                    // İLERİDE: Buraya "Gidilecek yer rakip saldırısı altında mı?" kontrolü gelecek
                    moves.push(target);
                }
            }
        });
    }

    return moves;
}function handleSquareClick(i) {
    const piece = layout[i];

    if (selectedSquare === null) {
        if (piece && piece.startsWith(turn)) {
            selectedSquare = i;
            // Gidebileceği yerleri görsel olarak gösterelim mi?
            const possibleMoves = getValidMoves(i);
            draw(possibleMoves); 
        }
    } else {
        const validMoves = getValidMoves(selectedSquare);
        
        if (validMoves.includes(i)) {
            executeMove(selectedSquare, i);
            selectedSquare = null;
            turn = (turn === 'w') ? 'b' : 'w';
        } else if (piece && piece.startsWith(turn)) {
            selectedSquare = i; // Başka bir kendi taşına tıkladıysa onu seç
        } else {
            selectedSquare = null; // Geçersiz yere tıkladıysa seçimi iptal et
        }
        updateStatus();
        draw();
    }
}
