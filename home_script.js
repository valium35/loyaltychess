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
            step3Title: "🛡️ AKTİF FEDA",
            step3Msg: "Siyah At'ı f4 piyonunun menziline (c6) kendin getirdin. Bu bir feda hamlesidir, İHANET tetiklenmez.",
            step5Title: "⚠️ TAZE TEHDİT",
            step5Msg: "Beyaz Fil b5'e gelerek At'ı doğrudan tehdit etti! At şu an korumasız.",
            step6Title: "🔥 İHANET!",
            step6Msg: "At korumasız bırakıldı! Rakip Fil b4'teki At'ı vurmak yerine, c6'daki At'ı İHANET ettiriyor!",
            step7Title: "⚔️ İNTİKAM",
            step7Msg: "Hain At, b4'teki kendi Filini aldı! Görev bitti ve At tahtadan silindi."
        },
        tutorialMsgs: [
            "1. Beyaz e4, Siyah e5. Merkez mücadelesi başlıyor.",
            "2. Beyaz f4 (Şah Gambiti tarzı), Siyah d6 ile karşılık veriyor.",
            "3. Beyaz At f3, Siyah At c6. (At f4 piyonu menzilinde ama Aktif Feda olduğu için güvende).",
            "4. Beyaz g3 sürerken, Siyah b6 ile fil yolu açıyor.",
            "5. TAZE TEHDİT: Beyaz Fil b5'e geldi! At c6'da doğrudan saldırı altında!",
            "6. İHANET SEÇİMİ: Siyah, Atı korumak yerine Fil b4 yaptı. At artık rakibin kontrolünde!",
            "7. SON HAMLE: Hain At, b4'teki Siyah Fil'i aldı ve her iki taş da tahtadan çıktı."
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
            step3Title: "🛡️ ACTIVE SACRIFICE",
            step3Msg: "You moved the Knight to c6 yourself. This is a sacrifice, NOT a betrayal.",
            step5Title: "⚠️ FRESH THREAT",
            step5Msg: "White Bishop moved to b5! The Knight is now under threat.",
            step6Title: "🔥 BETRAYAL",
            step6Msg: "The Knight was abandoned! Opponent is using your Knight to betray you.",
            step7Title: "💨 REMOVAL",
            step7Msg: "The traitor took the Bishop and both are removed from the board."
        },
        tutorialMsgs: [
            "1. White e4, Black e5.",
            "2. White f4, Black d6.",
            "3. White Nf3, Black Nc6. (Active Sacrifice, no betrayal).",
            "4. White g3, Black b6.",
            "5. FRESH THREAT: White Bishop to b5!",
            "6. BETRAYAL: Black played Bishop b4, leaving the Knight unprotected.",
            "7. FINAL: The traitor Knight took the Bishop on b4 and vanished."
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
            // İhanet anında (adım 6) c6 karesindeki (indeks 18) atı parlat
            if (step === 6 && i === 18) piece.classList.add('betrayal');
            square.appendChild(piece);
        }
        boardElement.appendChild(square);
    }
}

function vurgula(kuralNo) {
    const items = document.querySelectorAll('.law-item');
    items.forEach((item, idx) => {
        if (kuralNo === 0) {
            item.style.opacity = "1";
            item.classList.remove('active-law');
        } else {
            item.style.opacity = (idx + 1 === kuralNo) ? "1" : "0.3";
            if (idx + 1 === kuralNo) item.classList.add('active-law');
            else item.classList.remove('active-law');
        }
    });
}

// ==========================================
// 4. EĞİTİM ADIMLARI (SENARYO)
// ==========================================
const tutorialSteps = [
    // 1. e4 e5
    { run: () => { layout[52]=''; layout[36]='w-p'; layout[12]=''; layout[28]='b-p'; vurgula(0); } },
    // 2. f4 d6
    { run: () => { layout[53]=''; layout[37]='w-p'; layout[11]=''; layout[19]='b-p'; vurgula(0); } },
    // 3. Nf3 Nc6 (Aktif Feda Bilgisi)
    { run: () => { 
        layout[62]=''; layout[45]='w-n'; layout[1]=''; layout[18]='b-n'; 
        vurgula(1); pop(3, 0, "#3498db"); 
    } },
    // 4. g3 b6
    { run: () => { layout[54]=''; layout[46]='w-p'; layout[9]=''; layout[17]='b-p'; vurgula(0); } },
    // 5. Fb5 (Taze Tehdit)
    { run: () => { 
        layout[61]=''; layout[25]='w-b'; 
        vurgula(1); pop(5, 0, "#f1c40f"); 
    } },
    // 6. Fil b4 (İHANET TETİKLENİR)
    { run: () => { 
        layout[5]=''; layout[26]='b-b'; 
        vurgula(2); pop(6, 1, "#ff3333"); 
    } },
    // 7. Hain At Fil'i alır ve silinir
    { run: () => { 
        layout[18]=''; // c6'daki at gider
        layout[26]='w-n'; // b4'te at görünür (geçici)
        draw();
        const capturedPiece = boardElement.children[26].querySelector('.piece');
        if (capturedPiece) capturedPiece.classList.add('piece-capture');
        vurgula(3); pop(7, 2, "#ffffff");
        const tId = setTimeout(() => { layout[26]=''; draw(); }, 1500);
        timeouts.push(tId);
    } }
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
    const content = document.querySelector('.popup-content');
    if(content) content.style.borderLeftColor = color;
    document.querySelector('.alert-title').style.color = color;
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
