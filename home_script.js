const board = document.getElementById('chess-board');
const statusText = document.getElementById('status');
let step = 0;

// TAHTA DİZİLİMİ - (Küçük harfler: siyah, Büyük harfler: beyaz)
let layout = [
    'b-r','b-n','b-b','b-q','b-k','b-b','b-n','b-r',
    'b-p','b-p','b-p','b-p','b-p','b-p','b-p','b-p',
    '','','','','','','','',
    '','','','','','','','',
    '','','','','','','','',
    '','','','','','','','',
    'w-p','w-p','w-p','w-p','w-p','w-p','w-p','w-p',
    'w-r','w-n','w-b','w-q','w-k','w-b','w-n','w-r'
];

function draw() {
    // Önce tahtayı temizle (Test yazısını siler)
    board.innerHTML = '';
    
    for (let i = 0; i < 64; i++) {
        const sq = document.createElement('div');
        const row = Math.floor(i / 8);
        const col = i % 8;
        
        // Kare renklerini belirle
        const isBlack = (row + col) % 2 !== 0;
        sq.className = square ${isBlack ? 'black' : 'white'};
        
        // Eğer o karede bir taş varsa ekle
        if (layout[i] !== '') {
            const pieceDiv = document.createElement('div');
            // CSS'teki .w-p, .b-n gibi sınıfları kullanır
            pieceDiv.className = piece ${layout[i]};
            
            // İhanet Efekti (Adım 5'te At'a ekle)
            if (step === 5 && i === 16) pieceDiv.classList.add('betrayal');
            
            sq.appendChild(pieceDiv);
        }
        board.appendChild(sq);
    }
}

// EĞİTİM HAMLELERİ
const tutorialMoves = [
    { msg: "1. Beyaz piyon e4 karesine çıkar.", run: () => { layout[52]=''; layout[36]='w-p'; } },
    { msg: "2. Siyah At a6 karesine hamle yapar.", run: () => { layout[1]=''; layout[16]='b-n'; } },
    { msg: "3. Beyaz Fil, Siyah At'ı tehdit eder!", run: () => { layout[61]=''; layout[25]='w-b'; } },
    { msg: "4. Siyah, At'ı korumaz veya kaçmaz! (İhanet Riski!)", run: () => { layout[15]=''; layout[23]='b-p'; } },
    { msg: "5. İHANET! At artık rakibin kontrolünde!", run: () => { /* Efekt draw'da */ } },
    { msg: "6. İhanet eden At, Siyah Vezir'i alır ve oyundan çıkar!", run: () => { layout[16]=''; layout[3]=''; } }
];

function nextStep() {
    if (step < tutorialMoves.length) {
        statusText.innerText = tutorialMoves[step].msg;
        tutorialMoves[step].run();
        step++;
        draw();
    } else {
        statusText.innerText = "Eğitim Tamamlandı!";
    }
}

// Sayfa açıldığında tahtayı çiz
draw();
statusText.innerText = "Eğitimi başlatmak için 'Sonraki Hamle'ye basın.";
