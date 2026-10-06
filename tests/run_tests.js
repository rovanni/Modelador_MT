const { els, documentStub } = require('./_harness.js');
const tm = globalThis.__tm;

function tapeStr(b) {
    const r = tm.computeTapeRange(b);
    let out = '';
    for (let i = r.from; i <= r.to; i++) out += tm.tapeGet(b, i);
    return out.replace(/^B+|B+$/g, '');
}

function runAll(key, input, expect) {
    tm.loadExample(key);
    if (input !== undefined) { els['input-string-field'].value = input; }
    const ex = tm.examples[key];
    if (input !== undefined) { tm.sim.input = input; }
    tm.resetSimulation(false);
    let guard = 0;
    while (guard++ < 400) {
        const st = tm.sim.branches.some((b) => b.status === 'active');
        if (!st) break;
        if (!tm.stepSimulation()) break;
    }
    const branches = tm.sim.branches;
    const accepted = branches.filter((b) => b.status === 'accepted').length;
    const b0 = branches[0];
    console.log('--- ' + key + '  input="' + tm.sim.input + '"  states=' + tm.machine.states.length +
        ' rules=' + tm.machine.transitions.length +
        ' branches=' + branches.length + ' accepted=' + accepted +
        ' overall=' + tm.simStatus() + ' branch0=' + (b0 ? b0.status : 'n/a'));
    if (b0) console.log('    tape: ' + tapeStr(b0) + '  head=' + b0.head + '  steps=' + b0.steps + '  note=' + (b0.note || ''));
    const overall = tm.simStatus();
    const ok = !expect || overall === expect;
    if (ok) passCount++; else failCount++;
    console.log('    expect=' + (expect || '-') + ' => ' + (ok ? 'PASS' : 'FAIL'));
    return overall;
}

let passCount = 0, failCount = 0;

const cases = [
    ['an_bbb', 'ab', 'accepted'],
    ['an_bbb', 'aabb', 'accepted'],
    ['an_bbb', 'aaabbb', 'accepted'],
    ['an_bbb', 'abbb', 'rejected'],
    ['an_bbb', 'aabbb', 'rejected'],
    ['palindrome', 'abba', 'accepted'],
    ['palindrome', 'aba', 'accepted'],
    ['palindrome', 'abab', 'rejected'],
    ['unary_plus', '11+111', 'accepted'],
    ['copy', 'ab', 'accepted'],
    ['copy', 'aab', 'accepted'],
    ['copy', 'abab', 'accepted'],
    ['copy', 'b', 'accepted'],
    ['copy', '', 'accepted'],
    ['zero_one', '01', 'accepted'],
    ['zero_one', '0011', 'accepted'],
    ['zero_one', '000111', 'accepted'],
    ['zero_one', '', 'rejected'],
    ['zero_one', '10', 'rejected'],
    ['zero_one', '0111', 'rejected'],
    ['zero_one', '0001', 'rejected'],
    ['loop', 'a', 'timeout'],
    ['nd_guess', 'bba', 'accepted']
];
for (const [k, inp, exp] of cases) runAll(k, inp, exp);

/* ---- copy transducer correctness check ---- */
console.log('\nCOPY w -> w#w check:');
for (const w of ['', 'a', 'ab', 'aab', 'abab', 'bba']) {
    tm.loadExample('copy');
    tm.sim.input = w;
    tm.resetSimulation(false);
    let g = 0; while (g++ < 600 && tm.sim.branches.some((b) => b.status === 'active')) tm.stepSimulation();
    const b = tm.sim.branches[0];
    const tape = tapeStr(b);
    const expected = w === '' ? '#' : w + '#' + w;
    const good = (tape === expected && b.status === 'accepted');
    if (good) passCount++; else failCount++;
    console.log('  w="' + w + '" tape="' + tape + '" status=' + b.status + ' OK=' + good);
}

/* ---- export / import roundtrip ---- */
tm.loadExample('copy');
const before = tm.machineJSON();
const obj = JSON.parse(JSON.stringify(before));
console.log('\nJSON keys:', Object.keys(obj).join(', '));
console.log('estados=' + obj.estados.length, 'transicoes=' + obj.transicoes.length,
    'sigma=' + obj.sigma.join(''), 'gamma=' + obj.gamma.join(''),
    'mode=' + obj.modo_aceitacao, 'entrada=' + obj.entrada);
tm.applyImported(obj);
const o2 = tm.machineJSON();
console.log('roundtrip estados=' + o2.estados.length, 'transicoes=' + o2.transicoes.length,
    'sigma=' + o2.sigma.join(''), 'mode=' + o2.modo_aceitacao, 'entrada=' + o2.entrada);
const accBefore = obj.estados.filter((s) => s.aceitacao).map((s) => s.nome).join(',');
const accAfter = o2.estados.filter((s) => s.aceitacao).map((s) => s.nome).join(',');
const iniBefore = obj.estados.filter((s) => s.inicial).map((s) => s.nome).join(',');
const iniAfter = o2.estados.filter((s) => s.inicial).map((s) => s.nome).join(',');
const rtOk = o2.estados.length === obj.estados.length &&
    o2.transicoes.length === obj.transicoes.length &&
    o2.sigma.join('') === obj.sigma.join('') &&
    o2.gamma.join('') === obj.gamma.join('') &&
    o2.modo_aceitacao === obj.modo_aceitacao &&
    o2.entrada === obj.entrada &&
    accBefore === accAfter && iniBefore === iniAfter;
