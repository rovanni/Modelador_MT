/* ===== 3. Canvas e Renderização ================= */
        const canvas = $('graph-canvas');
        const gctx = canvas.getContext('2d');
        const view = { x: 40, y: 20, scale: 1 };
        const R = 34;
        let hoverEdge = null;
        let drag = null;
        let placedLabels = [];     // retângulos dos rótulos já desenhados neste quadro (evita sobreposição)
        let exportMode = false;   // true durante a exportação do PNG: sem grade nem destaques da simulação

        function resizeCanvas() {
            const wrap = $('canvas-wrapper');
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, wrap.clientWidth * dpr);
            canvas.height = Math.max(1, wrap.clientHeight * dpr);
            gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            renderAll();
        }
        const toWorld = (px, py) => ({ x: (px - view.x) / view.scale, y: (py - view.y) / view.scale });
        const toScreen = (wx, wy) => ({ x: wx * view.scale + view.x, y: wy * view.scale + view.y });
        function pointerPos(ev) {
            const r = canvas.getBoundingClientRect();
            return { x: ev.clientX - r.left, y: ev.clientY - r.top };
        }
        function stateAt(px, py) {
            const w = toWorld(px, py);
            for (let i = machine.states.length - 1; i >= 0; i--) {
                const s = machine.states[i];
                if (Math.hypot(s.x - w.x, s.y - w.y) <= R) return s;
            }
            return null;
        }
        function norm(dx, dy) { const l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l }; }

        function edgeGeometry(t) {
            const a = stateById(t.from), b = stateById(t.to);
            if (!a || !b) return null;
            const group = [];   // pares dirigidos distintos entre os dois estados (regras do mesmo par dividem uma seta)
            for (const x of machine.transitions) {
                if ((x.from === t.from && x.to === t.to) || (x.from === t.to && x.to === t.from)) {
                    const k = x.from + '|' + x.to;
                    if (!group.includes(k)) group.push(k);
                }
            }
            const idx = group.indexOf(t.from + '|' + t.to);
            if (a.id === b.id) {
                const top = { x: a.x, y: a.y - R - 30 };
                return {
                    self: true, a: { x: a.x - 16, y: a.y - 26 }, b: { x: a.x + 16, y: a.y - 26 },
                    c1: { x: a.x - 46, y: a.y - R - 46 }, c2: { x: a.x + 46, y: a.y - R - 46 },
                    label: { x: a.x, y: a.y - R - 44 }
                };
            }
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const n = norm(-(b.y - a.y), b.x - a.x);
            const sign = (t.from === (a.id < b.id ? a.id : b.id)) ? 1 : -1;
            const off = sign * (20 * (idx - (group.length - 1) / 2) + 16);
            const c = { x: mx + n.x * off, y: my + n.y * off };
            const d1 = norm(c.x - a.x, c.y - a.y);
            const d2 = norm(c.x - b.x, c.y - b.y);
            const p0 = { x: a.x + d1.x * R, y: a.y + d1.y * R };
            const p2 = { x: b.x + d2.x * R, y: b.y + d2.y * R };
            const mid = { x: 0.25 * p0.x + 0.5 * c.x + 0.25 * p2.x, y: 0.25 * p0.y + 0.5 * c.y + 0.25 * p2.y };
            return { self: false, a: p0, c, b: p2, label: mid };
        }
        function bezierPoint(g, u) {
            if (g.self) {
                const x = (1 - u) ** 3 * g.a.x + 3 * (1 - u) ** 2 * u * g.c1.x + 3 * (1 - u) * u * u * g.c2.x + u ** 3 * g.b.x;
                const y = (1 - u) ** 3 * g.a.y + 3 * (1 - u) ** 2 * u * g.c1.y + 3 * (1 - u) * u * u * g.c2.y + u ** 3 * g.b.y;
                return { x, y };
            }
            const x = (1 - u) ** 2 * g.a.x + 2 * (1 - u) * u * g.c.x + u * u * g.b.x;
            const y = (1 - u) ** 2 * g.a.y + 2 * (1 - u) * u * g.c.y + u * u * g.b.y;
            return { x, y };
        }
        function edgeAt(px, py) {
            const w = toWorld(px, py);
            const tol = 9 / view.scale;
            for (const t of machine.transitions) {
                const g = edgeGeometry(t);
                if (!g) continue;
                for (let i = 0; i <= 26; i++) {
                    const p = bezierPoint(g, i / 26);
                    if (Math.hypot(p.x - w.x, p.y - w.y) <= tol) return t;
                }
            }
            return null;
        }
        function arrowHead(from, to, p, size) {
            const d = norm(to.x - from.x, to.y - from.y);
            const left = { x: to.x - d.x * size - d.y * size * 0.55, y: to.y - d.y * size + d.x * size * 0.55 };
            const right = { x: to.x - d.x * size + d.y * size * 0.55, y: to.y - d.y * size - d.x * size * 0.55 };
            gctx.beginPath();
            gctx.moveTo(to.x, to.y); gctx.lineTo(left.x, left.y); gctx.lineTo(right.x, right.y);
            gctx.closePath(); gctx.fillStyle = p; gctx.fill();
        }
        function transLabel(t) {
            const r = t.read === BLANK ? BLANK : t.read;
            return r + ' → ' + (t.write === BLANK ? BLANK : t.write) + ',' + t.move;
        }
        function drawGrid(p) {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            const step = 24 * view.scale;
            if (step < 9) return;
            const ox = ((view.x % step) + step) % step;
            const oy = ((view.y % step) + step) % step;
            gctx.fillStyle = p.grid;
            for (let x = ox; x < w; x += step) {
                for (let y = oy; y < h; y += step) {
                    gctx.beginPath(); gctx.arc(x, y, 1.1, 0, Math.PI * 2); gctx.fill();
                }
            }
        }
        function drawEdge(grp, p, active) {
            const g = edgeGeometry(grp[0]);
            if (!g) return;
            const color = active ? p.accent : p.edge;
            gctx.save();
            gctx.translate(view.x, view.y);
            gctx.scale(view.scale, view.scale);
            gctx.lineWidth = active ? 2.6 : 1.8;
            gctx.strokeStyle = color;
            gctx.beginPath();
            if (g.self) {
                gctx.moveTo(g.a.x, g.a.y);
                gctx.bezierCurveTo(g.c1.x, g.c1.y, g.c2.x, g.c2.y, g.b.x, g.b.y);
            } else {
                gctx.moveTo(g.a.x, g.a.y);
                gctx.quadraticCurveTo(g.c.x, g.c.y, g.b.x, g.b.y);
            }
            gctx.stroke();
            const near = bezierPoint(g, 0.86);
            const tip = bezierPoint(g, 1);
            arrowHead(near, tip, color, active ? 10 : 8);
            gctx.restore();
            // Rótulos: uma linha por regra, empilhadas num mesmo bloco, deslocados ao longo da seta se colidirem com outro rótulo ou estado
            const lines = grp.map(transLabel);
            gctx.font = '600 14px "Fira Code", monospace';
            const tw = Math.max(...lines.map((l) => gctx.measureText(l).width));
            const lh = 19, h = lines.length * lh + 6, w = tw + 14;
            const rectAt = (pt) => {
                const sp = toScreen(pt.x, pt.y);
                const top = g.self ? sp.y - h + 9 : sp.y - h / 2;
                return { x: sp.x - w / 2, y: top, w, h, cx: sp.x };
            };
            const hits = (r) => placedLabels.some((q) => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y) ||
                machine.states.some((st) => {
                    const c = toScreen(st.x, st.y), rr = R * view.scale + 3;
                    return c.x + rr > r.x && c.x - rr < r.x + r.w && c.y + rr > r.y && c.y - rr < r.y + r.h;
                });
            let box = rectAt(g.label);
            if (!g.self && hits(box)) {
                for (const t of [0.38, 0.62, 0.28, 0.72, 0.2, 0.8]) {
                    const cand = rectAt(bezierPoint(g, t));
                    if (!hits(cand)) { box = cand; break; }
                }
            }
            placedLabels.push(box);
            gctx.fillStyle = isDark() ? 'rgba(2,6,23,0.88)' : 'rgba(255,255,255,0.92)';
            gctx.beginPath();
            roundRect(box.x - 0, box.y, box.w, box.h, 7);
            gctx.fill();
            gctx.fillStyle = active ? p.accent : (isDark() ? '#cbd5e1' : '#334155');
            gctx.textAlign = 'center'; gctx.textBaseline = 'middle';
            lines.forEach((l, i) => gctx.fillText(l, box.cx, box.y + 3 + lh / 2 + i * lh));
        }
        function roundRect(x, y, w, h, r) {
            gctx.moveTo(x + r, y);
            gctx.arcTo(x + w, y, x + w, y + h, r);
            gctx.arcTo(x + w, y + h, x, y + h, r);
            gctx.arcTo(x, y + h, x, y, r);
            gctx.arcTo(x, y, x + w, y, r);
        }
        /* Nome do estado com índice desenhado (q + subíndice legível), em vez dos subscritos Unicode minúsculos. */
        function drawStateName(name, cx, cy, size) {
            const sp = splitName(name);
            const m = sp ? [null, sp.base, sp.sub] : null;
            gctx.textBaseline = 'middle';
            if (!m) {
                gctx.font = '700 ' + size + 'px "Fira Code", monospace';
                gctx.textAlign = 'center';
                gctx.fillText(name, cx, cy);
                return;
            }
            const subSize = Math.round(size * 0.68);
            gctx.font = '700 ' + size + 'px "Fira Code", monospace';
            const w1 = gctx.measureText(m[1]).width;
            gctx.font = '700 ' + subSize + 'px "Fira Code", monospace';
            const w2 = gctx.measureText(m[2]).width;
            const x0 = cx - (w1 + w2) / 2;
            gctx.textAlign = 'left';
            gctx.font = '700 ' + size + 'px "Fira Code", monospace';
            gctx.fillText(m[1], x0, cy - 1);
            gctx.font = '700 ' + subSize + 'px "Fira Code", monospace';
            gctx.fillText(m[2], x0 + w1, cy + size * 0.28);
            gctx.textAlign = 'center';
        }
        function drawState(s, p, activeState) {
            const c = toScreen(s.x, s.y);
            const r = R * view.scale;
            if (activeState) {
                gctx.beginPath(); gctx.arc(c.x, c.y, r + 9, 0, Math.PI * 2);
                gctx.fillStyle = 'rgba(244,63,94,0.16)'; gctx.fill();
            }
            if (s.initial) {
                const from = { x: c.x - r - 34, y: c.y }, to = { x: c.x - r - 2, y: c.y };
                gctx.strokeStyle = p.accent; gctx.lineWidth = 2;
                gctx.beginPath(); gctx.moveTo(from.x, from.y); gctx.lineTo(to.x, to.y); gctx.stroke();
                arrowHead(from, to, p.accent, 9);
            }
            gctx.beginPath(); gctx.arc(c.x, c.y, r, 0, Math.PI * 2);
            gctx.fillStyle = s.accept ? (isDark() ? 'rgba(16,185,129,0.16)' : 'rgba(16,185,129,0.10)')
                : s.reject ? (isDark() ? 'rgba(244,63,94,0.14)' : 'rgba(225,29,72,0.08)') : p.fill;
            gctx.fill();
            gctx.lineWidth = activeState ? 3 : 2;
            gctx.strokeStyle = activeState ? p.head : (s.accept ? p.accept : s.reject ? p.reject : p.border);
            gctx.stroke();
            if (s.reject) {   // anel tracejado = estado de rejeição
                gctx.save();
                gctx.setLineDash([5, 4]);
                gctx.beginPath(); gctx.arc(c.x, c.y, r - 6, 0, Math.PI * 2);
                gctx.lineWidth = 1.6; gctx.strokeStyle = p.reject; gctx.stroke();
                gctx.restore();
            }
            if (s.accept) {
                gctx.beginPath(); gctx.arc(c.x, c.y, r - 6, 0, Math.PI * 2);
                gctx.lineWidth = 1.6; gctx.strokeStyle = p.accept; gctx.stroke();
            }
            gctx.fillStyle = p.text;
            drawStateName(s.name, c.x, c.y, Math.max(15, 20 * view.scale));
            if (activeState) {
                const sym = simSymbolAtHead();
                gctx.font = '700 14px "Fira Code", monospace';
                gctx.fillStyle = p.head;
                gctx.textAlign = 'center'; gctx.textBaseline = 'middle';
                gctx.fillText('▮ ' + (sym === BLANK ? BLANK : sym), c.x, c.y + r + 16);
            }
        }
        function draw() {
            const p = palette();
            const w = canvas.clientWidth, h = canvas.clientHeight;
            gctx.clearRect(0, 0, w, h);
            if (!exportMode) drawGrid(p);
            const activeId = exportMode ? null : simActiveStateId();
            const activeEdges = exportMode ? new Set() : simActiveEdgeIds();
            placedLabels = [];
            const seen = new Set();
            for (const t of machine.transitions) {
                const k = t.from + '|' + t.to;
                if (seen.has(k)) continue;
                seen.add(k);
                const grp = machine.transitions.filter((x) => x.from === t.from && x.to === t.to);
                drawEdge(grp, p, grp.some((x) => (hoverEdge && hoverEdge.id === x.id) || activeEdges.has(x.id)));
            }
            for (const s of machine.states) drawState(s, p, s.id === activeId);
            if (drag && drag.type === 'connect') {
                const a = toScreen(drag.state.x, drag.state.y);
                gctx.setLineDash([6, 5]);
                gctx.strokeStyle = p.accent; gctx.lineWidth = 2;
                gctx.beginPath(); gctx.moveTo(a.x, a.y); gctx.lineTo(drag.pos.x, drag.pos.y); gctx.stroke();
                gctx.setLineDash([]);
                arrowHead(a, drag.pos, p.accent, 9);
            }
        }

