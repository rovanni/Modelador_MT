/* ===== 5. Painéis: estados e transições ================= */
        function fillStateSelect(sel, selectedId) {
            sel.innerHTML = '';
            for (const s of machine.states) {
                const o = document.createElement('option');
                o.value = s.id;
                o.textContent = pretty(s.name) + (s.initial ? ' (q₀)' : s.accept ? ' (F)' : s.reject ? ' (R)' : '');
                sel.appendChild(o);
            }
            if (selectedId && machine.states.some((s) => s.id === selectedId)) sel.value = selectedId;
        }
        function renderParams() {
            $('state-count').textContent = machine.states.length;
            $('transition-count').textContent = machine.transitions.length;
            const ini = initialState();
            $('param-initial-state').textContent = ini ? pretty(ini.name) : '—';
            const acc = acceptStates();
            $('param-accept-states').textContent = acc.length ? acc.map((s) => pretty(s.name)).join(', ') : '—';
            const rej = rejectStates();
            $('param-reject-states').textContent = rej.length ? rej.map((s) => pretty(s.name)).join(', ') : '—';
        }
        function updateFilterOptions() {
            const sel = $('state-table-filter');
            const keep = sel.value;
            sel.innerHTML = '<option value="all">Todos os Estados</option>';
            for (const s of machine.states) {
                const o = document.createElement('option');
                o.value = s.id; o.textContent = pretty(s.name);
                sel.appendChild(o);
            }
            sel.value = machine.states.some((s) => s.id === keep) ? keep : 'all';
        }
        function deleteTransition(id) {
            pushHistory();
            machine.transitions = machine.transitions.filter((t) => t.id !== id);
            resetSimulation(false);
            renderAll();
            toast('Regra removida');
        }
        function renderTransitionTable() {
            const body = $('transition-table-body');
            const filter = $('state-table-filter').value;
            body.innerHTML = '';
            const list = machine.transitions.filter((t) => filter === 'all' || t.from === filter || t.to === filter);
            if (!list.length) {
                body.innerHTML = '<tr><td colspan="6" class="py-6 px-3 text-center text-slate-400 italic text-[11px]">' +
                    (machine.transitions.length ? 'Nenhuma regra para este estado.' : 'Sem regras de δ. Use "+ Transição" ou Shift + arrastar entre dois estados no diagrama.') + '</td></tr>';
                return;
            }
            const sym = (x) => (x === BLANK ? BLANK : x);
            const activeRules = simActiveEdgeIds();
            let firstActive = null;
            for (const t of list) {
                const a = stateById(t.from), b = stateById(t.to);
                if (!a || !b) continue;
                const nd = machine.transitions.filter((x) => x.from === t.from && x.read === t.read).length > 1;
                const tr = document.createElement('tr');
                const isActive = activeRules.has(t.id);
                tr.className = 'cursor-pointer transition ' + (isActive ? 'bg-indigo-500/20 ring-1 ring-inset ring-indigo-500/60' : 'hover:bg-indigo-500/5');
                if (isActive && !firstActive) firstActive = tr;
                tr.title = 'Clique para editar';
                tr.onclick = () => openTransitionModal(t);
                tr.innerHTML =
                    '<td class="py-2 px-2.5 font-bold code-font text-indigo-600 dark:text-indigo-400">' + stateHTML(a.name) + '</td>' +
                    '<td class="py-2 px-2 text-center font-bold code-font">' + sym(t.read) + '</td>' +
                    '<td class="py-2 px-2 text-center font-bold code-font">' + sym(t.write) + '</td>' +
                    '<td class="py-2 px-2 text-center font-bold code-font">' + t.move + '</td>' +
                    '<td class="py-2 px-2.5 font-bold code-font text-emerald-600 dark:text-emerald-400">' + stateHTML(b.name) + '</td>' +
                    '<td class="py-2 px-2 text-center whitespace-nowrap">' +
                    (nd ? '<span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 mr-1" title="Não determinismo: outra regra para o mesmo (estado, símbolo)">ND</span>' : '') +
                    '<button class="text-rose-500 hover:text-rose-400 p-1 rounded transition" title="Excluir regra">✕</button></td>';
                const delBtn = tr.querySelector('button');
                if (delBtn) delBtn.onclick = (ev) => { ev.stopPropagation(); deleteTransition(t.id); };
                body.appendChild(tr);
            }
            const sc = $('transition-table-scroll');
            if (firstActive && sc) sc.scrollTop = Math.max(0, firstActive.offsetTop - sc.clientHeight / 2);
        }
        function handleAddStateClick() {
            pushHistory();
            const n = machine.states.length;
            const st = addState(120 + (n % 5) * 130, 120 + Math.floor(n / 5) * 130);
            renderAll();
            toast('Estado ' + pretty(st.name) + ' adicionado');
        }
        function deleteState(id) {
            pushHistory();
            machine.states = machine.states.filter((s) => s.id !== id);
            machine.transitions = machine.transitions.filter((t) => t.from !== id && t.to !== id);
            afterEdit();
            toast('Estado removido');
        }
        function reachableFromInitial() {
            const ini = initialState();
            const seen = new Set();
            if (!ini) return seen;
            const stack = [ini.id];
            while (stack.length) {
                const id = stack.pop();
                if (seen.has(id)) continue;
                seen.add(id);
                for (const t of machine.transitions) if (t.from === id) stack.push(t.to);
            }
            return seen;
        }
        function renderAnalysis() {
            const box = $('analysis-box');
            const badge = $('analysis-class-badge');
            const counts = new Map();
            for (const t of machine.transitions) {
                const k = t.from + '|' + t.read;
                counts.set(k, (counts.get(k) || 0) + 1);
            }
            const ndCount = [...counts.values()].filter((v) => v > 1).length;
            const isND = ndCount > 0;
            badge.textContent = isND ? 'MTN (não determinística)' : 'MTD (determinística)';
            badge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ' + (isND
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30');
            const issues = [];
            if (!machine.states.length) issues.push(['warn', 'Nenhum estado definido.']);
            if (!initialState()) issues.push(['warn', 'Nenhum estado inicial q₀ marcado.']);
            if (!acceptStates().length && machine.acceptanceMode === 'accept_state') issues.push(['warn', 'Nenhum estado de aceitação em F.']);
            if (!machine.transitions.length) issues.push(['warn', 'Nenhuma regra de δ definida.']);
            if (isND) issues.push(['info', 'δ tem ' + ndCount + ' par(es) (estado, símbolo) com mais de uma regra: máquina nondeterminística.']);
            const total = machine.states.length > 0 && machine.states.every((s) =>
                machine.tapeAlphabet.every((sym) => machine.transitions.some((t) => t.from === s.id && t.read === sym)));
            issues.push(total
                ? ['ok', 'δ é total: todo par (estado, símbolo) possui regra.']
                : ['info', 'δ é parcial: há pares (estado, símbolo) sem regra — a máquina pode parar naturalmente.']);
            const reach = reachableFromInitial();
            const orphan = machine.states.filter((s) => !reach.has(s.id));
            if (orphan.length) issues.push(['warn', 'Inalcançável(is) de q₀: ' + orphan.map((s) => pretty(s.name)).join(', ') + '.']);
            const rejOut = machine.transitions.filter((t) => (stateById(t.from) || {}).reject);
            if (rejOut.length) issues.push(['warn', 'Há regras saindo de estado de rejeição: a computação para ali e elas nunca são usadas.']);
            if (rejectStates().length) issues.push(['info', 'Estado de rejeição (q_rej): ao chegar nele a máquina para e rejeita, como o q_r da aula.']);
            if (isND) issues.push(['info', 'Uma MTN aceita se existir ao menos um ramo de computação que aceita.']);
            box.innerHTML = issues.map(([kind, txt]) => {
                const cls = kind === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : kind === 'warn' ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300';
                return '<div class="p-2 rounded-lg border ' + cls + '">' + txt + '</div>';
            }).join('');
        }
        function renderPanels() {
            renderParams();
            renderTransitionTable();
            renderAnalysis();
        }
        function renderAll() {
            updateFilterOptions();
            renderPanels();
            renderTape();
            renderTrace();
            renderBranches();
            updateUndoRedoButtons();
            saveToLocalStorage();
            draw();
        }
