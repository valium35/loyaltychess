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
    { msg: "1. Beyaz e4, Siyah b6 oynayarak b-piyonunu açar.", run: () => { 
        layout[52]=''; layout[36]='w-p'; // Beyaz e4
        layout[9]=''; layout[17]='b-p';  // Siyah b6
    }},
    { msg: "2. Beyaz d4, Siyah e6 oynayarak e-piyonunu açar.", run: () => { 
        layout[51]=''; layout[35]='w-p'; // Beyaz d4
        layout[12]=''; layout[20]='b-p'; // Siyah e6
    }},
    { msg: "3. Siyah At c6 karesine gelir. (Korunmuyor!)", run: () => { 
        layout[1]=''; layout[18]='b-n';  // At c6'ya
    }},
    { msg: "4. Beyaz Fil (b5), Atı tehdit eder. Siyah pasif kalır!", run: () => { 
        layout[61]=''; layout[25]='w-b'; // Fil b5'e
        layout[15]=''; layout[23]='b-p'; // Alakasız hamle h6
    }},
    { msg: "5. İHANET! At artık rakibin kontrolünde!", run: () => { 
        // Efekt i=18 için draw fonksiyonunda tetikleniyor
    }},
    { msg: "6. Hain At, Siyah Vezir'i (d8) alır ve çıkar!", run: () => { 
        layout[18]=''; layout[3]=''; 
    }}
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
