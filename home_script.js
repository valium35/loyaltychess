// ==========================================
// 1. DİL SÖZLÜĞÜ VE YENİ 3 YASA YAPISI
// ==========================================
const translations = {
    tr: {
        status: "Başlamak için butona basın.",
        nextBtn: "Sonraki Hamle",
        backBtn: "Geri",
        resetBtn: "Başa Dön",
        rulesTitle: "📜 İhanet Yasaları (The 3 Laws)",
        rules: [
            "1. AKTİF TEHDİT: İhanet sadece taze tehditlerde tetiklenir. Kendi hamlenle yaptığın fedalar ihanet içermez.",
            "2. SEÇİM HAKKI: At, Kale ve Fil ihanet edebilir. Vezir ve Piyonlar her zaman sadıktır.",
            "3. SON GÖREV: İhanet eden taş şah çekemez. Hamle sonrası tahtadan sonsuza dek silinir."
        ],
        popups: {
            step4Title: "🛡️ AKTİF FEDA",
            step4Msg: "Siyah At'ı bilerek feda ettin. Bu bir 'Aktif Feda'dır, taşın İHANET EDEMEZ.",
            step5Title: "⚠️ TAZE TEHDİT",
            step5Msg: "Beyaz Fil, Atı tehdit etti! Atı korumazsan ihanet tetiklenecek.",
            step6Title: "🔥 İHANET",
            step6Msg: "At terk edildi ve saf değiştirdi!",
            step7Title: "💨 SİLİNME",
            step7Msg: "İhanet hamlesi bitti. Hain At görevini tamamladı ve tahtadan çıktı."
        },
        tutorialMsgs: [
            "1. Oyun başlıyor: Beyaz e4, Siyah e5.",
            "2. Beyaz At f3, Siyah At c6. Standart açılış.",
            "3. Beyaz Fil b5 (Ruy Lopez). Siyah At tehdit altında değil, feda hazırlığı.",
            "4. AKTİF FEDA: Siyah At'ı d4'e sürdün. Rakip menzilinde ama ihanet yok (Kural 1).",
            "5. TAZE TEHDİT: Beyaz c3 sürerek Atı taze bir hamleyle tehdit etti! At tehlikede.",
            "6. İHANET: Atı korumadın! At taraf değiştirdi ve Siyah Veziri hedef aldı.",
            "7. SON: Hain At, Veziri aldı ve yasalar gereği tahtadan silindi."
        ]
    },
    en: {
        status: "Press the button to start.",
        nextBtn: "Next Move",
        backBtn: "Back",
        resetBtn: "Reset",
        rulesTitle: "📜 The 3 Laws of Betrayal",
        rules: [
            "1. ACTIVE THREAT: Betrayal only triggers on fresh threats. Active sacrifices are immune.",
            "2. THE CHOICE: Knights, Rooks, and Bishops can betray. Queens and Pawns are always loyal.",
            "3. FINAL MISSION: Traitors cannot check. They are removed from the board after the move."
        ],
        popups: {
            step4Title: "🛡️ ACTIVE SACRIFICE",
            step4Msg: "You sacrificed the Knight. This is an 'Active Sacrifice', it CANNOT betray.",
            step5Title: "⚠️ FRESH THREAT",
            step5Msg: "White Bishop threatens the Knight! Protect it or it will betray you.",
            step6Title: "🔥 BETRAYAL",
            step6Msg: "The Knight was abandoned and switched sides!",
            step7Title: "💨 REMOVAL",
            step7Msg: "Mission complete. The traitor has been removed from the board."
        },
        tutorialMsgs: [
            "1. Game Starts: White e4, Black e5.",
            "2. White Nf3, Black Nc6. Standard opening.",
            "3. White Bb5. The Knight is safe for now, preparing a sacrifice.",
            "4. ACTIVE SAC: You moved the Knight to d4. It's in range but won't betray (Law 1).",
            "5. FRESH THREAT: White plays c3, threatening the Knight! Danger is real.",
            "6. BETRAYAL: You didn't protect the Knight! It switched sides to attack the Queen.",
            "7. END: The traitor took the Queen and was removed per the laws."
        ]
    }
};

