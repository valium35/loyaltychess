/**
 * LoyaltyChess Pop-up Yönetimi
 * @param {string} title - Pop-up başlığı
 * @param {string} message - Ana uyarı mesajı
 * @param {string} rule - İlgili kuralın açıklaması
 * @param {string} color - Vurgu rengi (Hex kodu)
 */
function showPop(title, message, rule, color = "#ff3333") {
    const overlay = document.getElementById('betrayal-popup');
    const titleEl = document.querySelector('.alert-title');
    const msgEl = document.getElementById('popup-msg');
    const ruleEl = document.getElementById('popup-rule');
    const contentEl = document.querySelector('.popup-content');

    // Hata Kontrolü: Eğer HTML'de bir eleman eksikse kodu bozmadan uyarır
    if (!overlay || !titleEl || !msgEl || !ruleEl || !contentEl) {
        console.error("HATA: Pop-up elementlerinden biri bulunamadı. HTML ID'lerini kontrol edin!");
        return;
    }

    // İçerikleri Yerleştir
    titleEl.innerText = title;
    msgEl.innerText = message;
    ruleEl.innerText = rule;

    // Görsel Düzenlemeler
    contentEl.style.borderColor = color; // Çerçeve rengi
    titleEl.style.color = color;       // Başlık rengi (Uyumlu olması için)
    
    // Görünür Yap
    overlay.style.display = 'flex';
    console.log(`Pop-up tetiklendi: [${title}]`);
}

/**
 * Pop-up'ı kapatır
 */
function closePopup() {
    const overlay = document.getElementById('betrayal-popup');
    if (overlay) {
        overlay.style.display = 'none';
        console.log("Pop-up kapatıldı, oyun devam ediyor.");
    }
}