console.log('ROUNDTRIP OK:', rtOk);
if (rtOk) passCount++; else failCount++;
console.log('accept before/after:', accBefore, '/', accAfter, ' initial:', iniBefore, '/', iniAfter);
tm.resetSimulation(false);
let g2 = 0; while (g2++ < 400 && tm.sim.branches.some((b) => b.status === 'active')) tm.stepSimulation();
const impStatus = tm.simStatus();
console.log('imported machine sim status:', impStatus);
if (impStatus === 'accepted') passCount++; else failCount++;

/* ---- TikZ ---- */
tm.loadExample('an_bbb');
tm.resetSimulation(false);
tm.stepSimulation();
const tikz = tm.generateTikZ();
console.log('\nTIKZ length=' + tikz.length);
console.log(tikz.split('\n').slice(0, 14).join('\n'));
console.log('...');
console.log(tikz.split('\n').slice(-10).join('\n'));
const tikzOk = tikz.includes('\\begin{tikzpicture}') && tikz.includes('\\end{tikzpicture}')
    && tikz.includes('\\node[state, initial]') && tikz.includes('\\begin{array}')
    && tikz.includes('\\end{array}') && !/\\node\[initial\]/.test(tikz);
console.log('TIKZ OK:', tikzOk);
if (tikzOk) passCount++; else failCount++;

/* ---- zoom / fit ---- */
tm.zoomBy(1.2); tm.zoomBy(1 / 1.2); tm.fitView();
console.log('zoom/fit OK');

/* ---- keyboard shortcuts ---- */
const fire = (init) => {
    const ev = Object.assign({
        target: { tagName: 'DIV' },
        preventDefault() {},
        stopPropagation() {}
    }, init);
    const hs = (tm.listeners.document['keydown'] || []);
    hs.forEach((h) => h(ev));
    return hs.length;
};
tm.loadExample('copy');
const el = documentStub.getElementById('import-file-input');
el.tagName = 'INPUT';
const keys = [
    ['Escape', { key: 'Escape' }],
    ['Ctrl+Z', { key: 'z', ctrlKey: true }],
    ['Ctrl+Y', { key: 'y', ctrlKey: true }],
    ['Ctrl+S', { key: 's', ctrlKey: true }],
    ['Ctrl+E', { key: 'e', ctrlKey: true }],
    ['Ctrl+P', { key: 'p', ctrlKey: true }],
    ['Delete', { key: 'Delete' }],
    ['Space', { key: ' ' }],
    ['ArrowRight', { key: 'ArrowRight' }],
    ['ArrowLeft', { key: 'ArrowLeft' }],
    ['ArrowUp', { key: 'ArrowUp' }],
    ['ArrowDown', { key: 'ArrowDown' }],
    ['r', { key: 'r' }],
    ['F', { key: 'F' }]
];
console.log('\nKEYBOARD:');
let handlers = 0;
for (const [label, init] of keys) {
    try { handlers = fire(init); passCount++; console.log('  ' + label.padEnd(12) + ' OK'); }
    catch (err) { failCount++; console.log('  ' + label.padEnd(12) + ' ERROR: ' + err.message); }
}
console.log('  keydown handlers registered: ' + handlers);
try {
    tm.loadExample('an_bbb');
    const t0 = tm.machine.transitions.length;
    tm.hoverEdge = tm.machine.transitions[2];
    fire({ key: 'Delete' });
    const t1 = tm.machine.transitions.length;
    tm.hoverEdge = null;
    tm.undo();
    const t2 = tm.machine.transitions.length;
    console.log('  Delete-on-edge OK: ' + t0 + ' -> ' + t1 + ' -> undo ' + t2);
    if (t1 === t0 - 1 && t2 === t0) passCount++; else failCount++;
} catch (err) { failCount++; console.log('  delete-edge ERROR: ' + err.message); }
try {
    fire({ key: 'e', ctrlKey: true });
    const open = !documentStub.getElementById('latex-modal').classList.contains('hidden');
    fire({ key: 'Escape' });
    const closed = documentStub.getElementById('latex-modal').classList.contains('hidden');
    console.log('  modal open/close OK: open=' + open + ' closed=' + closed);
    if (open && closed) passCount++; else failCount++;
} catch (err) { failCount++; console.log('  modal ERROR: ' + err.message); }
try {
    fire({ key: 'ArrowRight', target: { tagName: 'INPUT' } });
    console.log('  typing in input ignored OK');
    passCount++;
} catch (err) { failCount++; console.log('  input-guard ERROR: ' + err.message); }
try {
    (tm.listeners.window['resize'] || []).forEach((h) => h({}));
    console.log('  window resize OK');
    passCount++;
} catch (err) { failCount++; console.log('  resize ERROR: ' + err.message); }

const undoOk = (function () {
    tm.loadExample('loop');
    const n0 = tm.machine.states.length;
    tm.undo();
    const n1 = tm.machine.states.length;
    tm.redo();
    const n2 = tm.machine.states.length;
    console.log('undo/redo: ' + n0 + ' -> ' + n1 + ' -> ' + n2);
    return n1 !== n0 && n2 === n0;
})();
console.log('UNDO/REDO OK:', undoOk);
if (undoOk) passCount++; else failCount++;

console.log('\nSUMMARY: PASS=' + passCount + ' FAIL=' + failCount);
console.log('\nALL TESTS DONE');
