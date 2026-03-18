/**
 * LoyaltyChess Merkezi Dil Sözlüğü
 * Tüm sayfalar (Home, PvP, PvE) bu dosyadan beslenir.
 */

const LoyaltyDict = {
    tr: {
        // Durum Mesajları
        status: "Sıra Beyazda...",
        statusBlack: "Sıra Siyahda...",
        startMsg: "Başlamak için butona basın.",
        statusCheck: " (ŞAH!)",
        // Butonlar
        nextBtn: "Sonraki Hamle",
        backBtn: "Geri",
        statusCheck: " (CHECK!)",
        resetBtn: "Yeniden Başlat",
        undoBtn: "Geri Al",
        
        // Panel Başlıkları
        rulesTitle: "📜 İhanet Yasaları",
        restrictionsTitle: "🚫 Kısıtlamalar",
        historyTitle: "⚔️ LOYALTY LOG",
        
        // Kurallar Listesi
        rules: [
            "1. AKTİF TEHDİT: İhanet sadece taze tehditlerde tetiklenir. Kendi hamlenle yaptığın fedalar ihanet içermez.",
            "2. SEÇİM HAKKI: At, Kale ve Fil ihanet edebilir. Vezir ve Piyonlar her zaman sadıktır.",
            "3. SON GÖREV: İhanet eden taş şah çekemez. Hamle sonrası tahtadan sonsuza dek silinir."
        ],
        
        // Kısıtlamalar
        restrictions: [
            "İhanet eden taş Şah çekemez veya Mat edemez.",
            "Vezirler ve Piyonlar asla ihanet etmez.",
            "Şah Çatalı durumunda ihanet yasası geçersizdir."
        ],
        
        // Popup ve Uyarı Mesajları
        popups: {
            alertTitle: "⚠️ UYARI",
            confirmBtn: "ANLADIM",
            lawLabel: "KURAL:",
            step5Title: "⚠️ TAZE TEHDİT",
            step5Msg: "Beyaz Fil b5'e gelerek c6'daki At'ı doğrudan tehdit etti!",
            step6Title: "🔥 İHANET!",
            step6Msg: "At korumasız bırakıldı. İhanet Yasası işliyor!",
            step7Title: "⚔️ İNTİKAM",
            step7Msg: "Hain taş görevini tamamladı ve tahtadan ayrıldı."
        }
    },
    en: {
        // Status Messages
        status: "White's Turn...",
        statusBlack: "Black's Turn...",
        startMsg: "Press the button to start.",
        
        // Buttons
        nextBtn: "Next Move",
        backBtn: "Back",
        resetBtn: "Restart Game",
        undoBtn: "Undo Move",
        
        // Panel Titles
        rulesTitle: "📜 The 3 Laws of Betrayal",
        restrictionsTitle: "🚫 Restrictions",
        historyTitle: "⚔️ LOYALTY LOG",
        
        // Rules List
        rules: [
            "1. ACTIVE THREAT: Betrayal only triggers on fresh threats. Active sacrifices are immune.",
            "2. THE CHOICE: Knights, Rooks, and Bishops can betray. Queens and Pawns are always loyal.",
            "3. FINAL MISSION: Traitors cannot check. They are removed from the board after the move."
        ],
        
        // Restrictions
        restrictions: [
            "A traitor cannot Check or Checkmate.",
            "Queens and Pawns are always loyal.",
            "Betrayal is void during a Royal Fork."
        ],
        
        // Popup and Alert Messages
        popups: {
            alertTitle: "⚠️ ALERT",
            confirmBtn: "GOT IT",
            lawLabel: "LAW:",
            step5Title: "⚠️ FRESH THREAT",
            step5Msg: "White Bishop moved to b5, threatening the Knight on c6!",
            step6Title: "🔥 BETRAYAL!",
            step6Msg: "Knight was left undefended. Law of Betrayal is
                const LoyaltyDict = {
    tr: {
        // ... (Senin paylaştığın TR içeriği buraya gelecek)
        statusCheck: " (ŞAH!)"
        status: "Sıra Beyazda...",
        statusBlack: "Sıra Siyahda...",
        resetBtn: "Yeniden Başlat",
        undoBtn: "Geri Al",
        rulesTitle: "📜 İhanet Yasaları",
        restrictionsTitle: "🚫 Kısıtlamalar",
        historyTitle: "⚔️ LOYALTY LOG",
        rules: [
            "1. AKTİF TEHDİT: İhanet sadece taze tehditlerde tetiklenir.",
            "2. SEÇİM HAKKI: At, Kale ve Fil ihanet edebilir.",
            "3. SON GÖREV: İhanet eden taş şah çekemez."
        ],
        restrictions: ["İhanet eden taş Şah çekemez.", "Vezirler asla ihanet etmez.", "Şah çatalında geçersizdir."],
        popups: { alertTitle: "⚠️ UYARI", confirmBtn: "ANLADIM", lawLabel: "KURAL:" }
    },
    en: {
        // ... (Senin paylaştığın EN içeriği buraya gelecek)
        status: "White's Turn...",
        statusBlack: "Black's Turn...",
        resetBtn: "Restart Game",
        undoBtn: "Undo Move",
         statusCheck: " (ŞAH!)",
        rulesTitle: "📜 Laws of Betrayal",
        restrictionsTitle: "🚫 Restrictions",
        historyTitle: "⚔️ LOYALTY LOG",
        rules: [
            "1. ACTIVE THREAT: Betrayal triggers on fresh threats.",
            "2. THE CHOICE: Knights, Rooks, and Bishops can betray.",
            "3. FINAL MISSION: Traitors cannot check."
        ],
        restrictions: ["Traitors cannot check.", "Queens are always loyal.", "Void during Royal Fork."],
        popups: { alertTitle: "⚠️ ALERT", confirmBtn: "GOT IT", lawLabel: "LAW:" }
    }
};

// --- İŞTE O AKILLI BAĞLANTI FONKSİYONU ---
function applyLanguageToPage() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    const t = LoyaltyDict[lang];
    if (!t) return;

    // 1. Basit Yazılar (Butonlar, Başlıklar)
    const map = {
        'status': t.status,
    'restart-btn': t.resetBtn,
    'undo-btn': t.undoBtn,
    'next-btn': t.nextBtn, // Eklendi
    'prev-btn': t.backBtn, // Eklendi
    'history-title': t.historyTitle,
    'panel-title': t.rulesTitle,
    'alert-title': t.popups.alertTitle,
    'popup-law-label': t.popups.lawLabel,
    'popup-confirm-btn': t.popups.confirmBtn
        
    };

    for (let id in map) {
        const el = document.getElementById(id);
        if (el) el.innerText = map[id];
    }

    // 2. Kurallar (rule-1-desc, rule-2-desc, rule-3-desc)
    for (let i = 0; i < 3; i++) {
        const el = document.getElementById(`rule-${i+1}-desc`);
        // index.html için de uyumlu olsun diye alternatif ID:
        const homeEl = document.getElementById(`h-rule-${i+1}-desc`);
        
        if (el) el.innerText = t.rules[i];
        if (homeEl) homeEl.innerText = t.rules[i];
    }

    // 3. Kısıtlamalar Kutusu
    const resBox = document.getElementById('restrictions-list');
    if (resBox && t.restrictions) {
        let html = `<h4>${t.restrictionsTitle}</h4>`;
        t.restrictions.forEach(r => html += `<div>• ${r}</div>`);
        resBox.innerHTML = html;
    }
}
             function applyGlobalLanguage() {
    const lang = localStorage.getItem('gameLang') || 'tr';
    const t = LoyaltyDict[lang];
    if (!t) return;

    // Basit metinler (ID bazlı)
    const map = {
        'restart-btn': t.resetBtn,
        'undo-btn': t.undoBtn,
        'history-title': t.historyTitle,
        'panel-title': t.rulesTitle,
        'alert-title': t.popups?.alertTitle || "UYARI",
        'popup-law-label': t.popups?.lawLabel || "KURAL:",
        'popup-confirm-btn': t.popups?.confirmBtn || "ANLADIM"
    };

    for (let id in map) {
        const el = document.getElementById(id);
        if (el) el.innerText = map[id];
    }

    // Kurallar
    for (let i = 0; i < 3; i++) {
        const el = document.getElementById(`rule-${i+1}-desc`);
        if (el && t.rules[i]) el.innerText = t.rules[i];
    }

    // Kısıtlamalar
    const resBox = document.getElementById('restrictions-list');
    if (resBox && t.restrictions) {
        let html = `<h4>${t.restrictionsTitle}</h4>`;
        t.restrictions.forEach(r => html += `<div style="font-size: 0.75rem; color: #eee; margin-bottom: 5px;">• ${r}</div>`);
        resBox.innerHTML = html;
    }
}   
