/* ===== 1. Modelo da Máquina ================= */
        const BLANK = 'B';   // símbolo de branco, como nos slides: M = (Q, Σ, Γ, δ, q₀, B, F). '_', '␣' e '□' também são aceitos na digitação
        const SUB_MAP = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
        const pretty = (s) => {
            const n = splitName(s);
            if (n && /^[ar]$/.test(n.sub)) return n.base + (n.sub === 'a' ? 'ₐ' : 'ᵣ');
            return String(s).split('').map((c) => SUB_MAP[c] || c).join('');
        };
        /* Separa "q12" em {base:'q', sub:'12'} e também "qa"/"qr" (aceita/rejeita) em {base:'q', sub:'a'}. */
        function splitName(name) {
            const str = String(name);
            let m = str.match(/^(.*?)(\d+)$/);
            if (m && m[1]) return { base: m[1], sub: m[2] };
            m = str.match(/^(q)([a-zA-Z])$/);
            if (m) return { base: m[1], sub: m[2] };
            return null;
        }
        const stateHTML = (n) => {
            const p = splitName(n);
            return p ? p.base + '<sub>' + p.sub + '</sub>' : String(n);
        };
        const $ = (id) => document.getElementById(id);

        let machine = {
            states: [],
            transitions: [],
            inputAlphabet: ['a', 'b'],
            tapeAlphabet: ['a', 'b', 'X', 'Y'],
            acceptanceMode: 'accept_state',
            seq: 1
        };

        const hist = { undo: [], redo: [] };
        const snap = () => JSON.stringify(machine);
        function updateUndoRedoButtons() {
            const u = $('btn-undo'), r = $('btn-redo');
            if (u) u.disabled = !hist.undo.length;
            if (r) r.disabled = !hist.redo.length;
        }
        function pushHistory() {
            hist.undo.push(snap());
            if (hist.undo.length > 80) hist.undo.shift();
            hist.redo = [];
            updateUndoRedoButtons();
        }
        function undo() {
            if (!hist.undo.length) return toast('Nada para desfazer', 'warn');
            hist.redo.push(snap());
            machine = JSON.parse(hist.undo.pop());
            afterMachineChange('Desfeito');
        }
        function redo() {
            if (!hist.redo.length) return toast('Nada para refazer', 'warn');
            hist.undo.push(snap());
            machine = JSON.parse(hist.redo.pop());
            afterMachineChange('Refeito');
        }

