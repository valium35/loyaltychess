// TAHTA DİZİLİMİ (Küçük Harfler Siyah, Büyük Harfler Beyaz)
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

// EĞİTİM ADIMLARI
const tutorialMoves = [
    { msg: "1. Beyaz piyon e4 karesine çıkar.", run: () => { layout[52]=''; layout[36]='w-p'; } },
    { msg: "2. Siyah At a6 karesine hamle yapar.", run: () => { layout[1]=''; layout[16]='b-n'; } },
    { msg: "3. Beyaz Fil, Siyah At'ı tehdit eder!", run: () => { layout[61]=''; layout[25]='w-b'; } },
    { msg: "4. Siyah, At'ı korumaz veya kaçmaz! (İhanet Riski!)", run: () => { layout[15]=''; layout[23]='b-p'; } },
    { msg: "5. İHANET! At artık rakibin kontrolünde! (Kırmızı Parlama)", run: () => { /* İhanet efekti draw'da ekleniyor */ } },
    { msg: "6. İhanet eden At, Siyah Vezir'i alır ve tahtadan çıkar!", run: () => { layout[16]=''; layout[3]=''; } }
];

function draw() {
    board.innerHTML = '';
    layout.forEach((p, i) => {
        const sq = document.createElement('div');
        const isBlack = (Math.floor(i/8) + (i%8)) % 2 !== 0;
        sq.className = square ${isBlack ? 'black' : 'white'};
        
        if (p) {
            const pieceDiv = document.createElement('div');
            pieceDiv.className = piece ${p};
            // Adım 5'te At'a ihanet efekti ver
            if (step === 5 && i === 16) pieceDiv.classList.add('betrayal');
            sq.appendChild(pieceDiv);
        }
        board.appendChild(sq);
    });
}

function nextStep() {
    if (step < tutorialMoves.length) {
        statusText.innerText = tutorialMoves[step].msg;
        tutorialMoves[step].run();
        step++;
        draw();
    } else {
        statusText.innerText = "Eğitim Tamamlandı!";
        alert("LoyaltyChess Temel Kurallarını Öğrendiniz.");
    }
}

// İlk çizim
draw();
statusText.innerText = "Eğitimi başlatmak için 'Sonraki Hamle'ye basın.";
