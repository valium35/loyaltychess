const boardElement = document.getElementById('chess-board');
const statusElement = document.getElementById('status');
let step = 0;

let layout = [
    'b-r','b-n','b-b','b-q','b-k','b-b','b-n','b-r',
    'b-p','b-p','b-p','b-p','b-p','b-p','b-p','b-p',
    '','','','','','','','',
    '','','','','','','','',
    '','','','','','','','',
    '','','','','','','','',
    'w-p','w-p','w-p','w-p','w-p','w-p','w-p','w-p',
    'w-r','w-n','w-b','w-q','w-k','w-b','w-n','w-r'
];

function draw() {
    boardElement.innerHTML = ''; 
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const isBlack = (Math.floor(i / 8) + (i % 8)) % 2 !== 0;
        square.className = `square ${isBlack ? 'black' : 'white'}`;
        
        if (layout[i]) {
            const piece = document.createElement('div');
            piece.className = `piece ${layout[i]}`;
            // İHANET EFEKTİ: 6. Adımda c6'daki (18) At parlar
            if (step === 6 && i === 18) piece.classList.add('betrayal');
            square.appendChild(piece);
        }
        boardElement.appendChild(square);
    }
}

const tutorialSteps = [
    { msg: "1. Beyaz e4, Siyah b6 ile b-piyonunu açar.", run: () => { layout[52]=''; layout[36]='w-p'; layout[9]=''; layout[17]='b-p'; }},
    { msg: "2. Beyaz d4, Siyah e6 ile e-piyonunu açar.", run: () => { layout[51]=''; layout[35]='w-p'; layout[12]=''; layout[20]='b-p'; }},
    { msg: "3. Siyah d6 sürerek merkez piyonlarını dağıtır.", run: () => { layout[11]=''; layout[19]='b-p'; }},
    { msg: "4. Siyah At c6'ya gelir. (Hala korunmuyor!)", run: () => { layout[1]=''; layout[18]='b-n'; }},
    { msg: "5. Beyaz Fil b5'ten Atı ister. Siyah pas geçer!", run: () => { layout[61]=''; layout[25]='w-b'; layout[15]=''; layout[23]='b-p'; }},
    { msg: "6. İHANET! Sahipsiz kalan At taraf değiştirir!", run: () => { /* Parlama efekti */ }},
    { msg: "7. Hain At, Siyah Vezir'i (d8) alır ve çıkar!", run: () => { layout[18]=''; layout[3]=''; }}
];

function nextStep() {
    if (step < tutorialSteps.length) {
        tutorialSteps[step].run();
        statusElement.innerText = tutorialSteps[step].msg;
        step++;
        draw();
    } else {
        statusElement.innerText = "Check-point Tamamlandı!";
    }
}

draw();
statusElement.innerText = "Sistemi test etmek için tıkla.";
