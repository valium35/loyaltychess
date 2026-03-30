/**
 * logic_alert.js
 * Hem uyarıları gösterir hem de İhanet (†) sürecini yönetir.
 */
function showPop(title, message, rule, color = "#f1c40f") {
    // 1. Elementleri ID üzerinden yakalayalım (En garantisi budur)
    const overlay = document.getElementById('betrayal-popup');
    const titleEl = document.getElementById('alert-title'); // ID'ye göre seçtik
    const msgEl = document.getElementById('popup-msg');
    const ruleEl = document.getElementById('popup-rule');
    const btnEl = document.getElementById('popup-confirm-btn');
    const contentEl = document.querySelector('.popup-content');

    if (overlay && titleEl && msgEl && ruleEl) {
        // İçerikleri bas
        titleEl.innerText = title;
        msgEl.innerText = message;
        ruleEl.innerText = rule;
        
        // Renkleri uygula (Altın sarısı veya İhanet kırmızısı)
        titleEl.style.color = color;
        if (contentEl) contentEl.style.borderLeft = `6px solid ${color}`; 
        
        // --- İHANET BAŞLATMA MANTIĞI ---
        if (color === "#ff6600") { // Turuncu Ready durumu
            btnEl.innerText = "İHANETİ BAŞLAT";
            btnEl.onclick = () => { 
                if (typeof startBetrayal === 'function') startBetrayal(); 
                overlay.style.display = 'none';
            };
        } else {
            // Normal uyarı durumu (Açarak şah vb.)
            const lang = localStorage.getItem('gameLang') || 'tr';
            btnEl.innerText = lang === 'tr' ? "ANLADIM" : "GOT IT";
            btnEl.onclick = () => { overlay.style.display = 'none'; };
        }
        
        // Pop-up'ı göster
        overlay.style.display = 'flex';
    } else {
        console.error("Pop-up elementlerinden biri labirentte kaybolmuş!", {overlay, titleEl, msgEl, ruleEl});
    }
}

function closePopup() {
    const overlay = document.getElementById('betrayal-popup');
    if (overlay) overlay.style.display = 'none';
}