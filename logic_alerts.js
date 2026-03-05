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

    // Güvenlik Kontrolü
    if (!overlay || !titleEl || !msgEl || !ruleEl || !contentEl) {
        console.error("HATA: Pop-up elementleri bulunamadı!");
        return;
    }

    // Metinleri Güncelle
    titleEl.innerText = title;
    msgEl.innerText = message;
    ruleEl.innerText = rule;

    // Görsel Uyumu Sağla (Hata Yapma İhtimalini Bitiriyoruz)
    titleEl.style.color = color; // Başlık rengi parametreye göre (Sarı/Kırmızı/Beyaz)
    
    // DİKKAT: Burada 'borderColor' yerine 'borderLeftColor' kullanıyoruz 
    // Böylece CSS'teki kalın sol çizgi değişir, diğer taraflar sabit kalır.
    contentEl.style.borderLeftColor = color; 
    
    // Kutuyu göster
    overlay.style.display = 'block'; 
}

function closePopup() {
    const overlay = document.getElementById('betrayal-popup');
    if (overlay) {
        overlay.style.display = 'none';
    }
}
