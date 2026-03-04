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
    { 
        msg: "1. Beyaz e4, Siyah b6 ile b-piyonunu açar.", 
        run: () => { 
            layout[52]=''; layout[36]='w-p'; layout[9]=''; layout[17]='b-p'; 
            // Her seferinde eski vurguları temizlemek için bir fonksiyon çağırabiliriz (aşağıda açıklayacağım)
            vurgula(1); 
        }
    },
    { 
        msg: "2. Beyaz d4, Siyah e6 ile e-piyonunu açar.", 
        run: () => { layout[51]=''; layout[35]='w-p'; layout[12]=''; layout[20]='b-p'; vurgula(1); }
    },
    { 
        msg: "3. Siyah d6 sürerek merkez piyonlarını dağıtır.", 
        run: () => { layout[11]=''; layout[19]='b-p'; vurgula(1); }
    },
    { 
        msg: "4. Siyah At c6'ya gelir. (Hala korunmuyor!)", 
        run: () => { layout[1]=''; layout[18]='b-n'; vurgula(1); }
    },
    { 
        msg: "5. Beyaz Fil b5'ten Atı ister. Siyah pas geçer!", 
        run: () => { 
            layout[61]=''; layout[25]='w-b'; layout[15]=''; layout[23]='b-p'; 
            vurgula(1); // "Tehdit edilen taş korunmalı" kuralını vurgula
        }
    },
    { 
        msg: "6. İHANET! Sahipsiz kalan At taraf değiştirir!", 
        run: () => { 
            vurgula(2); // "Korumasız kalan taş ihanet eder" kuralını vurgula
        }
    },
    { 
        msg: "7. Hain At, Siyah Vezir'i (d8) alır ve çıkar!", 
        run: () => { 
            layout[18]=''; layout[3]=''; 
            vurgula(6); // "Hamle sonrası taş oyundan çıkar" kuralını vurgula
        }
    }
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
function vurgula(kuralNo) {
    // Önce tüm kurallardan aktiflik sınıfını kaldır
    for (let i = 1; i <= 7; i++) {
        const el = document.getElementById(`rule-${i}`);
        if (el) el.classList.remove('active-rule');
    }
    // Sadece istediğimiz kuralı parlat
    const activeEl = document.getElementById(`rule-${kuralNo}`);
    if (activeEl) activeEl.classList.add('active-rule');
}

