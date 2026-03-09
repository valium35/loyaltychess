// ==========================================
// 1. DİL SÖZLÜĞÜ (TR/EN GÜNCEL)
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
            step5Title: "⚠️ TAZE TEHDİT",
            step5Msg: "Beyaz Fil b5'e gelerek c6'daki At'ı doğrudan tehdit etti!",
            step6Title: "🔥 İHANET!",
            step6Msg: "Siyah, Atı korumak yerine Filini b4'e sürerek Atı terk etti. İhanet Yasası işliyor!",
            step7Title: "⚔️ İNTİKAM",
            step7Msg: "Hain At, b4'teki kendi Filini yok etti ve görevini tamamlayıp tahtadan ayrıldı."
        },
        tutorialMsgs: [
            "1. Beyaz e4, Siyah e5. Merkez mücadelesi başlıyor.",
            "2. Beyaz f4, Siyah d5 ile merkezi zorluyor.",
            "3. Beyaz Af3, Siyah Ac6 gelişimi. (Ac6 Aktif Feda olduğu için güvende).",
            "4. Beyaz g3 hazırlığı, Siyah b6 sürüyor.",
            "5. TAZE TEHDİT: Beyaz Fil b5'e indi, At tehlikede!",
            "6. İHANET: Siyah Fil b4'e geldi! At korumasız kaldığı için taraf değiştirdi.",
            "7. SON: Hain At, b4'teki Fil'i aldı ve her iki taş da silindi."
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
            step5Title: "⚠️ FRESH THREAT",
            step5Msg: "White Bishop moved to b5, threatening the Knight on c6!",
            step6Title: "🔥 BETRAYAL!",
            step6Msg: "Black moved the Bishop to b4, abandoning the Knight. Law of Betrayal is active!",
            step7Title: "⚔️ REVENGE",
            step7Msg: "The traitor Knight destroyed its own Bishop on b4 and left the board."
        },
        tutorialMsgs: [
            "1. White e4, Black e5. Center battle begins.",
            "2. White f4, Black d5 challenging the center.",
            "3. White Nf3, Black Nc6 development. (Active sacrifice, so it's safe).",
            "4. White g3 prep, Black plays b6.",
            "5. FRESH THREAT: White Bishop to b5, the Knight is in danger!",
            "6. BETRAYAL: Black played Bishop b4! The abandoned Knight switched sides.",
            "7. FINAL: The traitor Knight took the Bishop on b4 and both were removed."
        ]
    }
};

// ==========================================
// 2. TEMEL DEĞİŞKENLER VE TAHTA
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
            // Adım 6'da c6'daki atı (index 18) parlat
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
// 3. SENARYO ADIMLARI
// ==========================================
const tutorialSteps = [
    // 1. Beyaz e4 / Siyah e5
    { run: () => { layout[52]=''; layout[36]='w-p'; layout[12]=''; layout[28]='b-p'; vurgula(0); } },
    
    // 2. Beyaz f4 / Siyah d5
    { run: () => { layout[53]=''; layout[37]='w-p'; layout[11]=''; layout[27]='b-p'; vurgula(0); } },
    
    // 3. Beyaz Af3 / Siyah Ac6
    { run: () => { layout[62]=''; layout[45]='w-n'; layout[1]=''; layout[18]='b-n'; vurgula(0); } },
    
    // 4. Beyaz g3 / Siyah b6
    { run: () => { layout[54]=''; layout[46]='w-p'; layout[9]=''; layout[17]='b-p'; vurgula(0); } },
    
    // 5. TAZE TEHDİT: Beyaz Fil b5'e gelerek At'ı ister!
    { 
        run: () => { 
            layout[61]=''; layout[25]='w-b'; 
            vurgula(1); 
            pop(5, 0, "#f1c40f"); 
        } 
    },
    // 6. ADIM: Siyah Fil b4'e (index 33) gelir
    { 
        run: () => { 
            layout[5]=''; // f8'deki (filin başlangıcı) fili kaldır
            layout[33]='b-b'; // b4 karesine (index 33) koy
            vurgula(2); 
            pop(6, 1, "#ff3333"); // İhanet mesajı
        } 
    },
    
    // 7. ADIM: Hain At (c6), b4'teki (43) Fil'i alır
    { 
        run: () => { 
            layout[18]=''; // At c6'dan (index 18) kalkar
            layout[33]='w-n'; // b4'teki (index 33) Fil'i vurur
            draw();
            
            // Vurulan karede (38) patlama efekti
            const capturedPiece = boardElement.children[41].querySelector('.piece');
            if (capturedPiece) capturedPiece.classList.add('piece-capture');
            
            vurgula(3); 
            pop(7, 2, "#ffffff"); // Silinme kuralı mesajı
            
            const tId = setTimeout(() => { layout[33]=''; draw(); }, 1500);
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
// 4. KONTROLLER
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

function applyLanguage(lang) {
    const t = translations[lang];
    statusElement.innerText = t.status;
    const title = document.querySelector('.full-rules-panel h3');
    if(title) title.innerText = t.rulesTitle;
    
    document.getElementById('rule-1-desc').innerText = t.rules[0];
    document.getElementById('rule-2-desc').innerText = t.rules[1];
    document.getElementById('rule-3-desc').innerText = t.rules[2];
    
    updateButtonStates();
}

document.addEventListener("DOMContentLoaded", () => {
    resetBoard();
    const currentLang = localStorage.getItem('gameLang') || 'tr';
    applyLanguage(currentLang);
    draw();
});
