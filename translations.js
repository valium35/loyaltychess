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
        
        // Butonlar
        nextBtn: "Sonraki Hamle",
        backBtn: "Geri",
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
