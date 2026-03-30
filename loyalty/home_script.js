// ==========================================
// 1. DİL SÖZLÜĞÜ
// ==========================================
const translations = {
    tr: {
        status: "Başlamak için butona basın.",
        nextBtn: "Sonraki Hamle",
        backBtn: "Geri",
        resetBtn: "Başa Dön",
        rulesTitle: "📜 İhanet Yasaları (The 3 Laws)",
        restrictionsTitle: "🚫 Kısıtlamalar (Restrictions)",
        rules: [
            "1. AKTİF TEHDİT: İhanet sadece taze tehditlerde tetiklenir.",
            "2. SEÇİM HAKKI: At, Kale ve Fil ihanet edebilir.",
            "3. SON GÖREV: İhanet eden taş hamle sonrası silinir."
        ],
        restrictions: [
            "1. ŞAH ÇATALI: Şah ve başka bir taşı aynı anda tehdit ediyorsa İHANET EDEMEZ."
        ],
        popups: {
            step5Title: "⚠️ TAZE TEHDİT",
            step5Msg: "Beyaz Fil b5'e gelerek c6'daki At'ı doğrudan tehdit etti!",
            step6Title: "🔥 İHANET!",
            step6Msg: "Siyah, Atı terk etti. İhanet Yasası işliyor!",
            step7Title: "⚔️ İNTİKAM",
            step7Msg: "Hain At, b4'teki kendi Filini yok etti ve emekli oldu."
        },
        tutorialMsgs: [
            "1. Beyaz e4, Siyah e5. Merkez mücadelesi.",
            "2. Beyaz f4, Siyah d5 zorlaması.",
            "3. Beyaz Af3, Siyah Ac6 gelişimi.",
            "4. Beyaz g3 hazırlığı, Siyah b6.",
            "5. TEHDİT: Beyaz Fil b5'e indi, At tehlikede!",
            "6. İHANET: At korumasız kaldığı için taraf değiştirdi.",
            "7. SON: Hain At, Fil'i aldı ve her iki taş da silindi."
        ]
    },
    en: {
        status: "Press the button to start.",
        nextBtn: "Next Move",
        backBtn: "Back",
        resetBtn: "Reset",
        rulesTitle: "📜 The 3 Laws of Betrayal",
        restrictionsTitle: "🚫 Restrictions",
        rules: [
            "1. ACTIVE THREAT: Betrayal triggers on fresh threats.",
            "2. THE CHOICE: Knights, Rooks, and Bishops can betray.",
            "3. FINAL MISSION: Traitors are removed after the move."
        ],
        restrictions: [
            "1. ROYAL FORK: Piece cannot betray if it forks the King."
        ],
        popups: {
            step5Title: "⚠️ FRESH THREAT",
            step5Msg: "White Bishop to b5, threatening the Knight!",
            step6Title: "🔥 BETRAYAL!",
            step6Msg: "Law of Betrayal is active!",
            step7Title: "⚔️ REVENGE",
            step7Msg: "The traitor Knight destroyed the Bishop."
        },
        tutorialMsgs: [
            "1. White e4, Black e5.",
            "2. White f4, Black d5.",
            "3. White Nf3, Black Nc6.",
            "4. White g3 prep, Black b6.",
            "5. THREAT: Bishop to b5, Knight in danger!",
            "6. BETRAYAL: Knight switched sides.",
            "7. FINAL: Traitor took the Bishop."
        ]
    }
};

// ==========================================
// 2. TEMEL DEĞİŞKENLER
// ==========================================
const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');
const alertContainer = document.getElementById('alert-container'); 
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

    // --- BURAYI DEĞİŞTİRDİK ---
    // if(alertContainer) alertContainer.innerHTML = '';  <-- BU SATIRI SİLDİK VEYA BAŞINA // KOYDUK
    
    closePopup(); // Sadece açık olan pop-up'ı gizler, başlığa dokunmaz!
    vurgula(0);
}

function draw() {
    if(!boardElement) return;
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
            if (step === 6 && i === 18) piece.classList.add('betrayal');
            square.appendChild(piece);
        }
        boardElement.appendChild(square);
    }
}

function vurgula(kuralNo) {
    const items = document.querySelectorAll('.law-item');
    items.forEach((item, idx) => {
        item.style.opacity = (kuralNo === 0 || idx + 1 === kuralNo) ? "1" : "0.3";
    });
}

