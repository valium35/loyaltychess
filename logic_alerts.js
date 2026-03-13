function showPop(title, message, rule, color = "#f1c40f") {
    const overlay = document.getElementById('betrayal-popup');
    const titleEl = document.querySelector('.alert-title');
    const msgEl = document.getElementById('popup-msg');
    const ruleEl = document.getElementById('popup-rule');
    const contentEl = document.querySelector('.popup-content');
    const btnEl = document.querySelector('.popup-btn');

    if (overlay && titleEl && msgEl && ruleEl && contentEl) {
        titleEl.innerText = title;
        msgEl.innerText = message;
        ruleEl.innerText = rule;
        
        titleEl.style.color = color;
        contentEl.style.borderLeftColor = color; 
        
        // Eğer bu bir Ready (†) uyarısıysa buton metnini değiştir
        if (color === "#ff6600") {
            btnEl.innerText = "İHANETİ BAŞLAT";
            btnEl.onclick = () => { startBetrayal(); }; // logic_player.js'deki fonksiyon
        } else {
            btnEl.innerText = "ANLADIM";
            btnEl.onclick = closePopup;
        }
        
        overlay.style.display = 'flex';
    }
}

function closePopup() {
    const overlay = document.getElementById('betrayal-popup');
    if (overlay) overlay.style.display = 'none';
}