/* ===== 2. Utilidades ================= */
        const isDark = () => document.documentElement.classList.contains('dark');
        function toggleTheme() { document.documentElement.classList.toggle('dark'); renderAll(); }
        function palette() {
            const d = isDark();
            return {
                grid: d ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.16)',
                fill: d ? '#0f172a' : '#ffffff',
                border: d ? '#818cf8' : '#4f46e5',
                text: d ? '#e2e8f0' : '#0f172a',
                edge: d ? '#94a3b8' : '#64748b',
                accent: '#6366f1',
                accept: '#10b981',
                head: '#f43f5e',
                reject: d ? '#fb7185' : '#e11d48',
                soft: d ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)'
            };
        }
        function toast(msg, kind) {
            const el = $('toast');
            el.textContent = msg;
            el.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-[11px] font-bold shadow-2xl border ' + (
                kind === 'err' ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-300'
                    : kind === 'warn' ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300');
            clearTimeout(toast._t);
            toast._t = setTimeout(() => el.classList.add('hidden'), 2400);
        }
        const stateById = (id) => machine.states.find((s) => s.id === id);
        const transitionById = (id) => machine.transitions.find((t) => t.id === id);
        const acceptStates = () => machine.states.filter((s) => s.accept);
        const rejectStates = () => machine.states.filter((s) => s.reject);
        const initialState = () => machine.states.find((s) => s.initial) || null;

        function parseAlphabet(txt) {
            const out = [];
            for (const raw of String(txt || '').split(/[\s,;]+/)) {
                const tok = raw.trim();
                if (!tok) continue;
                const sym = (tok === BLANK || tok === '␣' || tok === '□' || tok === '_') ? BLANK : tok;
                if (!out.includes(sym)) out.push(sym);
            }
            return out;
        }
        function updateAlphabets() {
            let sigma = parseAlphabet($('input-alphabet-field').value);
            const gamma = parseAlphabet($('tape-alphabet-field').value);
            if (sigma.includes(BLANK)) {
                sigma = sigma.filter((s) => s !== BLANK);
                $('input-alphabet-field').value = sigma.join(' ');
                toast('"' + BLANK + '" é o símbolo branco (B ∉ Σ). Use outro símbolo no alfabeto de entrada.', 'warn');
            }
            const missing = sigma.filter((s) => !gamma.includes(s));
            if (missing.length) {
                gamma.push(...missing);
                $('tape-alphabet-field').value = gamma.join(' ');
                toast('Γ expandido: faltava(m) ' + missing.join(' '), 'warn');
            }
            machine.inputAlphabet = sigma.length ? sigma : ['a'];
            machine.tapeAlphabet = gamma.length ? gamma : machine.inputAlphabet.slice();
            resetSimulation(false);
            renderAll();
        }
        function setAcceptanceRadio(mode) {
            document.querySelectorAll('input[name="acceptanceMode"]').forEach((r) => { r.checked = (r.value === mode); });
        }
        function changeAcceptanceMode(mode) {
            machine.acceptanceMode = mode === 'halt' ? 'halt' : 'accept_state';
            resetSimulation(false);
            renderAll();
            toast('Modo de aceitação atualizado');
        }
        function newStateName() {
            const used = new Set(machine.states.map((s) => s.name));
            let i = 0;
            while (used.has('q' + i)) i++;
            return 'q' + i;
        }
        function addState(x, y, opts) {
            const o = opts || {};
            const st = {
                id: 's' + (machine.seq++),
                name: o.name || newStateName(),
                x: Math.round(x), y: Math.round(y),
                initial: !!o.initial, accept: !!o.accept, reject: !!o.reject
            };
            machine.states.push(st);
            return st;
        }
        function afterEdit() { resetSimulation(false); renderAll(); }
        function afterMachineChange(msg) {
            resetSimulation(false);
            renderAll();
            if (msg) toast(msg);
        }

/* ===== 3. Persistência no navegador (localStorage) ================= */
const STORAGE_KEY = 'mt_modelador_v1';
let lastSaved = '';
function saveToLocalStorage() {
    try {
        const payload = JSON.stringify({ machine, input: sim.input, theme: isDark() ? 'dark' : 'light' });
        if (payload === lastSaved) return;
        localStorage.setItem(STORAGE_KEY, payload);
        lastSaved = payload;
    } catch (e) { /* armazenamento indisponível (modo privado): segue sem salvar */ }
}
/* Devolve true se havia uma máquina salva e ela foi restaurada. */
function restoreFromLocalStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const d = JSON.parse(raw);
        if (!d || !d.machine || !Array.isArray(d.machine.states) || !d.machine.states.length) return false;
        machine = Object.assign({ states: [], transitions: [], inputAlphabet: ['a'], tapeAlphabet: ['a'], acceptanceMode: 'accept_state', seq: 1 }, d.machine);
        machine.states.forEach((s) => { s.reject = !!s.reject; });
        sim.input = typeof d.input === 'string' ? d.input : '';
        if (d.theme === 'light') document.documentElement.classList.remove('dark');
        $('input-alphabet-field').value = machine.inputAlphabet.join(' ');
        $('tape-alphabet-field').value = machine.tapeAlphabet.join(' ');
        setAcceptanceRadio(machine.acceptanceMode);
        $('input-string-field').value = sim.input;
        lastSaved = raw;
        return true;
    } catch (e) { return false; }
}
