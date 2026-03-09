// ==========================================
// 1. DİL SÖZLÜĞÜ VE YAPILANDIRMA
// ==========================================
const translations = {
    tr: {
        status: "Başlamak için butona basın.",
        nextBtn: "Sonraki Hamle",
        backBtn: "Geri",
        resetBtn: "Başa Dön",
        rulesTitle: "📜 İhanet Yasaları",
        rules: [
            "1. Tehdit edilen taş ya korunmalı ya da yer değiştirmelidir.",
            "2. Aksi halde rakip oyuncu, devam eden ilk hamlede bu taşı kullanabilir. Bu taş ihanet etmiştir.",
            "3. İhanet eden taş kendi taşlarından alabilir ama şah çekemez veya mat edemez.",
            "4. Hamle sonunda taş oyundan çıkarılır.",
            "5. İhanet rakibin inisiyatifindedir; zorunlu değil, isteğe bağlıdır.",
            "6. İhanet gerçekleşmezse, taş oyuna kendi pozisyonunda devam eder.",
            "7. Rakip oyuncu ihanet gerçekleştirip taş almasa dahi, ihanet taşı oyundan çıkarılır.",
            "8. Şah çekilen çatal (fork) durumlarında ihanet kuralı geçersizdir.",
            "9. Bu kurallar Kale, Fil ve At için geçerlidir. Vezir ve Piyon ihanet etmez."
        ],
        popups: {
            step5Title: "⚠️ DİKKAT",
            step5Msg: "Siyah At korumasız kaldı! İhanet riski var.",
            step6Title: "🔥 İHANET",
            step6Msg: "Siyah At taraf değiştirdi!",
            step7Title: "⚖️ CEZALANDIRILDI",
            step7Msg: "Görev tamamlandı! Hain At ve kurbanı Vezir oyundan çıkarıldı."
        }
    },
    en: {
        status: "Press the button to start.",
        nextBtn: "Next Move",
        backBtn: "Back",
        resetBtn: "Reset",
        rulesTitle: "📜 Betrayal Laws",
        rules: [
            "1. A threatened piece must either be protected or moved.",
            "2. Otherwise, the opponent may use this piece in their next move.",
            "3. A traitor piece can capture its original allies but cannot deliver a check/mate.",
            "4. At the end of the move, the traitor piece is removed from the board.",
            "5. Betrayal is at the opponent's discretion; it is optional.",
            "6. If betrayal is not exercised, the piece continues in its original position.",
            "7. Even if no piece is captured, the traitor piece is still removed.",
            "8. Betrayal rules do not apply in check/fork situations.",
            "9. Only Rooks, Bishops, and Knights can betray. Queens/Pawns never do."
        ],
        popups: {
            step5Title: "⚠️ WARNING",
            step5Msg: "The Black Knight is unprotected! Risk of betrayal.",
            step6Title: "🔥 BETRAYAL",
            step6Msg: "The Black Knight has switched sides!",
            step7Title: "⚖️ PUNISHED",
            step7Msg: "Mission complete! The traitor Knight and the Queen are removed."
        }
    }
};

// ==========================================
// 2. TEMEL DEĞİŞKENLER VE TAHTA DİZİLİMİ
// ==========================================
const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');
let step = 0;
let timeouts = []; // Çalışan zamanlayıcıları temizlemek için

let layout = []; // Başlangıçta boş, resetBoard ile dolacak

// ==========================================
// 3. ÇEKİRDEK FONKSİYONLAR
// ==========================================

function resetBoard() {
    step = 0;
    // Zamanlayıcıları temizle (Vezir'in kaybolmasını önler)
    timeouts.forEach(t => clearTimeout(t));
    timeouts = [];

    layout = [
        'b-r','b-n','b-b','b-q','b-k','b-b','b-n','b-r',
        'b-p','b-p','b-p','b-p','b-p','b-p','b-p','b-p',
        '','','','','','','','',
        '','','','','','','','',
        '','','','','','','','',
        '','','','','','','','',
        'w-p','w-p','w-p','w-p','w-p','w-p','w-p','w-p',
        'w-r','w-n','w-b','w-q','w-k','w-b','w-n','w-r'
    ];
    vurgula(0);
}

function applyLanguage(lang) {
    const t = translations[lang];
    statusElement.innerText = t.status;
    
    // Panel Başlığı
    document.querySelector('.full-rules-panel h3').innerText = t.rulesTitle;
    
    // Kurallar Listesi
    const rulesList = document.getElementById('rules-list');
    rulesList.innerHTML = ""; 
    t.rules.forEach((rule, index) => {
        const li = document.createElement('li');
        li.id = `rule-${index + 1}`;
        li.innerText = rule;
        rulesList.appendChild(li);
    });
    updateButtonStates();
}

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
            // 6. Adımda atı parlat
            if (step === 6 && i === 18) piece.classList.add('betrayal');
            square.appendChild(piece);
        }
        boardElement.appendChild(square);
    }
}