// ==========================================
// 2. TEMEL DEĞİŞKENLER
// ==========================================
const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');
let step = 0;
let timeouts = []; 
let layout = []; 

function resetBoard() {
    step = 0;
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

// ==========================================
// 3. ÇEKİRDEK FONKSİYONLAR
// ==========================================
function applyLanguage(lang) {
    const t = translations[lang];
    statusElement.innerText = t.status;
    document.querySelector('.full-rules-panel h3').innerText = t.rulesTitle;
    
    // Paneldeki 3 Yasa Açıklamalarını Güncelle
    document.getElementById('rule-1-desc').innerText = t.rules[0];
    document.getElementById('rule-2-desc').innerText = t.rules[1];
    document.getElementById('rule-3-desc').innerText = t.rules[2];
    
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
            // İhanet anında parlatma efekti
            if (step === 6 && i === 27) piece.classList.add('betrayal');
            square.appendChild(piece);
        }
        boardElement.appendChild(square);
    }
}

function vurgula(kuralNo) {
    // Görsel paneli daha sade yaptığımız için burada sadece aktif maddeyi parlatıyoruz
    const items = document.querySelectorAll('.law-item');
    items.forEach((item, idx) => {
        item.style.opacity = (idx + 1 === kuralNo) ? "1" : "0.5";
        item.style.borderLeft = (idx + 1 === kuralNo) ? "3px solid #f1c40f" : "none";
    });
}

// ==========================================
// 4. YENİ EĞİTİM ADIMLARI (SCENARIO)
// ==========================================
const tutorialSteps = [
    { run: () => { layout[52]=''; layout[36]='w-p'; layout[12]=''; layout[28]='b-p'; vurgula(0); } }, // 1. e4 e5
    { run: () => { layout[62]=''; layout[45]='w-n'; layout[1]=''; layout[18]='b-n'; vurgula(0); } },  // 2. Nf3 Nc6
    { run: () => { layout[61]=''; layout[25]='w-b'; vurgula(1); } },                                 // 3. Bb5 (Hazırlık)
    { 
        run: () => { 
            layout[18]=''; layout[27]='b-n'; // Siyah At d4'e zıplar (Aktif Feda)
            vurgula(1);
            pop(4, 0, "#3498db"); // Mavi - Bilgi/Feda
        } 
    },
    { 
        run: () => { 
            layout[50]=''; layout[42]='w-p'; // Beyaz c3 sürer (Taze Tehdit)
            vurgula(1);
            pop(5, 0, "#f1c40f"); // Sarı - Uyarı
        } 
    },
    { 
        run: () => { 
            vurgula(2);
            pop(6, 1, "#ff3333"); // Kırmızı - İHANET
        } 
    },
    { 
        run: () => { 
            layout[27]=''; layout[3]='w-n'; draw(); // At Veziri alır (d8)
            const capturedPiece = boardElement.children[3].querySelector('.piece');
            if (capturedPiece) capturedPiece.classList.add('piece-capture');
            vurgula(3);
            pop(7, 2, "#ffffff");
            const tId = setTimeout(() => { layout[3]=''; draw(); }, 1500);
            timeouts.push(tId);
        } 
    }
];

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
    const lang = localStorage.getItem('gameLang') || 'tr';
    if (step < tutorialSteps.length) {
        tutorialSteps[step].run();
        statusElement.innerText = translations[lang].tutorialMsgs[step];
        step++;
        draw();
    } else {
        resetBoard();
        statusElement.innerText = translations[lang].status;
        draw();
    }
    updateButtonStates();
}

function prevStep() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    if (step > 0) {
        step--;
        const targetStep = step; 
        resetBoard(); 
        for (let i = 0; i < targetStep; i++) {
            tutorialSteps[i].run();
        }
        step = targetStep; 
        statusElement.innerText = (step === 0) ? translations[lang].status : translations[lang].tutorialMsgs[step - 1];
        draw();
        updateButtonStates();
    }
}

function updateButtonStates() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if(prevBtn) {
        prevBtn.innerText = (lang === 'tr' ? 'Geri' : 'Back');
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

document.addEventListener("DOMContentLoaded", () => {
    resetBoard();
    const currentLang = localStorage.getItem('gameLang') || 'tr';
    applyLanguage(currentLang);
    draw();
});
