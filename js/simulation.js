/* ===== 7. Simulação: motor puro + rastreamento pré-computado ================= */
/*
  A computação inteira é calculada de uma vez (buildFrames) e guardada como uma lista de "quadros".
  Cada quadro é uma foto de todos os ramos naquele passo. Assim o usuário pode avançar, voltar,
  pular para qualquer passo ou dar Play, como no simulador de Autômatos de Pilha.
  sim.branches sempre contém os ramos do quadro que está sendo exibido (sim.index).
*/
let sim = { frames: [], index: 0, branches: [], selected: 0, input: 'aabb', playing: false, timer: null, maxSteps: 250 };
let tapeWindow = null;

const tapeGet = (b, pos) => (b.tape.has(pos) ? b.tape.get(pos) : BLANK);
function tapeSet(b, pos, sym) { if (sym === BLANK) b.tape.delete(pos); else b.tape.set(pos, sym); }
const matchingRules = (stateId, sym) => machine.transitions.filter((t) => t.from === stateId && t.read === sym);

/* Descrição instantânea (configuração): conteúdo da fita com o estado inserido antes do símbolo sob o cabeçote. */
function cfgSnap(b) {
    let lo = b.head, hi = b.head;
    for (const k of b.tape.keys()) { if (k < lo) lo = k; if (k > hi) hi = k; }
    const cells = [];
    for (let p = lo; p <= hi; p++) cells.push(tapeGet(b, p));
    return { s: b.state, h: b.head - lo, c: cells };
}
function cfgHTML(c) {
    const left = c.c.slice(0, c.h).join(' ');
    const here = c.c[c.h];
    const rest = c.c.slice(c.h + 1).join(' ');
    return (left ? '<span>' + left + '</span> ' : '') +
        '<b class="text-rose-500">' + stateHTML((stateById(c.s) || {}).name || '?') + '</b> ' +
        '<span class="font-bold underline decoration-rose-500">' + here + '</span>' + (rest ? ' <span>' + rest + '</span>' : '');
}
function makeBranch(id, stateId, input) {
    const tape = new Map();
    for (let i = 0; i < input.length; i++) if (input[i] !== BLANK) tape.set(i, input[i]);
    return { id, state: stateId, head: 0, tape, steps: 0, status: 'active', history: [], wrotePos: null, note: '', lastT: null };
}
function cloneBranch(b, id) {
    return {
        id, state: b.state, head: b.head, tape: new Map(b.tape), steps: b.steps,
        status: 'active', history: b.history.slice(), wrotePos: null, note: b.note, lastT: null
    };
}
function applyRule(b, t) {
    const read = tapeGet(b, b.head);
    tapeSet(b, b.head, t.write);
    const entry = { state: b.state, pos: b.head, read, write: t.write, move: t.move, to: t.to, tid: t.id };
    b.history.push(entry);
    b.state = t.to;
    b.lastT = t.id;
    b.wrotePos = (read !== t.write) ? b.head : null;
    if (t.move === 'R') b.head += 1; else if (t.move === 'L') b.head -= 1;
    b.steps += 1;
    entry.cfg = cfgSnap(b);
    const st = stateById(b.state);
    if (st && st.reject) {
        b.status = 'rejected';
        b.note = 'halt em estado de rejeição ' + pretty(st.name);
    } else if (st && st.accept && machine.acceptanceMode === 'accept_state') {
        b.status = 'accepted';
        b.note = 'halt em estado de aceitação ' + pretty(st.name);
    } else if (b.steps >= sim.maxSteps) {
        b.status = 'timeout';
        b.note = 'limite de ' + sim.maxSteps + ' passos atingido';
    }
}
function haltBranch(b, sym) {
    const st = stateById(b.state);
    const label = pretty((st || {}).name || '?');
    b.lastT = null;
    b.wrotePos = null;
    if (st && st.reject) { b.status = 'rejected'; b.note = 'parada em estado de rejeição ' + label; }
    else if (st && st.accept) { b.status = 'accepted'; b.note = 'halt em q_acc ' + label; }
    else if (machine.acceptanceMode === 'halt') { b.status = 'accepted'; b.note = 'parada natural em ' + label; }
    else { b.status = 'rejected'; b.note = 'sem δ para (' + label + ', ' + (sym === BLANK ? BLANK : sym) + ')'; }
}
/* Avança todos os ramos ativos de 'list' em um passo. Devolve false quando não havia ramo ativo. */
function advance(list) {
    const active = list.filter((b) => b.status === 'active');
    if (!active.length) return false;
    if (list.length > 300) {
        active.forEach((b) => { b.status = 'timeout'; b.note = 'explosão de ramais nondeterminísticos'; });
        return true;
    }
    const extra = [];
    for (const b of active) {
        const sym = tapeGet(b, b.head);
        const rules = matchingRules(b.state, sym);
        if (!rules.length) { haltBranch(b, sym); continue; }
        for (let i = 1; i < rules.length; i++) {
            const nb = cloneBranch(b, list.length + extra.length);
            nb.note = 'alternativa ' + (i + 1) + ' de δ(' + pretty((stateById(b.state) || {}).name) + ', ' + (sym === BLANK ? BLANK : sym) + ')';
            applyRule(nb, rules[i]);
            extra.push(nb);
        }
        applyRule(b, rules[0]);
    }
    list.push(...extra);
    return true;
}
function statusOf(list) {
    if (!list.length) return 'idle';
    if (list.some((b) => b.status === 'accepted')) return 'accepted';
    if (list.every((b) => b.status !== 'active')) return list.some((b) => b.status === 'timeout') ? 'timeout' : 'rejected';
    return 'running';
}
const snapBranch = (b) => ({
    id: b.id, state: b.state, head: b.head, tape: new Map(b.tape), steps: b.steps, status: b.status,
    history: b.history, hlen: b.history.length, wrotePos: b.wrotePos, note: b.note, lastT: b.lastT
});
const viewBranch = (f) => ({
    id: f.id, state: f.state, head: f.head, tape: new Map(f.tape), steps: f.steps, status: f.status,
    history: f.history.slice(0, f.hlen), wrotePos: f.wrotePos, note: f.note, lastT: f.lastT
});
/* Calcula todos os quadros da computação sobre 'input'. Para quando algum ramo aceita ou nenhum está ativo. */
function buildFrames(input) {
    const ini = initialState();
    if (!ini) return [];
    const list = [makeBranch(0, ini.id, input)];
    const frames = [list.map(snapBranch)];
    let guard = 0;
    while (guard++ < sim.maxSteps + 5 && !list.some((b) => b.status === 'accepted') && advance(list)) {
        frames.push(list.map(snapBranch));
    }
    return frames;
}