function vurgula(kuralNo) {
    for (let i = 1; i <= 9; i++) {
        const el = document.getElementById(`rule-${i}`);
        if (el) el.classList.remove('active-rule');
    }
    const activeEl = document.getElementById(`rule-${kuralNo}`);
    if (activeEl) activeEl.classList.add('active-rule');
}

// ==========================================
// 4. EĞİTİM ADIMLARI
// ==========================================
const tutorialSteps = [
    { msg: "1. Beyaz e4, Siyah b6.", run: () => { layout[52]=''; layout[36]='w-p'; layout[9]=''; layout[17]='b-p'; vurgula(1); } },
    { msg: "2. Beyaz d4, Siyah e6.", run: () => { layout[51]=''; layout[35]='w-p'; layout[12]=''; layout[20]='b-p'; vurgula(1); } },
    { msg: "3. Siyah d6 sürer.", run: () => { layout[11]=''; layout[19]='b-p'; vurgula(1); } },
    { msg: "4. Siyah At c6'ya gelir.", run: () => { layout[1]=''; layout[18]='b-n'; vurgula(1); } },
    { 
        msg: "5. Beyaz Fil b5'te. At tehlikede!", 
        run: () => { 
            layout[61]=''; layout[25]='w-b'; vurgula(1);
            pop(5, 0, "#f1c40f");
        }
    },
    { 
        msg: "6. İHANET! At taraf değiştirir!", 
        run: () => { 
            vurgula(2);
            pop(6, 1, "#ff3333");
        }
    },
    { 
        msg: "7. Hain At, Siyah Vezir'i (d8) alır ve çıkar!", 
        run: () => { 
            layout[18]=''; layout[3]='w-n'; draw();
            const capturedPiece = boardElement.children[3].querySelector('.piece');
            if (capturedPiece) capturedPiece.classList.add('piece-capture');

            vurgula(7);
            pop(7, 6, "#ffffff");

            const tId = setTimeout(() => { layout[3]=''; draw(); }, 1200);
            timeouts.push(tId);
        }
    }
];

// Pop-up Yardımcısı
function pop(stepNo, ruleIdx, color) {
    const lang = localStorage.getItem('gameLang') || 'tr';
    const p = translations[lang].popups[`step${stepNo}Title`];
    const m = translations[lang].popups[`step${stepNo}Msg`];
    const r = translations[lang].rules[ruleIdx];
    showPop(p, m, r, color);
}

// ==========================================
// 5. KONTROLLER
// ==========================================

function nextStep() {
    if (step < tutorialSteps.length) {
        tutorialSteps[step].run();
        statusElement.innerText = tutorialSteps[step].msg;
        step++;
        draw();
    } else {
        resetBoard();
        const lang = localStorage.getItem('gameLang') || 'tr';
        statusElement.innerText = translations[lang].status;
        draw();
    }
    updateButtonStates();
}

function prevStep() {
    if (step > 0) {
        step--;
        resetBoard();
        const currentStep = step; // Hedef adımı sakla
        for (let i = 0; i < currentStep; i++) {
            tutorialSteps[i].run();
        }
        step = currentStep; // Adımı geri yükle
        statusElement.innerText = step === 0 ? translations[localStorage.getItem('gameLang') || 'tr'].status : tutorialSteps[step - 1].msg;
        draw();
        updateButtonStates();
    }
}

function updateButtonStates() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if(prevBtn) {
        prevBtn.innerText = translations[lang].backBtn;
        prevBtn.disabled = (step === 0);
    }
    if(nextBtn) {
        nextBtn.innerText = (step >= tutorialSteps.length) ? translations[lang].resetBtn : translations[lang].nextBtn;
    }
}

function showPop(title, msg, rule, color) {
    const popup = document.getElementById('betrayal-popup');
    if(!popup) return;
    document.querySelector('.alert-title').innerText = title;
    document.getElementById('popup-msg').innerText = msg;
    document.getElementById('popup-rule').innerText = rule;
    document.querySelector('.popup-content').style.borderColor = color;
    popup.style.display = 'flex';
}

function closePopup() {
    document.getElementById('betrayal-popup').style.display = 'none';
}

// BAŞLAT
document.addEventListener("DOMContentLoaded", () => {
    resetBoard();
    applyLanguage(localStorage.getItem('gameLang') || 'tr');
    draw();
});
