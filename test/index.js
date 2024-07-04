
import Assemblus from './assemblus.js';

const button = document.getElementById('run');
const input = document.getElementById('code');
const table = document.getElementById('out');
const memories = document.getElementById('memory');
const acc = document.querySelector('.accumulator-value');

function addMem(address, value) {

    // check if there's a row element that has the same address
    let rows = memories.querySelectorAll('.row');
    for (let row of rows) {
        if (row.querySelector('.child').innerText == address) {
            row.querySelector('.child:last-child').innerText = value;
            return;
        }
    }

    memories.innerHTML += `
        <div class="row">
            <div class="child">${address}</div>
            <div class="child">${value}</div>
        </div>
    `;
}

input.addEventListener('keydown', (e) => {
    if (e.key == 'Tab') {
        e.preventDefault();
        let start = input.selectionStart;
        let end = input.selectionEnd;

        input.value = input.value.substring(0, start) + '\t' + input.value.substring(end);
        input.selectionStart = input.selectionEnd = start + 1;
    }
});

function log(text = '&nbsp;') {
    table.innerHTML += `<p>${text}</p>`;
}

function clear() {
    table.innerHTML = '';
}

log('Welcome to the Assembly Simulator!');
log('Made by Ramy Hadid.');

button.addEventListener('click', async () => {

    clear();
    log("Running the code...")

    button.disabled = true;
    const code = input.value.trim();

    let assembly = new Assemblus(code);
    assembly.read = async function (p) {
        return parseFloat(prompt(p));
    }

    assembly.write = async function (value) {
        log("OUT/ " + value);
    }

    assembly.on('step', ({ accumulator, instruction, number }) => {
        acc.innerText = accumulator.value === parseInt(accumulator.value) ? accumulator.value : accumulator.value.toFixed(2);

        log(`Step ${number}: ${instruction.type} ${instruction.value || ''}`);
    });

    assembly.on('store', ({ address, variable }) => {
        log(`Stored ${variable.value.toFixed(2)} at @${address}`);
        addMem(address, variable.value.toFixed(2));
    });

    let i;

    function step() {
        try {
            let s = assembly.step();
            if (!s) {
                clearInterval(i);
                button.disabled = false;
            };
        } catch (e) {
            let { message } = e;

            if (message.startsWith('ASM:'))
                log("Error: " + e.message);

            else {
                throw e;
            }

            clearInterval(i);
            button.disabled = false;
        }
    }

    i = setInterval(step, 1000);

    step();
});
