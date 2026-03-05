const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');
let step = 0;

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
            // İhanet vurgusunu 6. adımda tetikle
            if (step === 6 && i === 18) piece.classList.add('betrayal');
            square.appendChild(piece);
        }
        boardElement.appendChild(square);
    }
}

function vurgula(kuralNo) {
    for (let i = 1; i <= 7; i++) {
        const el = document.getElementById(`rule-${i}`);
        if (el) el.classList.remove('active-rule');
    }
    const activeEl = document.getElementById(`rule-${kuralNo}`);
    if (activeEl) activeEl.classList.add('active-rule');
}

// DİZİDEKİ TÜM ADIMLARI TEK TEK SIRALADIM
const tutorialSteps = [
    { 
        msg: "1. Beyaz e4, Siyah b6 ile b-piyonunu açar.", 
        run: () => { 
            layout[52]=''; layout[36]='w-p'; layout[9]=''; layout[17]='b-p'; 
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
        msg: "4. Siyah At c6'ya gelir.", 
        run: () => { layout[1]=''; layout[18]='b-n'; vurgula(1); }
    },
    { 
        msg: "5. Beyaz Fil b5'te. At tehlikede!", 
        run: () => { 
            layout[61]=''; layout[25]='w-b'; 
            vurgula(1);
            showPop("⚠️ DİKKAT", "Siyah At korumasız kaldı! İhanet riski var.", "Kural 1: Tehdit edilen taş korunmalıdır.", "#f1c40f");
        }
    },
    { 
        msg: "6. İHANET! Sahipsiz kalan At taraf değiştirir!", 
        run: () => { 
            vurgula(2);
            showPop("🔥 İHANET", "Siyah At taraf değiştirdi!", "Kural 2 & 3: Korumasız taş rakibe geçer.", "#ff3333");
        }
    },
    { 
        msg: "7. Hain At, Siyah Vezir'i (d8) alır ve çıkar!", 
        run: () => { 
            layout[18]=''; layout[3]=''; 
            vurgula(6);
            showPop("⚖️ CEZALANDIRILDI", "Hain taş görevini yaptı ve oyundan çıkarıldı.", "Kural 6: İhanet hamlesi sonrası taş çıkarılır.", "#ffffff");
        }
    }
];

function nextStep() {
    if (step < tutorialSteps.length) {
        // ÖNCE işlemi yap
        tutorialSteps[step].run();
        // SONRA mesajı güncelle
        statusElement.innerText = tutorialSteps[step].msg;
        // ADIMI artır
        step++;
        // TAHTAYI yeniden çiz
        draw();
    } else {
        statusElement.innerText = "Eğitim Tamamlandı!";
        vurgula(0);
    }
}

draw();
