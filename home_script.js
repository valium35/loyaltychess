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
    { msg: "Beyaz piyon e4 karesine çıkar.", run: () => { layout[52]=''; layout[36]='w-p'; } },
    { msg: "Siyah At a6 karesine hamle yapar.", run: () => { layout[1]=''; layout[16]='b-n'; } },
    { msg: "Beyaz Fil, Siyah At'ı tehdit eder!", run: () => { layout[61]=''; layout[25]='w-b'; } },
    { msg: "Siyah, At'ı korumaz veya kaçmaz! (Tehlike!)", run: () => { layout[15]=''; layout[23]='b-p'; } },
    { msg: "İHANET! Rakip artık bu Atı kullanabilir.", run: () => {} },
    { msg: "İhanet eden At, Siyah Vezir'i alır ve çıkar!", run: () => { layout[16]=''; layout[3]=''; } }
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
