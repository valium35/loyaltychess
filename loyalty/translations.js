/**
 * LoyaltyChess Merkezi Dil Sözlüğü ve Uygulayıcı Fonksiyonu
 */

const LoyaltyDict = {
    tr: {
        status: "Sıra Beyazda...",
        statusBlack: "Sıra Siyahda...",
        startMsg: "Başlamak için butona basın.",
        statusCheck: " (ŞAH!)",
        nextBtn: "Sonraki Hamle",
        backBtn: "Geri",
        resetBtn: "Yeniden Başlat",
        undoBtn: "Geri Al",
        rulesTitle: "📜 İhanet Yasaları",
        restrictionsTitle: "🚫 Kısıtlamalar",
        historyTitle: "⚔️ HAMLE KAYDI",
        legendTitle: "🎨 RENK REHBERİ",
        legBlue: "Mavi: Taze Tehdit",
        legRed: "Kırmızı: İhanet!",
        legYellow: "Sarı: Aktif Taş",
        rules: [
            "1. AKTİF TEHDİT: İhanet sadece taze tehditlerde tetiklenir. Kendi hamlenle yaptığın fedalar ihanet içermez.",
            "2. SEÇİM HAKKI: At, Kale ve Fil ihanet edebilir. Vezir ve Piyonlar her zaman sadıktır.",
            "3. SON GÖREV: İhanet eden taş şah çekemez. Hamle sonrası tahtadan sonsuza dek silinir."
        ],
        restrictions: [
            "İhanet eden taş Şah çekemez veya Mat edemez.",
            "Vezirler ve Piyonlar asla ihanet etmez.",
            "Şah Çatalı durumunda ihanet yasası geçersizdir."
        ],
        popups: {
            alertTitle: "⚠️ UYARI",
            confirmBtn: "ANLADIM",
            lawLabel: "KURAL:",
            judgmentBlockedTitle: "⚖️ HÜKÜM ENGELLENDİ",
            judgmentBlockedMsg: "Bu hain taşın tüm yolları kapalı! Hareket ettiği an Kral tehlikeye gireceği için (Açarak Şah) yasalar bu hamleyi yasaklıyor.",
            judgmentBlockedLaw: "YASA: İhanet hamlesi Şah/Mat ile sonuçlanamaz.",
            betrayalDetectedTitle: "🔥 İHANET TESPİT EDİLDİ!",
            betrayalDetectedMsg: "Sistem Uyarısı: Bazı taşlar korunmadığı için saf değiştirdi! Onları artık kendi taşın gibi kullanabilirsin.",
            betrayalLaw: "2. YASA: Korunmayan taş ihanete uğrar.",
            step5Title: "⚠️ TAZE TEHDİT",
            step5Msg: "Beyaz Fil b5'e gelerek c6'daki At'ı doğrudan tehdit etti!",
            step6Title: "🔥 İHANET!",
            step6Msg: "At korumasız bırakıldı. İhanet Yasası işliyor!",
            step7Title: "⚔️ İNTİKAM",
            step7Msg: "Hain taş görevini tamamladı ve tahtadan ayrıldı."
        }
    },
    en: {
        status: "White's Turn...",
        statusBlack: "Black's Turn...",
        startMsg: "Press the button to start.",
        statusCheck: " (CHECK!)",
        nextBtn: "Next Move",
        backBtn: "Back",
        resetBtn: "Restart Game",
        undoBtn: "Undo Move",
        rulesTitle: "📜 The 3 Laws of Betrayal",
        restrictionsTitle: "🚫 Restrictions",
        historyTitle: "⚔️ LOYALTY LOG",
        legendTitle: "🎨 COLOR GUIDE",
        legBlue: "Blue: Fresh Threat",
        legRed: "Red: Betrayal!",
        legYellow: "Yellow: Active Piece",
        rules: [
            "1. ACTIVE THREAT: Betrayal only triggers on fresh threats. Active sacrifices are immune.",
            "2. THE CHOICE: Knights, Rooks, and Bishops can betray. Queens and Pawns are always loyal.",
            "3. FINAL MISSION: Traitors cannot check. They are removed from the board after the move."
        ],
        restrictions: [
            "A traitor cannot Check or Checkmate.",
            "Queens and Pawns are always loyal.",
            "Void during Royal Fork."
        ],
        popups: {
            alertTitle: "⚠️ ALERT",
            confirmBtn: "GOT IT",
            lawLabel: "LAW:",
            judgmentBlockedTitle: "⚖️ JUDGMENT BLOCKED",
            judgmentBlockedMsg: "This traitor is blocked! Moving it would put the King in danger (Discovered Check). The law forbids this move.",
            judgmentBlockedLaw: "LAW: Betrayal moves cannot result in Check.",
            betrayalDetectedTitle: "🔥 BETRAYAL DETECTED!",
            betrayalDetectedMsg: "System Alert: Some pieces switched sides because they were left unprotected! You can now use them as your own.",
            betrayalLaw: "LAW 2: Unprotected pieces are subject to betrayal.",
            step5Title: "⚠️ FRESH THREAT",
            step5Msg: "White Bishop moved to b5, threatening the Knight on c6!",
            step6Title: "🔥 BETRAYAL!",
            step6Msg: "Knight was left undefended. Law of Betrayal is active!",
            step7Title: "⚔️ REVENGE",
            step7Msg: "The traitor Knight finished its mission and left."
        }
    }
};

/**
 * Sayfadaki tüm metinleri seçili dile göre günceller.
 */
function applyLanguageToPage() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    const t = LoyaltyDict[lang];
    if (!t) return;

    // 1. Genel Metinler, Butonlar ve Başlıklar
    const textMappings = {
        'status': t.status,
        'panel-title': t.rulesTitle,
        'history-title': t.historyTitle,
        'next-btn': t.nextBtn,
        'prev-btn': t.backBtn,
        'restart-btn': t.resetBtn,
        'undo-btn': t.undoBtn,
        'alert-title': t.popups.alertTitle,
        'popup-law-label': t.popups.lawLabel,
        'popup-confirm-btn': t.popups.confirmBtn,
        // Renk Rehberi (Legend) için eklenenler:
        'legend-title': t.legendTitle,
        'leg-blue': t.legBlue,
        'leg-red': t.legRed,
        'leg-yellow': t.legYellow
    };

    for (const [id, value] of Object.entries(textMappings)) {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    }

    // 2. Kurallar Listesi (rule-1-desc vb.)
    for (let i = 0; i < 3; i++) {
        const el = document.getElementById(`rule-${i + 1}-desc`);
        if (el) el.innerText = t.rules[i];
    }

    // 3. Kısıtlamalar Paneli
    const resBox = document.getElementById('restrictions-list');
    if (resBox && t.restrictions) {
        let resHtml = `<h4>${t.restrictionsTitle}</h4>`;
        t.restrictions.forEach(res => {
            resHtml += `<div class="restriction-item" style="font-size:0.75rem; margin-bottom:5px;">• ${res}</div>`;
        });
        resBox.innerHTML = resHtml;
    }
}

// Sayfa yüklendiğinde dili uygula
document.addEventListener('DOMContentLoaded', applyLanguageToPage);
function getT() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    return LoyaltyDict[lang];
}