/* ===== 4. Interação com o Canvas ================= */
let canvasMode = 'drag';          // 'drag' = mover nós | 'transition' = criar transições
let isToolbarCompact = false;

function toggleDrawMode() {
    canvasMode = (canvasMode === 'drag') ? 'transition' : 'drag';
    const btn = $('btn-draw-mode'), ind = $('draw-mode-indicator');
    const creating = canvasMode === 'transition';
    btn.classList.toggle('bg-indigo-600', creating);
    btn.classList.toggle('text-white', creating);
    btn.classList.toggle('bg-slate-200', !creating);
    btn.classList.toggle('dark:bg-slate-800', !creating);
    ind.classList.toggle('bg-emerald-400', creating);
    ind.classList.toggle('bg-slate-400', !creating);
    btn.querySelector('.btn-text').textContent = creating ? 'Criando Transições' : 'Mover Nós';
    canvas.style.cursor = creating ? 'copy' : 'crosshair';
}
function toggleToolbarSize() {
    isToolbarCompact = !isToolbarCompact;
    $('graph-toolbar-controls').classList.toggle('toolbar-compact', isToolbarCompact);
    $('compact-toggle-text').textContent = isToolbarCompact ? 'Expandir' : 'Modo Compacto';
}

canvas.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0) return;
    hideContextMenu();
    const pos = pointerPos(ev);
    const st = stateAt(pos.x, pos.y);
    if (st) {
        if (canvasMode === 'transition' || ev.shiftKey) {
            drag = { type: 'connect', state: st, start: pos, pos, target: null, moved: false };
        } else {
            drag = { type: 'move', state: st, start: pos, pos, origin: { x: st.x, y: st.y }, before: null, moved: false };
        }
        return;
    }
    const ed = edgeAt(pos.x, pos.y);
    if (ed) { drag = { type: 'edge', edge: ed, start: pos, pos, moved: false }; return; }
    drag = { type: 'bg', start: pos, pos, origin: { x: view.x, y: view.y }, moved: false };
});
window.addEventListener('mousemove', (ev) => {
    const pos = pointerPos(ev);
    if (!drag) {
        const st = stateAt(pos.x, pos.y);
        const prev = hoverEdge;
        hoverEdge = st ? null : edgeAt(pos.x, pos.y);
        canvas.style.cursor = st ? 'grab' : hoverEdge ? 'pointer' : (canvasMode === 'transition' ? 'copy' : 'crosshair');
        if (hoverEdge !== prev) draw();
        return;
    }
    drag.pos = pos;
    if (Math.hypot(pos.x - drag.start.x, pos.y - drag.start.y) > 4) drag.moved = true;
    if (!drag.moved) return;
    if (drag.type === 'move') {
        if (!drag.before) drag.before = snap();
        canvas.style.cursor = 'grabbing';
        drag.state.x = Math.round(drag.origin.x + (pos.x - drag.start.x) / view.scale);
        drag.state.y = Math.round(drag.origin.y + (pos.y - drag.start.y) / view.scale);
    } else if (drag.type === 'bg') {
        canvas.style.cursor = 'move';
        view.x = drag.origin.x + (pos.x - drag.start.x);
        view.y = drag.origin.y + (pos.y - drag.start.y);
    } else if (drag.type === 'connect') {
        drag.target = stateAt(pos.x, pos.y);
    }
    draw();
});
window.addEventListener('mouseup', () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.type === 'move' && d.moved && d.before) {
        hist.undo.push(d.before);
        if (hist.undo.length > 80) hist.undo.shift();
        hist.redo = [];
        updateUndoRedoButtons();
        renderAll();
        return;
    }
    if (d.type === 'edge' && !d.moved) { openTransitionModal(d.edge); return; }
    if (d.type === 'connect' && d.moved) {
        const target = d.target || stateAt(d.pos.x, d.pos.y);
        if (target) openTransitionModal(null, d.state.id, target.id);
        else toast('Solte sobre um estado para criar a transição δ', 'warn');
        draw();
        return;
    }
    draw();
});
canvas.addEventListener('dblclick', (ev) => {
    const pos = pointerPos(ev);
    const st = stateAt(pos.x, pos.y);
    if (st) {
        pushHistory();
        st.accept = !st.accept;
        if (st.accept) st.reject = false;
        afterEdit();
        toast(pretty(st.name) + (st.accept ? ' agora é de aceitação' : ' deixou de ser de aceitação'));
    } else if (!edgeAt(pos.x, pos.y)) {
        const w = toWorld(pos.x, pos.y);
        pushHistory();
        const ns = addState(w.x, w.y);
        if (machine.states.length === 1) ns.initial = true;
        afterEdit();
        toast('Estado ' + pretty(ns.name) + ' adicionado');
    }
});
canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const pos = pointerPos(ev);
    const before = toWorld(pos.x, pos.y);
    const factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
    view.scale = Math.min(2.6, Math.max(0.35, view.scale * factor));
    const after = toScreen(before.x, before.y);
    view.x += pos.x - after.x; view.y += pos.y - after.y;
    draw();
}, { passive: false });
canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    const pos = pointerPos(ev);
    const st = stateAt(pos.x, pos.y);
    if (st) return showContextMenu(ev.clientX, ev.clientY, [
        { label: '✎ Editar estado', fn: () => openStateModal(st) },
        { label: '⌑ Definir como q₀', fn: () => { pushHistory(); machine.states.forEach((s) => s.initial = false); st.initial = true; afterEdit(); toast(pretty(st.name) + ' é o estado inicial'); } },
        { label: '✔ Alternar aceitação (q_acc)', fn: () => { pushHistory(); st.accept = !st.accept; if (st.accept) st.reject = false; afterEdit(); } },
        { label: '✖ Alternar rejeição (q_rej)', fn: () => { pushHistory(); st.reject = !st.reject; if (st.reject) st.accept = false; afterEdit(); } },
        { label: '↻ Adicionar laço', fn: () => openTransitionModal(null, st.id, st.id) },
        { label: '🗑 Excluir estado', fn: () => deleteState(st.id), danger: true }
    ]);
    const ed = edgeAt(pos.x, pos.y);
    if (ed) return showContextMenu(ev.clientX, ev.clientY, [
        { label: '✎ Editar δ', fn: () => openTransitionModal(ed) },
        { label: '⧉ Duplicar δ (nondeterminismo)', fn: () => { pushHistory(); machine.transitions.push(Object.assign({}, ed, { id: 't' + (machine.seq++) })); afterEdit(); toast('Regra duplicada: edite a cópia para criar uma alternativa'); } },
        { label: '🗑 Excluir δ', fn: () => { pushHistory(); machine.transitions = machine.transitions.filter((t) => t.id !== ed.id); afterEdit(); toast('Regra removida'); }, danger: true }
    ]);
    showContextMenu(ev.clientX, ev.clientY, [
        { label: '⊕ Novo estado aqui', fn: () => { const w = toWorld(pos.x, pos.y); pushHistory(); addState(w.x, w.y); afterEdit(); } },
        { label: '⌖ Centralizar máquina', fn: fitView },
        { label: '🗑 Limpar tudo', fn: clearMachine, danger: true }
    ]);
});
function showContextMenu(x, y, items) {
    const menu = $('context-menu');
    menu.innerHTML = '';
    for (const it of items) {
        const b = document.createElement('button');
        b.textContent = it.label;
        b.className = 'text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition ' + (it.danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200');
        b.onclick = () => { hideContextMenu(); it.fn(); };
        menu.appendChild(b);
    }
    menu.style.left = Math.min(x, window.innerWidth - 230) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 190) + 'px';
    menu.classList.remove('hidden');
}
function hideContextMenu() { $('context-menu').classList.add('hidden'); }
window.addEventListener('click', hideContextMenu);

