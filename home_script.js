// ==========================================
// 1. DİL SÖZLÜĞÜ (Kısıtlamalar Eklendi)
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
            "1. AKTİF TEHDİT: İhanet sadece taze tehditlerde tetiklenir. Kendi hamlenle yaptığın fedalar ihanet içermez.",
            "2. SEÇİM HAKKI: At, Kale ve Fil ihanet edebilir. Vezir ve Piyonlar her zaman sadıktır.",
            "3. SON GÖREV: İhanet eden taş şah çekemez. Hamle sonrası tahtadan sonsuza dek silinir."
        ],
        restrictions: [
            "1. ŞAH ÇATALI: Eğer bir taş aynı anda Şah'ı ve başka bir taşı tehdit ediyorsa (çatal), o taş İHANET EDEMEZ."
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
            "3. Beyaz Af3, Siyah Ac6 gelişimi.",
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
        restrictionsTitle: "🚫 Restrictions",
        rules: [
            "1. ACTIVE THREAT: Betrayal only triggers on fresh threats. Active sacrifices are immune.",
            "2. THE CHOICE: Knights, Rooks, and Bishops can betray. Queens and Pawns are always loyal.",
            "3. FINAL MISSION: Traitors cannot check. They are removed from the board after the move."
        ],
        restrictions: [
            "1. ROYAL FORK: If a piece threatens the King and another piece simultaneously (fork), it CANNOT betray."
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
            "3. White Nf3, Black Nc6 development.",
            "4. White g3 prep, Black plays b6.",
            "5. FRESH THREAT: White Bishop to b5, the Knight is in danger!",
            "6. BETRAYAL: Black played Bishop b4! The abandoned Knight switched sides.",
            "7. FINAL: The traitor Knight took the Bishop on b4 and both were removed."
        ]
    }
};

// ==========================================
// 2. TEMEL DEĞİŞKENLER VE TAHTA MANTIĞI
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
            // Adım 6'da c6'daki atı (index 18) parlatıyoruz
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
            if (idx