/* ---- Controle de exibição e reprodução ---- */
function showFrame(i) {
    if (!sim.frames.length) { updateBanner(); renderAll(); return; }
    sim.index = Math.max(0, Math.min(sim.frames.length - 1, i));
    sim.branches = sim.frames[sim.index].map(viewBranch);
    if (sim.selected >= sim.branches.length) sim.selected = 0;
    updateBanner();
    renderAll();
}
function resetSimulation(announce) {
    stopRun();
    tapeWindow = null;
    sim.selected = 0;
    sim.frames = buildFrames(sim.input);
    sim.index = 0;
    sim.branches = sim.frames.length ? sim.frames[0].map(viewBranch) : [];
    updateBanner();
    if (announce) toast('Fita reiniciada: "' + sim.input + '"');
}
function startSingleSimulation() {
    const raw = $('input-string-field').value.trim();
    const bad = [...new Set([...raw].filter((c) => !machine.inputAlphabet.includes(c)))];
    if (bad.length) {
        const extra = bad.includes(BLANK) ? ' ("' + BLANK + '" é o símbolo branco e não pode estar na entrada)' : '';
        return toast('Símbolo(s) fora de Σ: ' + bad.join(' ') + extra + ' · Σ = ' + machine.inputAlphabet.join(' '), 'err');
    }
    if (!initialState()) return toast('Marque um estado como q₀ para a máquina computar', 'warn');
    sim.input = raw;
    resetSimulation(false);
    renderAll();
    toast('Computação calculada: ' + (sim.frames.length - 1) + ' passo(s). Use Play ou os botões de passo.');
}
const loadInputString = startSingleSimulation;
function stepSimulation() {
    if (!sim.frames.length) resetSimulation(false);
    if (sim.index >= sim.frames.length - 1) { stopRun(); renderAll(); return false; }
    showFrame(sim.index + 1);
    return true;
}
function simStepForward() { if (!stepSimulation() && sim.playing) stopRun(); }
function simStepBack() { stopRun(); if (sim.index > 0) showFrame(sim.index - 1); }
function simStepFirst() { stopRun(); showFrame(0); }
function simStepLast() { stopRun(); showFrame(sim.frames.length - 1); }
function stopRun() {
    if (sim.timer) { clearInterval(sim.timer); sim.timer = null; }
    sim.playing = false;
    const btn = $('btn-play-pause');
    if (btn) {
        btn.textContent = '▶ Play';
        btn.classList.add('bg-indigo-600');
        btn.classList.remove('bg-amber-600');
    }
}
function simTogglePlay() {
    if (sim.playing) { stopRun(); return; }
    if (!sim.frames.length) resetSimulation(false);
    if (!sim.frames.length) return toast('Marque um estado como q₀ para a máquina computar', 'warn');
    if (sim.index >= sim.frames.length - 1) showFrame(0);
    sim.playing = true;
    const btn = $('btn-play-pause');
    btn.textContent = '⏸ Pausar';
    btn.classList.remove('bg-indigo-600');
    btn.classList.add('bg-amber-600');
    const interval = Math.max(60, 1600 - (parseInt($('sim-speed-range').value, 10) || 900));
    sim.timer = setInterval(() => { if (!stepSimulation()) stopRun(); }, interval);
}
const runSimulation = simTogglePlay;
function restartPlayTimer() { if (sim.playing) { stopRun(); simTogglePlay(); } }