/* ---- Enquadramento, zoom e organização automática ---- */
function fitView() {
    if (!machine.states.length) { view.x = 40; view.y = 20; view.scale = 1; draw(); return; }
    const xs = machine.states.map((s) => s.x), ys = machine.states.map((s) => s.y);
    const minX = Math.min(...xs) - 95, maxX = Math.max(...xs) + 95;
    // laços com muitas regras têm rótulos altos acima do estado: reserva espaço no topo
    const loopLines = {};
    machine.transitions.forEach((t) => { if (t.from === t.to) loopLines[t.from] = (loopLines[t.from] || 0) + 1; });
    const topExtra = Math.max(0, ...machine.states.map((s) => Math.max(0, (loopLines[s.id] || 0) * 32 - 20) + (s.y === Math.min(...ys) ? 0 : -999)));
    const minY = Math.min(...ys) - 95 - topExtra, maxY = Math.max(...ys) + 95;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    view.scale = Math.min(1.6, Math.max(0.35, Math.min(w / (maxX - minX), h / (maxY - minY))));
    view.x = (w - (maxX - minX) * view.scale) / 2 - minX * view.scale;
    view.y = (h - (maxY - minY) * view.scale) / 2 - minY * view.scale;
    draw();
}
function zoomBy(factor) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const cx = w / 2, cy = h / 2;
    const before = toWorld(cx, cy);
    view.scale = Math.min(2.6, Math.max(0.35, view.scale * factor));
    const after = toScreen(before.x, before.y);
    view.x += cx - after.x; view.y += cy - after.y;
    draw();
}
function applyLayout(label, place) {
    if (!machine.states.length) return toast('Não há estados para organizar', 'warn');
    pushHistory();
    machine.states.forEach((s, i) => { const p = place(i, machine.states.length); s.x = Math.round(p.x); s.y = Math.round(p.y); });
    renderAll();
    fitView();
    toast('Estados organizados em ' + label);
}
function autoLayoutCircle() {
    applyLayout('círculo', (i, n) => {
        const r = Math.max(110, n * 42);
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
    });
}
function layoutLine() {
    applyLayout('linha', (i) => ({ x: i * 170, y: 0 }));
}
function layoutGrid() {
    const cols = Math.ceil(Math.sqrt(machine.states.length));
    applyLayout('grade', (i) => ({ x: (i % cols) * 190, y: Math.floor(i / cols) * 170 }));
}
function clearMachine() {
    if (!machine.states.length) return toast('A máquina já está vazia', 'warn');
    pushHistory();
    machine.states = []; machine.transitions = [];
    resetSimulation(false);
    afterEdit();
    toast('Máquina limpa');
}
