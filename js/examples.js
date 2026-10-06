/* ===== 9. Biblioteca de exemplos ================= */
        const examples = {
            an_bbb: {
                label: 'aⁿbⁿ',
                sigma: ['a', 'b'], gamma: ['a', 'b', 'X', 'Y'],
                input: 'aabb', mode: 'accept_state',
                states: [
                    { name: 'q0', x: 140, y: 210, initial: true },
                    { name: 'q1', x: 340, y: 110 },
                    { name: 'q2', x: 560, y: 110 },
                    { name: 'q3', x: 760, y: 210 },
                    { name: 'q4', x: 900, y: 330, accept: true }
                ],
                rules: [
                    ['q0', 'a', 'q1', 'X', 'R'],
                    ['q0', 'X', 'q0', 'X', 'R'],
                    ['q0', 'Y', 'q3', 'Y', 'R'],
                    ['q1', 'a', 'q1', 'a', 'R'],
                    ['q1', 'Y', 'q1', 'Y', 'R'],
                    ['q1', 'b', 'q2', 'Y', 'L'],
                    ['q2', 'a', 'q2', 'a', 'L'],
                    ['q2', 'b', 'q2', 'b', 'L'],
                    ['q2', 'Y', 'q2', 'Y', 'L'],
                    ['q2', 'X', 'q0', 'X', 'R'],
                    ['q3', 'X', 'q3', 'X', 'R'],
                    ['q3', 'Y', 'q3', 'Y', 'R'],
                    ['q3', BLANK, 'q4', BLANK, 'S']
                ]
            },
            zero_one: {
                label: '0ⁿ1ⁿ (aula)',
                sigma: ['0', '1'], gamma: ['0', '1', 'x', 'y'],
                input: '0011', mode: 'accept_state',
                states: [
                    { name: 'q0', x: 140, y: 300, initial: true },
                    { name: 'q1', x: 400, y: 110 },
                    { name: 'q2', x: 620, y: 500 },
                    { name: 'q3', x: 760, y: 300 },
                    { name: 'qa', x: 1020, y: 300, accept: true },
                    { name: 'qr', x: 1020, y: 520, reject: true }
                ],
                rules: [
                    ['q0', '0', 'q1', 'x', 'R'],
                    ['q0', 'y', 'q3', 'y', 'R'],
                    ['q0', '1', 'qr', '1', 'S'],
                    ['q0', BLANK, 'qr', BLANK, 'S'],
                    ['q1', '0', 'q1', '0', 'R'],
                    ['q1', 'y', 'q1', 'y', 'R'],
                    ['q1', '1', 'q2', 'y', 'L'],
                    ['q1', BLANK, 'qr', BLANK, 'S'],
                    ['q2', '0', 'q2', '0', 'L'],
                    ['q2', 'y', 'q2', 'y', 'L'],
                    ['q2', 'x', 'q0', 'x', 'R'],
                    ['q3', 'y', 'q3', 'y', 'R'],
                    ['q3', BLANK, 'qa', BLANK, 'S'],
                    ['q3', '0', 'qr', '0', 'S'],
                    ['q3', '1', 'qr', '1', 'S'],
                    ['q3', 'x', 'qr', 'x', 'S']
                ]
            },
            palindrome: {
                label: 'palíndromo',
                sigma: ['a', 'b'], gamma: ['a', 'b', 'X', 'Y'],
                input: 'abba', mode: 'accept_state',
                states: [
                    { name: 'q0', x: 130, y: 220, initial: true },
                    { name: 'q1', x: 330, y: 110 },
                    { name: 'q2', x: 540, y: 110 },
                    { name: 'q3', x: 330, y: 330 },
                    { name: 'q4', x: 540, y: 330 },
                    { name: 'q5', x: 740, y: 220 },
                    { name: 'q6', x: 920, y: 220, accept: true }
                ],
                rules: [
                    ['q0', 'a', 'q1', 'X', 'R'],
                    ['q0', 'b', 'q2', 'Y', 'R'],
                    ['q0', 'X', 'q0', 'X', 'R'],
                    ['q0', 'Y', 'q0', 'Y', 'R'],
                    ['q0', BLANK, 'q6', BLANK, 'S'],
                    ['q1', 'a', 'q1', 'a', 'R'],
                    ['q1', 'b', 'q1', 'b', 'R'],
                    ['q1', 'X', 'q1', 'X', 'R'],
                    ['q1', 'Y', 'q1', 'Y', 'R'],
                    ['q1', BLANK, 'q3', BLANK, 'L'],
                    ['q2', 'a', 'q2', 'a', 'R'],
                    ['q2', 'b', 'q2', 'b', 'R'],
                    ['q2', 'X', 'q2', 'X', 'R'],
                    ['q2', 'Y', 'q2', 'Y', 'R'],
                    ['q2', BLANK, 'q4', BLANK, 'L'],
                    ['q3', 'a', 'q5', BLANK, 'L'],
                    ['q3', 'X', 'q5', 'X', 'L'],
                    ['q4', 'b', 'q5', BLANK, 'L'],
                    ['q4', 'Y', 'q5', 'Y', 'L'],
                    ['q5', 'a', 'q5', 'a', 'L'],
                    ['q5', 'b', 'q5', 'b', 'L'],
                    ['q5', 'X', 'q0', 'X', 'R'],
                    ['q5', 'Y', 'q0', 'Y', 'R'],
                    ['q5', BLANK, 'q0', BLANK, 'R']
                ]
            },
            unary_plus: {
                label: 'soma unária',
                sigma: ['1', '+'], gamma: ['1', '+'],
                input: '11+111', mode: 'accept_state',
                states: [
                    { name: 'q0', x: 220, y: 210, initial: true },
                    { name: 'q1', x: 480, y: 210 },
                    { name: 'q2', x: 720, y: 210, accept: true }
                ],
                rules: [
                    ['q0', '1', 'q0', '1', 'R'],
                    ['q0', '+', 'q1', BLANK, 'R'],
                    ['q1', '1', 'q1', '1', 'R'],
                    ['q1', BLANK, 'q2', BLANK, 'S']
                ]
            },
            copy: {
                label: 'cópia',
                sigma: ['a', 'b'], gamma: ['a', 'b', 'X', 'Y', '#'],
                input: 'ab', mode: 'accept_state',
                states: [
                    { name: 'q0', x: 110, y: 400, initial: true },
                    { name: 'q4', x: 330, y: 560 },
                    { name: 'q2', x: 560, y: 260 },
                    { name: 'q3', x: 860, y: 70 },
                    { name: 'q5', x: 860, y: 520 },
                    { name: 'q7', x: 1200, y: 260 },
                    { name: 'q8', x: 1460, y: 260, accept: true }
                ],
                rules: [
                    ['q0', 'a', 'q0', 'a', 'R'],
                    ['q0', 'b', 'q0', 'b', 'R'],
                    ['q0', BLANK, 'q4', '#', 'L'],
                    ['q4', 'a', 'q4', 'a', 'L'],
                    ['q4', 'b', 'q4', 'b', 'L'],
                    ['q4', 'X', 'q4', 'X', 'L'],
                    ['q4', 'Y', 'q4', 'Y', 'L'],
                    ['q4', '#', 'q4', '#', 'L'],
                    ['q4', BLANK, 'q2', BLANK, 'R'],
                    ['q2', 'a', 'q3', 'X', 'R'],
                    ['q2', 'b', 'q5', 'Y', 'R'],
                    ['q2', 'X', 'q2', 'X', 'R'],
                    ['q2', 'Y', 'q2', 'Y', 'R'],
                    ['q2', '#', 'q7', '#', 'L'],
                    ['q3', 'a', 'q3', 'a', 'R'],
                    ['q3', 'b', 'q3', 'b', 'R'],
                    ['q3', 'X', 'q3', 'X', 'R'],
                    ['q3', 'Y', 'q3', 'Y', 'R'],
                    ['q3', '#', 'q3', '#', 'R'],
                    ['q3', BLANK, 'q4', 'a', 'L'],
                    ['q5', 'a', 'q5', 'a', 'R'],
                    ['q5', 'b', 'q5', 'b', 'R'],
                    ['q5', 'X', 'q5', 'X', 'R'],
                    ['q5', 'Y', 'q5', 'Y', 'R'],
                    ['q5', '#', 'q5', '#', 'R'],
                    ['q5', BLANK, 'q4', 'b', 'L'],
                    ['q7', 'a', 'q7', 'a', 'L'],
                    ['q7', 'b', 'q7', 'b', 'L'],
                    ['q7', 'X', 'q7', 'a', 'L'],
                    ['q7', 'Y', 'q7', 'b', 'L'],
                    ['q7', '#', 'q8', BLANK, 'R'],
                    ['q7', BLANK, 'q8', BLANK, 'R']
                ]
            },
            loop: {
                label: 'não para',
                sigma: ['a'], gamma: ['a'],
                input: 'a', mode: 'accept_state',
                states: [
                    { name: 'q0', x: 260, y: 210, initial: true },
                    { name: 'q1', x: 520, y: 210 }
                ],
                rules: [
                    ['q0', 'a', 'q1', 'a', 'R'],
                    ['q0', BLANK, 'q1', BLANK, 'R'],
                    ['q1', 'a', 'q0', 'a', 'L'],
                    ['q1', BLANK, 'q0', BLANK, 'L']
                ]
            },
            nd_guess: {
                label: 'MTN (ramais)',
                sigma: ['a', 'b'], gamma: ['a', 'b'],
                input: 'bba', mode: 'accept_state',
                states: [
                    { name: 'q0', x: 220, y: 210, initial: true },
                    { name: 'q1', x: 480, y: 110 },
                    { name: 'q2', x: 720, y: 110, accept: true }
                ],
                rules: [
                    ['q0', 'a', 'q0', 'a', 'R'],
                    ['q0', 'a', 'q1', 'a', 'R'],
                    ['q0', 'b', 'q0', 'b', 'R'],
                    ['q1', 'a', 'q1', 'a', 'R'],
                    ['q1', 'b', 'q1', 'b', 'R'],
                    ['q1', BLANK, 'q2', BLANK, 'S']
                ]
            }
        };
        function loadExample(key) {
            const ex = examples[key];
            if (!ex) return toast('Exemplo desconhecido', 'err');
            stopRun();
            pushHistory();
            machine = {
                states: [], transitions: [],
                inputAlphabet: ex.sigma.slice(),
                tapeAlphabet: ex.gamma.slice(),
                acceptanceMode: ex.mode || 'accept_state',
                seq: 1
            };
            const byName = {};
            for (const s of ex.states) {
                const st = addState(s.x, s.y, { name: s.name, initial: s.initial, accept: s.accept, reject: s.reject });
                byName[s.name] = st.id;
            }
            for (const r of ex.rules) {
                machine.transitions.push({
                    id: 't' + (machine.seq++),
                    from: byName[r[0]], read: r[1], to: byName[r[2]], write: r[3], move: r[4]
                });
            }
            $('input-alphabet-field').value = machine.inputAlphabet.join(' ');
            $('tape-alphabet-field').value = machine.tapeAlphabet.join(' ');
            setAcceptanceRadio(machine.acceptanceMode);
            $('input-string-field').value = ex.input;
            sim.input = ex.input;
            resetSimulation(false);
            renderAll();
            fitView();
            draw();
            toast('Exemplo carregado: ' + ex.label + ' · entrada "' + ex.input + '"');
        }
