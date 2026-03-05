// logic_alerts.js

function showPop(title, message, rule, color = "#ff3333") {
    const overlay = document.getElementById('betrayal-popup');
    const titleEl = document.querySelector('.alert-title');
    const msgEl = document.getElementById('popup-msg');
    const ruleEl = document.getElementById('popup-rule');
    const contentEl = document.querySelector('.popup-content');

    titleEl.innerText = title;
    msgEl.innerText = message;
    ruleEl.innerText = rule;
    contentEl.style.borderColor = color;
    
    overlay.style.display = 'flex';
}

function closePopup() {
    document.getElementById('betrayal-popup').style.display = 'none';
}