// ==========================================
// 3. POP-UP SİSTEMİ (PANEL İÇİNDE)
// ==========================================
function showPop(title, msg, rule, color) {
    const popupOverlay = document.getElementById('betrayal-popup');
    if (alertContainer && popupOverlay) {
        // Pop-up'ı panelin içine taşıyoruz (eğer değilse)
        if (popupOverlay.parentElement !== alertContainer) {
            alertContainer.appendChild(popupOverlay);
        }
        
        const titleEl = popupOverlay.querySelector('.alert-title');
        const msgEl = document.getElementById('popup-msg');
        const ruleEl = document.getElementById('popup-rule');

        if(titleEl) {
            titleEl.innerText = title;
            titleEl.style.color = color;
        }
        if(msgEl) msgEl.innerText = msg;
        if(ruleEl) ruleEl.innerText = rule;
        
        popupOverlay.style.display = 'block'; 
    }
}

function closePopup() { 
    const popup = document.getElementById('betrayal-popup');
    if(popup) popup.style.display = 'none'; 
}

function pop(stepNo, ruleIdx, color) {
    const lang = localStorage.getItem('gameLang') || 'tr';
    const p = translations[lang].popups[`step${stepNo}Title`];
    const m = translations[lang].popups[`step${stepNo}Msg`];
    const r = translations[lang].rules[ruleIdx];
    showPop(p, m, r, color);
}

// ==========================================
// 4. SENARYO VE KONTROLLER
// ==========================================
const tutorialSteps = [
    { run: () => { layout[52]=''; layout[36]='w-p'; layout[12]=''; layout[28]='b-p'; vurgula(0); closePopup(); } },
    { run: () => { layout[53]=''; layout[37]='w-p'; layout[11]=''; layout[27]='b-p'; vurgula(0); closePopup(); } },
    { run: () => { layout[62]=''; layout[45]='w-n'; layout[1]=''; layout[18]='b-n'; vurgula(0); closePopup(); } },
    { run: () => { layout[54]=''; layout[46]='w-p'; layout[9]=''; layout[17]='b-p'; vurgula(0); closePopup(); } },
    { run: () => { layout[61]=''; layout[25]='w-b'; vurgula(1); pop(5, 0, "#f1c40f"); } },
    { run: () => { layout[5]=''; layout[33]='b-b'; vurgula(2); pop(6, 1, "#ff3333"); } },
    { 
        run: () => { 
            layout[18] = ''; layout[33] = 'w-n'; draw(); 
            vurgula(3); pop(7, 2, "#ffffff"); 
            const tId = setTimeout(() => { layout[33] = ''; draw(); }, 1500);
            timeouts.push(tId);
        } 
    }
];

function nextStep() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    if (step < tutorialSteps.length) {
        tutorialSteps[step].run();
        statusElement.innerText = translations[lang].tutorialMsgs[step];
        step++;
    } else {
        resetBoard();
        statusElement.innerText = translations[lang].status;
    }
    draw();
    updateButtonStates();
}

function prevStep() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    if (step > 0) {
        step--;
        const target = step;
        resetBoard();
        for (let i = 0; i < target; i++) tutorialSteps[i].run();
        step = target;
        statusElement.innerText = (step === 0) ? translations[lang].status : translations[lang].tutorialMsgs[step - 1];
        draw();
        updateButtonStates();
    }
}

function updateButtonStates() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    const t = translations[lang];
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (prevBtn) prevBtn.disabled = (step === 0);
    if (nextBtn) {
        nextBtn.innerText = (step >= tutorialSteps.length) ? t.resetBtn : t.nextBtn;
    }
}

function applyLanguage(lang) {
    const t = translations[lang];
    if (!t) return;
    localStorage.setItem('gameLang', lang);
    
    const pTitle = document.getElementById('panel-title');
    if(pTitle) pTitle.innerText = t.rulesTitle;
    
    for(let i=1; i<=3; i++) {
        const rDesc = document.getElementById(`rule-${i}-desc`);
        if(rDesc) rDesc.innerText = t.rules[i-1];
    }
    
    const prevBtn = document.getElementById('prev-btn');
    if(prevBtn) prevBtn.innerText = t.backBtn;
    
    const resBox = document.getElementById('restrictions-list');
    if (resBox) {
        resBox.innerHTML = `<h4>${t.restrictionsTitle}</h4>`;
        t.restrictions.forEach(r => {
            const d = document.createElement('div');
            d.className = 'restriction-item';
            d.innerText = r;
            resBox.appendChild(d);
        });
    }
    
    if (statusElement) {
        statusElement.innerText = (step === 0) ? t.status : t.tutorialMsgs[step-1];
    }
    updateButtonStates();
}

document.addEventListener("DOMContentLoaded", () => {
    resetBoard();
    const savedLang = localStorage.getItem('gameLang') || 'tr';
    applyLanguage(savedLang); 
    draw();
});