function simStatus() {
    const s = statusOf(sim.branches);
    return (s === 'running' && sim.index === 0) ? 'ready' : s;
}
function simActiveStateId() { return (sim.branches[sim.selected] || {}).state || null; }
function simSymbolAtHead() {
    const b = sim.branches[sim.selected];
    return b ? tapeGet(b, b.head) : BLANK;
}
/* Transições aplicadas no passo que está sendo exibido (para destacar no diagrama). */
function simActiveEdgeIds() {
    const ids = new Set();
    if (sim.index === 0) return ids;
    for (const b of sim.branches) if (b.lastT && b.steps === sim.index) ids.add(b.lastT);
    return ids;
}
function updateBanner() {
    const st = simStatus();
    const el = $('sim-result-banner');
    const last = Math.max(0, sim.frames.length - 1);
    const sel = sim.branches[sim.selected] || sim.branches[0] || {};
    const view = {
        idle: ['⚠️', 'Defina o estado inicial', 'Marque um estado como q₀ para a máquina poder computar.', 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800'],
        ready: ['⏳', 'Pronta', 'Entrada "' + sim.input + '" carregada. Clique em Play ou em ▶ para avançar.', 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800'],
        running: ['⚙️', 'Computando…', sim.branches.filter((b) => b.status === 'active').length + ' ramo(s) ativo(s).', 'bg-indigo-500/10 border-indigo-500/40'],
        accepted: ['✅', 'ENTRADA ACEITA', 'A palavra "' + sim.input + '" é aceita' + (sim.branches.length > 1 ? ' — existe ao menos um ramo que aceita.' : '.'), 'bg-emerald-500/10 border-emerald-500/40'],
        rejected: ['❌', 'ENTRADA REJEITADA', 'A palavra "' + sim.input + '" é rejeitada — ' + (sel.note || 'todas as computações pararam sem aceitar') + '.', 'bg-rose-500/10 border-rose-500/40'],
        timeout: ['♾️', 'NÃO PAROU (limite de passos)', 'Nenhuma computação parou em ' + sim.maxSteps + ' passos. Isso não prova que nunca para.', 'bg-amber-500/10 border-amber-500/40']
    }[st];
    el.className = 'p-3 rounded-xl border flex items-center justify-between gap-3 ' + view[3];
    $('sim-status-icon').textContent = view[0];
    $('sim-status-title').textContent = view[1];
    $('sim-status-desc').textContent = view[2];
    $('sim-step-indicator').textContent = 'Passo: ' + sim.index + ' / ' + last;
}

/* ===== 8. Fita, rastreamento, ramos e testes em lote ================= */
function computeTapeRange(b) {
    let lo = 0, hi = Math.max(0, sim.input.length - 1);
    for (const k of b.tape.keys()) { lo = Math.min(lo, k); hi = Math.max(hi, k); }
    lo = Math.min(lo, b.head); hi = Math.max(hi, b.head);
    return { from: lo - 3, to: hi + 3 };
}
function shiftTapeWindow(d) { const vp = $('tape-viewport'); vp.scrollLeft += d * 44; }
function scrollTapeToHead(headEl) {
    const vp = $('tape-viewport');
    if (!headEl || !vp) return;
    const delta = headEl.getBoundingClientRect().left - vp.getBoundingClientRect().left;
    vp.scrollLeft = vp.scrollLeft + delta - vp.clientWidth / 2 + 20;
}
let tapeHeadEl = null;
function centerTapeWindow() { scrollTapeToHead(tapeHeadEl); }
function renderTape() {
    const box = $('tape-cells');
    const b = sim.branches[sim.selected];
    if (!b) {
        box.innerHTML = '<div class="text-[11px] text-slate-500 dark:text-slate-400">Marque um estado inicial q₀ e clique em "Iniciar Simulação" para montar a fita.</div>';
        $('tape-head-info').textContent = '—';
        $('cfg-line').innerHTML = '';
        tapeHeadEl = null;
        return;
    }
    const range = tapeWindow || computeTapeRange(b);
    box.innerHTML = '';
    for (let p = range.from; p <= range.to; p++) {
        const sym = tapeGet(b, p);
        const isHead = p === b.head;
        const isWritten = b.wrotePos === p;
        const cell = document.createElement('div');
        cell.className = 'w-10 shrink-0 rounded-lg border text-center ' + (isHead
            ? 'tape-cell-head border-rose-500 bg-rose-500/10'
            : isWritten
                ? 'tape-cell-written border-indigo-500 bg-indigo-500/10'
                : sym === BLANK
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900');
        cell.innerHTML =
            '<div class="text-[8px] ' + (isWritten ? 'text-indigo-500 font-bold' : 'text-slate-400') + '">' + (isWritten ? '✗ ' + p : p) + '</div>' +
            '<div class="code-font text-sm font-bold ' + (sym === BLANK ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100') + '">' + sym + '</div>' +
            '<div class="text-[10px] ' + (isHead ? 'text-rose-500' : 'text-transparent') + '">▮</div>';
        box.appendChild(cell);
        if (isHead) tapeHeadEl = cell;
    }
    scrollTapeToHead(tapeHeadEl);
    $('cfg-line').innerHTML = cfgHTML(cfgSnap(b));
    const st = stateById(b.state);
    $('tape-head-info').textContent = pretty((st || {}).name || '?') + ' · cabeçote em ' + b.head + ' · lê ' + tapeGet(b, b.head);
}
const ruleText = (h) => 'δ(' + pretty((stateById(h.state) || {}).name) + ', ' + h.read + ') = (' +
    pretty((stateById(h.to) || {}).name) + ', ' + h.write + ', ' + h.move + ')';
function renderTrace() {
    const box = $('trace-list'), empty = $('trace-empty');
    const cur = sim.branches[sim.selected];
    const lastFrame = sim.frames[sim.frames.length - 1];
    const full = cur && lastFrame ? lastFrame.find((f) => f.id === cur.id) : null;
    const hist = full ? full.history.slice(0, full.hlen) : [];
    box.innerHTML = '';
    $('trace-count-badge').textContent = hist.length + ' passo' + (hist.length === 1 ? '' : 's');
    const op = $('trace-op-badge');
    if (!cur) {
        empty.classList.remove('hidden');
        op.textContent = 'Sem computação';
        return;
    }
    empty.classList.add('hidden');
    const done = cur.history.length;
    op.textContent = done ? ruleText(cur.history[done - 1]) : 'Configuração inicial';
    let curRow = null;
    const addRow = (n, title, cfg, ruleHtml) => {
        const row = document.createElement('div');
        row.className = 'p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 cursor-pointer hover:border-indigo-500/60 transition ' +
            (n === done ? 'trace-row-current ' : '') + (n > done ? 'trace-row-future' : '');
        row.title = title + ' — clique para ir até este passo';
        row.onclick = () => { stopRun(); showFrame(n); };
        row.innerHTML = '<div class="flex items-center gap-1.5">' + ruleHtml + '</div>' +
            '<div class="mt-0.5 pl-7 text-[11px] text-slate-600 dark:text-slate-300 break-all"><span class="text-slate-400">⊢</span> ' + cfgHTML(cfg) + '</div>';
        box.appendChild(row);
        if (n === done) curRow = row;
    };
    const first = sim.frames[0] && sim.frames[0].find((f) => f.id === 0);
    if (first) {
        addRow(0, 'Configuração inicial', cfgSnap(first),
            '<span class="text-[9px] font-black text-slate-400 w-6 shrink-0">0</span><span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">início</span>');
    }
    hist.forEach((h, i) => {
        addRow(i + 1, ruleText(h), h.cfg,
            '<span class="text-[9px] font-black text-slate-400 w-6 shrink-0">' + (i + 1) + '</span>' +
            '<span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">' + stateHTML((stateById(h.state) || {}).name) + '</span>' +
            '<span class="text-[10px] text-slate-500 dark:text-slate-400">' + h.read + '→' + h.write + ',' + h.move + '</span>' +
            '<span class="text-slate-400 text-[10px]">⇒</span>' +
            '<span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">' + stateHTML((stateById(h.to) || {}).name) + '</span>' +
            '<span class="text-[9px] text-slate-400 ml-auto">pos ' + h.pos + '</span>');
    });
    if (cur.note) {
        const nt = document.createElement('div');
        nt.className = 'text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1';
        nt.textContent = '⚑ ' + cur.note;
        box.appendChild(nt);
    }
    if (curRow) box.scrollTop = Math.max(0, curRow.offsetTop - box.clientHeight / 2);
}
function selectBranch(i) { sim.selected = i; tapeWindow = null; updateBanner(); renderAll(); }
function renderBranches() {
    const box = $('branch-list');
    box.innerHTML = '';
    $('branch-count-badge').textContent = sim.branches.length + (sim.branches.length === 1 ? ' ramo' : ' ramos');
    if (!sim.branches.length) {
        box.innerHTML = '<span class="text-[11px] text-slate-400 italic">Nenhum ramo: marque q₀ e inicie a simulação.</span>';
        return;
    }
    const labels = { active: 'ativo', accepted: 'aceita', rejected: 'rejeita', timeout: 'sem parada' };
    sim.branches.forEach((b, i) => {
        const st = stateById(b.state);
        const tone = b.status === 'accepted' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            : b.status === 'rejected' ? 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                : b.status === 'timeout' ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-indigo-500/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300';
        const pill = document.createElement('button');
        pill.className = 'text-left px-2.5 py-1.5 rounded-xl border code-font text-[11px] font-semibold transition ' + tone + ' ' +
            (i === sim.selected ? 'ring-2 ring-indigo-500/70' : 'hover:border-indigo-500/60');
        pill.title = b.note || '';
        pill.onclick = () => selectBranch(i);
        pill.innerHTML = '<span class="font-black">ramo ' + b.id + '</span> · ' + stateHTML((st || {}).name || '?') +
            ' · pos ' + b.head + ' · lê ' + tapeGet(b, b.head) + ' · <span class="uppercase text-[9px] font-black">' + labels[b.status] + '</span>';
        box.appendChild(pill);
    });
}

/* ---- Abas e testes em lote ---- */
function switchSimTab(tab) {
    const single = tab === 'single';
    $('tab-content-single').classList.toggle('hidden', !single);
    $('tab-content-batch').classList.toggle('hidden', single);
    const on = 'px-3 py-1.5 rounded-xl text-xs font-bold transition bg-indigo-600 text-white shadow-sm';
    const off = 'px-3 py-1.5 rounded-xl text-xs font-semibold transition text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200';
    $('tab-btn-single').className = single ? on : off;
    $('tab-btn-batch').className = single ? off : on;
}
function runBatchTests() {
    const words = $('batch-input-textarea').value.split('\n').map((w) => w.trim()).filter((w) => w.length);
    const box = $('batch-results-list');
    if (!initialState()) return toast('Marque um estado como q₀ antes de testar', 'warn');
    if (!words.length) return toast('Digite ao menos uma palavra', 'warn');
    const tally = { accepted: 0, rejected: 0, timeout: 0 };
    box.innerHTML = '';
    for (const w of words) {
        const bad = [...new Set([...w].filter((c) => !machine.inputAlphabet.includes(c)))];
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50';
        if (bad.length) {
            row.innerHTML = '<span class="code-font font-bold flex-1 truncate">' + w + '</span><span class="text-[10px] text-slate-400">símbolo fora de Σ: ' + bad.join(' ') + '</span>';
            box.appendChild(row);
            continue;
        }
        const frames = buildFrames(w);
        const finalList = frames[frames.length - 1] || [];
        const status = statusOf(finalList) === 'running' ? 'timeout' : statusOf(finalList);
        tally[status]++;
        const tone = status === 'accepted' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
            : status === 'rejected' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
        const label = { accepted: 'ACEITA', rejected: 'REJEITADA', timeout: 'SEM PARADA' }[status];
        row.innerHTML = '<span class="code-font font-bold flex-1 truncate">' + w + '</span>' +
            '<span class="text-[10px] text-slate-400">' + (frames.length - 1) + ' passos</span>' +
            '<span class="text-[10px] font-black px-1.5 py-0.5 rounded border ' + tone + '">' + label + '</span>';
        const go = document.createElement('button');
        go.className = 'text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold';
        go.textContent = 'Ver';
        go.onclick = () => loadWordToSimulator(w);
        row.appendChild(go);
        box.appendChild(row);
    }
    $('batch-stats-accepted').textContent = tally.accepted + ' Aceitas';
    $('batch-stats-rejected').textContent = tally.rejected + ' Rejeitadas';
    $('batch-stats-timeout').textContent = tally.timeout + ' Sem parada';
}
function loadWordToSimulator(word) {
    $('input-string-field').value = word;
    switchSimTab('single');
    startSingleSimulation();
}
