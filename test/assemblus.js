
function ticket(str) {
    const start = 96 // "a".charCodeAt(0) - 1
    const len = str.length;
    const out = [...str.toLowerCase()].reduce((out, char, pos) => {
        const val = char.charCodeAt(0) - start
        const pow = Math.pow(26, len - pos - 1);
        return out + val * pow
    }, 0)
    return out;
}

function unticket(num) {
    const start = 96 // "a".charCodeAt(0) - 1
    const out = []
    while (num > 0) {
        const val = num % 26;
        out.unshift(String.fromCharCode(val + start));
        num = Math.floor(num / 26);
    }
    return out.join('');
}

export default class Assembly {
    constructor(code, start = 0) {
        this.code = code;
        this.start = start;

        this.events = [];
        this.accumulator = {
            type: 'number',
            value: 0
        };

        this.memory = {
            "100": {
                type: 'number',
                value: 99
            }
        };

        this.read = async (p = ">> ") => {
            return parseFloat(prompt(p));
        };

        this.write = async (value) => {
            console.log(value);
        }

        this.tokens = [];
        this.instructions = [];

        this.tokenize();
        this.parse();

        this.index = 0;
    }

    evaluate(instruction) {
        switch (instruction.type) {
            case "ADD":
            case "SUB":
            case "MULT":
            case "DIV":
                this.arithmetic(instruction);
                break;

            case "LOAD":

                if (instruction.parameter === 'IMM') {
                    return this.set({ type: 'number', value: instruction.value });
                }

                let variable = this.memory[instruction.value];

                if (!variable) {
                    throw new Error(`ASM: Variable '${instruction.value}' not found`);
                }

                if (instruction.parameter === 'D') {
                    this.set({ type: 'number', value: variable.value });
                }

                else {
                    throw new Error(`ASM: Parameter '${instruction.parameter}' is not supported.`);
                }
                break;

            case "STORE":
                if (instruction.parameter === 'D') {
                    this.memory[instruction.value] = this.accumulator;

                    this.trigger('store', { address: unticket(instruction.value), variable: this.accumulator });
                }

                else {
                    throw new Error(`ASM: Parameter '${instruction.parameter}' is not supported.`);
                }
                break;

            case "READ":
                this.read("Enter Input: ").then(value => {
                    this.set({ type: 'number', value });
                });
                break;

            case "WRITE":
                this.write(this.accumulator.value);
                break;

            default:
                throw new Error(`ASM: Invalid instruction '${instruction.type}'`);
        }

    }

    arithmetic(instruction) {
        if (instruction.parameter === 'IMM') {
            switch (instruction.type) {
                case "ADD":
                    this.accumulator.value += instruction.value;
                    break;

                case "SUB":
                    this.accumulator.value -= instruction.value;
                    break;

                case "MULT":
                    this.accumulator.value *= instruction.value;
                    break;

                case "DIV":
                    this.accumulator.value /= instruction.value;
                    break;
            }
        }

        else if (instruction.parameter === 'D') {
            let variable = this.memory[instruction.value];

            if (!variable) {
                throw new Error(`ASM: Variable '${instruction.value}' not found`);
            }

            switch (instruction.type) {
                case "ADD":
                    this.accumulator.value += variable.value;
                    break;

                case "SUB":
                    this.accumulator.value -= variable.value;
                    break;

                case "MULT":
                    this.accumulator.value *= variable.value;
                    break;

                case "DIV":
                    this.accumulator.value /= variable.value;
                    break;
            }
        }

        else {
            throw new Error(`ASM: Parameter '${instruction.parameter}' is not supported.`);
        }
    }

    on(event, callback) {
        this.events.push({ event, callback });
    }

    trigger(event, data) {
        this.events.filter(e => e.event === event).forEach(e => e.callback(data));
    }

    set(input) {
        this.accumulator = {
            type: input.type,
            value: input.value
        }
    }

    step() {

        if (this.index >= this.instructions.length) {
            return false;
        }

        let instruction = this.instructions[this.index++];
        this.trigger('step', { accumulator: this.accumulator, number: this.index.toString(16).toUpperCase(), instruction });

        this.evaluate(instruction);


        return true;
    }

    parse() {
        let tokens = this.duplicate('line', this.tokens);

        if (tokens.length === 0) {
            return [];
        }

        tokens.push({ type: 'line', value: '\n' });

        function expect(type) {
            if (tokens[0].type !== type) {
                throw new Error(`ASM: Unexpected token '${tokens[0].value}', expected '${type}'`);
            }

            return tokens.shift();
        }


        let instructions = [];

        while (tokens[0].type === 'line')
            tokens.shift();

        if (tokens[0].type !== 'word')
            throw new Error(`ASM: Unexpected token '${tokens[0].type}'`);

        while (tokens.length > 0) {
            let token = tokens.shift();

            if (token.type === 'word') {

                token.value = token.value.toUpperCase();

                switch (token.value) {
                    case "READ":
                    case "WRITE":
                        expect('line');
                        instructions.push({ type: token.value, value: null, parameter: null });
                        break;

                    default:
                        let word = token.value;

                        if (word.toLowerCase() === 'mul') word = 'MULT';

                        let value = null;
                        if (tokens[0].type === 'number') {
                            value = parseFloat(expect('number').value);
                        }

                        else {
                            let variable = expect('word').value;
                            value = ticket(variable);
                        }

                        expect('symbol');

                        let parameter = expect('word').value;

                        instructions.push({ type: word, value, parameter });
                }
            }

            else if (token.type === 'line') {
                continue;
            }

            else {
                throw new Error(`ASM: Unexpected token '${token.value}'`);
            }
        }

        this.instructions = instructions;
        return instructions;

    }

    duplicate(type, tokens) {
        let newTokens = [];

        for (let i = 0; i < tokens.length - 1; i++) {
            if (tokens[i].type === type && tokens[i + 1].type === type) {
                newTokens.push(tokens[i]);
                i++;
            }

            else {
                newTokens.push(tokens[i]);
            }
        }

        return newTokens;

    }

    tokenize() {

        let characters = this.code.split('');
        characters.push('\n');

        if (characters.length === 0) {
            return [];
        }

        let types = {
            'word': 'word',
            'number': 'number',
            'symbol': 'symbol',
            'line': 'line'
        }

        function isChar(char) {
            return char.match(/[a-z]/i);
        }

        function isComma(char) {
            return char === ',';
        }

        function isNumber(char) {
            return char.match(/[0-9]/);
        }

        function isWhitespace(char) {
            return char.match(/\s/);
        }

        function isLine(char) {
            return char === '\n';
        }

        while (characters.length > 0) {
            if (isLine(characters[0])) {
                characters.shift();
                this.tokens.push({ type: types.line, value: '\n' });
            }

            else if (characters[0] == '*') {
                characters.shift();
                while (characters[0] && characters[0] !== '\n') {
                    characters.shift();
                }
            }


            else if (isChar(characters[0])) {
                let word = characters.shift();

                while (isChar(characters[0])) {
                    word += characters.shift();
                }

                this.tokens.push({ type: types.word, value: word });
            }

            else if (isNumber(characters[0])) {
                let number = characters.shift();

                while (isNumber(characters[0])) {
                    number += characters.shift();
                }

                this.tokens.push({ type: types.number, value: number });
            }

            else if (isComma(characters[0])) {
                characters.shift();
                this.tokens.push({ type: types.symbol, value: ',' });
            }

            else if (isWhitespace(characters[0])) {
                characters.shift();
            }

            else {
                throw new Error(`ASM: Invalid character '${characters[0]}'`);
            }
        }

        return this.tokens;
    }
}
