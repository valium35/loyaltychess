// ==========================================
// 1. DİL SÖZLÜĞÜ VE YAPILANDIRMA
// ==========================================
const translations = {
    tr: {
        status: "Başlamak için butona basın.",
        nextBtn: "Sonraki Hamle",
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
// 2. TAHTA VE OYUN MANTIĞI DEĞİŞKENLERİ
// ==========================================
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

// ==========================================
// 3. FONKSİYONLAR
// ==========================================

function applyLanguage(lang) {
    const t = translations[lang];
    statusElement.innerText = t.status;
    document.querySelector('.side-panel button').innerText = t.nextBtn;
    document.querySelector('.full-rules-panel h3').innerText = t.rulesTitle;
    
    const rulesList = document.getElementById('rules-list');
    rulesList.innerHTML = ""; 
    t.rules.forEach((rule, index) => {
        const li = document.createElement('li');
        li.id = `rule-${index + 1}`;
        li.innerText = rule;
        rulesList.appendChild(li);
    });
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
// 4. EĞİTİM ADIMLARI (TUTORIAL STEPS)
// ==========================================
const tutorialSteps = [
    { 
        msg: "1. Beyaz e4, Siyah b6 ile b-piyonunu açar.", 
        run: () => { layout[52]=''; layout[36]='w-p'; layout[9]=''; layout[17]='b-p'; vurgula(1); }
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
            const lang = localStorage.getItem('gameLang') || 'tr';
            showPop(translations[lang].popups.step5Title, translations[lang].popups.step5Msg, translations[lang].rules[0], "#f1c40f");
        }
    },
    { 
        msg: "6. İHANET! Sahipsiz kalan At taraf değiştirir!", 
        run: () => { 
            vurgula(2);
            const lang = localStorage.getItem('gameLang') || 'tr';
            showPop(translations[lang].popups.step6Title, translations[lang].popups.step6Msg, translations[lang].rules[1], "#ff3333");
        }
    },
    { 
        msg: "7. Hain At, Siyah Vezir'i (d8) alır ve çıkar!", 
        run: () => { 
            layout[18]=''; layout[3]='w-n'; draw();
            const capturedSquare = boardElement.children[3];
            const capturedPiece = capturedSquare.querySelector('.piece');
            if (capturedPiece) capturedPiece.classList.add('piece-capture');

            const lang = localStorage.getItem('gameLang') || 'tr';
            vurgula(7);
            showPop(translations[lang].popups.step7Title, translations[lang].popups.step7Msg, translations[lang].rules[6], "#ffffff");

            setTimeout(() => {
                layout[3]=''; draw();
            }, 1200);
        }
    }
];

function nextStep() {
    if (step < tutorialSteps.length) {
        tutorialSteps[step].run();
        statusElement.innerText = tutorialSteps[step].msg;
        step++;
        draw();
    } else {
        statusElement.innerText = "Eğitim Tamamlandı!";
        vurgula(0);
    }
}

// ==========================================
// 5. BAŞLATICI (INIT)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const lang = localStorage.getItem('gameLang') || 'tr';
    applyLanguage(lang);
    draw();
});
