function showPop(title, message, rule, color = "#f1c40f") {
    const overlay = document.getElementById('betrayal-popup');
    const titleEl = document.querySelector('.alert-title');
    const msgEl = document.getElementById('popup-msg');
    const ruleEl = document.getElementById('popup-rule');
    const contentEl = document.querySelector('.popup-content');

    if (overlay && titleEl && msgEl && ruleEl && contentEl) {
        titleEl.innerText = title;
        msgEl.innerText = message;
        ruleEl.innerText = rule;
        
        titleEl.style.color = color;
        contentEl.style.borderLeftColor = color; 
        
        overlay.style.display = 'flex'; // Merkeze hizalamak için flex
    }
}

function closePopup() {
    const overlay = document.getElementById('betrayal-popup');
    if (overlay) overlay.style.display = 'none';
}
