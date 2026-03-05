// logic_alerts.js

// 1. AŞAMA: Korunmayan taş uyarısı (İsterse hamleyi geri alır veya onaylar)
function showProtectionWarning(pieceName, square) {
    const confirmMove = confirm(`DİKKAT: ${pieceName} korumasız! İhanet edebilir. Bu hamleyi yapmak istediğine emin misin?`);
    return confirmMove; // true veya false döner
}

// 2. AŞAMA: İhanet Pop-up'ı
function triggerBetrayalPopup() {
    const overlay = document.getElementById('betrayal-popup');
    const msg = document.getElementById('popup-msg');
    
    msg.innerText = "İHANET! Sahipsiz bırakılan taş taraf değiştirdi.";
    overlay.style.display = 'flex';
    overlay.style.borderColor = "#ff3333"; // Kırmızı tema
}

// 3. AŞAMA: Ceza Pop-up'ı (Hamle bittikten sonra)
function triggerPunishmentPopup() {
    const overlay = document.getElementById('betrayal-popup');
    const title = document.querySelector('.alert-title');
    const msg = document.getElementById('popup-msg');
    
    title.innerText = "⚖️ CEZALANDIRILDI!";
    msg.innerText = "Taş görevini tamamladı ve oyundan çıkarıldı!";
    overlay.style.display = 'flex';
    overlay.style.borderColor = "#f1c40f"; // Altın/Ceza teması
}
function closePopup() {
    document.getElementById('betrayal-popup').style.display = 'none';
}
