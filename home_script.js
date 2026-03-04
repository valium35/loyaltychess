const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');
let step = 0;

// BAŞLANGIÇ DİZİLİMİ
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

// TAHTAYI ÇİZEN ANA FONKSİYON
function draw() {
    boardElement.innerHTML = ''; 
    
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const row = Math.floor(i / 8);
        const col = i % 8;
        const isBlack = (row + col) % 2 !== 0;
        
        square.className = `square ${isBlack ? 'black' : 'white'}`;
        
        if (layout[i]) {
            const piece = document.createElement('div');
            piece.className = `piece ${layout[i]}`;
            
            // İhanet Efekti: 5. adımda c6 karesindeki (index 18) atı kırmızı yap
            if (step === 5 && i === 18) {
                piece.classList.add('betrayal');
            }
            
            square.appendChild(piece);
        }
        boardElement.appendChild(square);
    }
}

// SENARYO ADIMLARI
const tutorialSteps = [
    { msg: "1. Beyaz piyon e4 karesine çıkar.", run: () => { layout[52]=''; layout[36]='w-p'; } },
    { msg: "2. Siyah At c6 karesine hamle yapar.", run: () => { layout[1]=''; layout[18]='b-n'; } },
    { msg: "3. Beyaz Fil (b5), c6'daki At'ı tehdit eder!", run: () => { layout[61]=''; layout[25]='w-b'; } },
    { msg: "4. Siyah, At'ı korumak yerine h6 piyonunu oynar (İhmal!)", run: () => { layout[15]=''; layout[23]='b-p'; } },
    { msg: "5. İHANET! Sahipsiz kalan At taraf değiştirir!", run: () => { /* Kırmızı Parlama */ } },
    { msg: "6. Hain At, Siyah Vezir'i (d8) alır ve oyundan çıkar!", run: () => { layout[18]=''; layout[3]=''; } }
];
// BUTONA BASILDIĞINDA ÇALIŞAN FONKSİYON
function nextStep() {
    if (step < tutorialSteps.length) {
        tutorialSteps[step].run();
        statusElement.innerText = tutorialSteps[step].msg;
        step++;
        draw();
    } else {
        statusElement.innerText = "LoyaltyChess Kuralları Gösterildi!";
        statusElement.style.background = "#2980b9";
    }
}

// SAYFA İLK AÇILDIĞINDA ÇALIŞTIR
draw();
statusElement.innerText = "Başlamak için 'Sonraki Hamle'ye basın.";
