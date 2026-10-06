/* ===== 10. Exportação e importação ================= */
        function machineJSON() {
            return {
                tipo: 'MAQUINA_TURING',
                versao: 1,
                entrada: sim.input,
                modo_aceitacao: machine.acceptanceMode,
                sigma: machine.inputAlphabet.slice(),
                gamma: machine.tapeAlphabet.slice(),
                branco: BLANK,
                estados: machine.states.map((s) => ({
                    id: s.id, nome: s.name, x: s.x, y: s.y,
                    inicial: !!s.initial, aceitacao: !!s.accept, rejeicao: !!s.reject
                })),
                transicoes: machine.transitions.map((t) => ({
                    id: t.id, de: t.from, para: t.to,
                    le: t.read, escreve: t.write, move: t.move
                }))
            };
        }
        function downloadText(name, text, mime) {
            const blob = new Blob([text], { type: mime || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = name;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1500);
        }
        function exportToJSON() {
            downloadText('maquina-turing.json', JSON.stringify(machineJSON(), null, 2), 'application/json');
            toast('JSON exportado');
        }
        /* PNG sempre em fundo branco e paleta clara (serve para slides e artigos), com a máquina inteira enquadrada. */
        function buildPNGDataURL() {
            const wasDark = isDark();
            const saved = { x: view.x, y: view.y, scale: view.scale };
            const k = 3, w = canvas.clientWidth, h = canvas.clientHeight;
            document.documentElement.classList.remove('dark');
            exportMode = true;
            fitView();
            canvas.width = Math.max(1, w * k);
            canvas.height = Math.max(1, h * k);
            gctx.setTransform(k, 0, 0, k, 0, 0);
            draw();
            const tmp = document.createElement('canvas');
            tmp.width = canvas.width;
            tmp.height = canvas.height;
            const c = tmp.getContext('2d');
            c.fillStyle = '#ffffff';
            c.fillRect(0, 0, tmp.width, tmp.height);
            c.drawImage(canvas, 0, 0);
            const url = tmp.toDataURL('image/png');
            exportMode = false;
            if (wasDark) document.documentElement.classList.add('dark');
            view.x = saved.x; view.y = saved.y; view.scale = saved.scale;
            resizeCanvas();
            return url;
        }
        function exportToPNG() {
            if (!machine.states.length) return toast('Não há nada para exportar: a máquina está vazia', 'warn');
            const a = document.createElement('a');
            a.href = buildPNGDataURL();
            a.download = 'maquina-turing.png';
            document.body.appendChild(a); a.click(); a.remove();
            toast('PNG exportado (fundo branco)');
        }
        function texSym(s) {
            if (s === BLANK) return 'B';   // símbolo de branco (igual aos slides)
            return String(s).replace(/\\/g, '\\textbackslash{}').replace(/([_%&#{}^~])/g, '\\$1').replace(/\s/g, '\\,');
        }
        function texState(name) {
            const m = splitName(name);   // q0 -> q_{0}, qa -> q_{a}, qr -> q_{r}
            return '$' + (m ? m.base + '_{' + m.sub + '}' : String(name)) + '$';
        }
        function generateTikZ() {
            const L = [];
            L.push('% Preâmbulo sugerido:');
            L.push('% \\usepackage[utf8]{inputenc}  \\usepackage[T1]{fontenc}  \\usepackage{tikz}');
            L.push('% \\usetikzlibrary{automata,positioning,arrows.meta}');
            L.push('');
            L.push('% Sigma = { ' + machine.inputAlphabet.join(', ') + ' }');
            L.push('% Gamma = { ' + machine.tapeAlphabet.join(', ') + ' }  (branco = B)');
            L.push('\\begin{tikzpicture}[shorten >=1pt, node distance=2.4cm, on grid, auto, >=stealth, initial text={}]');
            L.push('  % Estados');
            for (const s of machine.states) {
                const opts = ['state'];
                if (s.initial) opts.push('initial');
                if (s.accept) opts.push('accepting');
                if (s.reject) opts.push('draw=red!70!black', 'fill=red!10');   // estado de rejeição
                L.push('  \\node[' + opts.join(', ') + '] (' + s.id + ') at ('
                    + (s.x / 100).toFixed(2) + ', ' + (-s.y / 100).toFixed(2) + ') {' + texState(s.name) + '};');
            }
            L.push('');
            L.push('  % Regras de delta: le -> escreve, movimento (regras do mesmo par de estados dividem uma seta)');
            if (!machine.transitions.length) {
                L.push('  % (nenhuma regra cadastrada)');
            } else {
                const groups = new Map();
                for (const t of machine.transitions) {
                    const k = t.from + '->' + t.to;
                    if (!groups.has(k)) groups.set(k, []);
                    groups.get(k).push(t);
                }
                L.push('  \\path[->]');
                const keys = [...groups.keys()];
                keys.forEach((k, i) => {
                    const list = groups.get(k);
                    const from = list[0].from, to = list[0].to;
                    const labels = list.map((t) => '$' + texSym(t.read) + ' \\mapsto ' + texSym(t.write) + ',\\,' + t.move + '$').join(' \\\\ ');
                    const opts = from === to ? 'loop above' : (groups.has(to + '->' + from) ? 'bend left=20' : '');
                    const end = (i === keys.length - 1) ? ';' : '';
                    L.push('    (' + from + ') edge' + (opts ? '[' + opts + ']' : '') + ' node[align=center] {' + labels + '} (' + to + ')' + end);
                });
            }
            L.push('\\end{tikzpicture}');
            const b = sim.branches[sim.selected];
            if (b) {
                const r = tapeWindow || computeTapeRange(b);
                const cells = [];
                for (let p = r.from; p <= r.to; p++) {
                    const body = texSym(tapeGet(b, p));
                    cells.push(p === b.head ? '\\mathbf{' + body + '}' : body);
                }
                L.push('');
                L.push('% Fita do ramo ' + b.id + ' no passo ' + sim.index + ' (cabeçote em negrito), posições '
                    + r.from + '..' + r.to);
                L.push('\\[');
                L.push('\\begin{array}{|' + 'c|'.repeat(cells.length) + '}');
                L.push('\\hline');
                L.push(' ' + cells.join(' & ') + ' \\\\');
                L.push('\\hline');
                L.push('\\end{array}');
                L.push('\\]');
            }
            return L.join('\n');
        }
        /* Documento completo e compilável (classe standalone): basta compilar o .tex, sem montar o preâmbulo. */
        function generateFullTeX() {
            return [
                '\\documentclass[border=10pt,varwidth]{standalone}',
                '\\usepackage[utf8]{inputenc}',
                '\\usepackage[T1]{fontenc}',
                '\\usepackage{tikz}',
                '\\usetikzlibrary{automata,positioning,arrows.meta}',
                '\\begin{document}',
                generateTikZ(),
                '\\end{document}',
                ''
            ].join('\n');
        }
        function downloadFullTeX() {
            downloadText('maquina-turing.tex', generateFullTeX(), 'text/x-tex');
            toast('Documento .tex completo baixado');
        }
        function exportToLaTeX() {
            $('latex-code-textarea').value = generateTikZ();
            $('latex-modal').classList.remove('hidden');
        }
        function copyLatexCode() {
            const ta = $('latex-code-textarea');
            ta.select();
            try { document.execCommand('copy'); toast('Código copiado'); }
            catch (e) { toast('Copie manualmente (Ctrl+C)', 'warn'); }
        }
        function copyTikZ() {
            const code = generateTikZ();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(code)
                    .then(() => toast('TikZ copiado para a área de transferência'))
                    .catch(() => {
                        $('latex-code-textarea').value = code;
                        $('latex-modal').classList.remove('hidden');
                        copyLatexCode();
                    });
            } else {
                $('latex-code-textarea').value = code;
                $('latex-modal').classList.remove('hidden');
                copyLatexCode();
            }
        }
        function normSym(v) {
            const s = String(v === undefined || v === null ? '' : v);
            return (s === BLANK || s === '_' || s === '␣' || s === '□' || s === '') ? BLANK : s;
        }
        function applyImported(d) {
            if (!d || !Array.isArray(d.estados)) throw new Error('campo "estados" ausente');
            stopRun();
            pushHistory();
            const sigma = Array.isArray(d.sigma) ? d.sigma.map(String) : ['a'];
            const gamma = Array.isArray(d.gamma) ? d.gamma.map(String) : sigma.slice();
            machine = {
                states: [], transitions: [],
                inputAlphabet: sigma.length ? sigma : ['a'],
                tapeAlphabet: gamma.length ? gamma : sigma.slice(),
                acceptanceMode: (d.modo_aceitacao === 'halt') ? 'halt' : 'accept_state',
                seq: 1
            };
            const map = {};
            for (const s of d.estados) {
                const st = addState(Number(s.x) || 200, Number(s.y) || 200, {
                    name: String(s.nome || s.name || ''),
                    initial: !!(s.inicial || s.initial),
                    accept: !!(s.aceitacao || s.accept),
                    reject: !!(s.rejeicao || s.reject)
                });
                map[s.id] = st.id;
            }
            const list = Array.isArray(d.transicoes) ? d.transicoes : [];
            for (const t of list) {
                const from = map[t.de], to = map[t.para];
                if (!from || !to) continue;
                const mv = ['L', 'R', 'S'].includes(String(t.move)) ? String(t.move) : 'R';
                machine.transitions.push({
                    id: 't' + (machine.seq++), from: from, to: to,
                    read: normSym(t.le), write: normSym(t.escreve), move: mv
                });
            }
            $('input-alphabet-field').value = machine.inputAlphabet.join(' ');
            $('tape-alphabet-field').value = machine.tapeAlphabet.join(' ');
            setAcceptanceRadio(machine.acceptanceMode);
            const w = (typeof d.entrada === 'string') ? d.entrada : '';
            $('input-string-field').value = w;
            sim.input = w;
            resetSimulation(false);
            renderAll();
            fitView();
            draw();
        }
        function importFromJSON(ev) {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    applyImported(JSON.parse(String(reader.result)));
                    toast('Máquina importada de ' + file.name);
                } catch (err) {
                    toast('Falha ao importar: ' + err.message, 'err');
                }
                ev.target.value = '';
            };
            reader.readAsText(file);
        }
