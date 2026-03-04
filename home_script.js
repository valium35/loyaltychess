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
        const row = Math.floor(i / 8);
        const col = i % 8;
        const isBlack = (row + col) % 2 !== 0;
        
        square.className = `square ${isBlack ? 'black' : 'white'}`;
        
        if (layout[i]) {
            const piece = document.createElement('div');
            piece.className = `piece ${layout[i]}`;
            if (step === 5 && i === 16) piece.classList.add('betrayal');
            square.appendChild(piece);
        }
        boardElement.appendChild(square);
    }
}

const tutorialSteps = [
    { msg: "1. Beyaz piyon e4'e çıkar.", run: () => { layout[52]=''; layout[36]='w-p'; } },
    { msg: "2. Siyah At f6'ya hamle yapar.", run: () => { layout[6]=''; layout[21]='b-n'; } },
    { msg: "3. Beyaz Fil b5'e gelerek At'ı tehdit eder.", run: () => { layout[61]=''; layout[27]='w-b'; } },
    { msg: "4. Siyah At'ı korumaz. (İhanet Riski!)", run: () => { layout[15]=''; layout[23]='b-p'; } },
    { msg: "5. İHANET! At artık rakibin kontrolünde! (Kırmızı Parlama)", run: () => { /* Efekt draw'da */ } },
    { msg: "6. İhanet eden At, piyonu alır ve oyundan çıkar!", run: () => { layout[21]=''; layout[36]=''; } }
];

function nextStep() {
    if (step < tutorialSteps.length) {
        tutorialSteps[step].run();
        statusElement.innerText = tutorialSteps[step].msg;
        step++;
        draw();
    } else {
        statusElement.innerText = "Eğitim bitti!";
        statusElement.style.background = "#2980b9";
    }
}

// Başlangıç
draw();
statusElement.innerText = "Başlamak için butona tıkla.";
