/*
  Testes de interface do Modelador de Máquinas de Turing.

  Como rodar: abra index.html no navegador, abra o console (F12), cole TODO este arquivo e tecle Enter.
  O resultado aparece no console e é devolvido como texto (linhas PASS / FAIL e um resumo).
  (Também pode ser executado automaticamente por qualquer ferramenta que avalie JavaScript na página.)

  Os testes mexem na máquina atual: ao final, o localStorage é limpo e o exemplo aⁿbⁿ é recarregado.
*/
(() => {
    const out = [];
    let pass = 0, fail = 0;
    const check = (name, cond, extra) => {
        if (cond) { pass++; out.push('PASS  ' + name); }
        else { fail++; out.push('FAIL  ' + name + (extra !== undefined ? '  -> ' + extra : '')); }
    };
    const rect = canvas.getBoundingClientRect();
    const ev = (type, x, y, target, extra) => (target || window).dispatchEvent(
        new MouseEvent(type, Object.assign({ clientX: x, clientY: y, bubbles: true, button: 0 }, extra || {})));
    const screenOf = (s) => { const p = toScreen(s.x, s.y); return { x: rect.left + p.x, y: rect.top + p.y }; };
    const dbl = (x, y) => canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: x, clientY: y, bubbles: true }));
    const stateByName = (n) => machine.states.find((s) => s.name === n);
    const run = (word) => {
        $('input-string-field').value = word;
        startSingleSimulation();
        simStepLast();
        return { status: simStatus(), note: (sim.branches[0] || {}).note || '', steps: sim.frames.length - 1 };
    };

    // ---------- 1. mover, desfazer ----------
    loadExample('an_bbb');
    let s = machine.states[3];
    const before = [s.x, s.y];
    let p = screenOf(s);
    ev('mousedown', p.x, p.y, canvas); ev('mousemove', p.x - 90, p.y + 60); ev('mouseup', p.x - 90, p.y + 60);
    check('arrastar um estado o move', s.x !== before[0] || s.y !== before[1], [s.x, s.y]);
    undo();
    s = machine.states[3];
    check('desfazer devolve o estado à posição original', s.x === before[0] && s.y === before[1], [s.x, s.y]);

    // ---------- 2. conectar com Shift ----------
    const a = machine.states[0], b = machine.states[4];
    const pa = screenOf(a), pb = screenOf(b);
    ev('mousedown', pa.x, pa.y, canvas, { shiftKey: true }); ev('mousemove', pb.x, pb.y); ev('mouseup', pb.x, pb.y);
    check('Shift+arrastar abre o modal de transição',
        !$('transition-modal').classList.contains('hidden') && $('trans-from-input').value === a.id && $('trans-to-input').value === b.id);
    closeModal('transition-modal');

    // ---------- 3. duplo clique ----------
    const n0 = machine.states.length;
    dbl(rect.left + 200, rect.top + 40);
    check('duplo clique no vazio cria estado', machine.states.length === n0 + 1);
    undo();
    const q1 = stateByName('q1'); const acc0 = q1.accept; const pq = screenOf(q1);
    dbl(pq.x, pq.y);
    check('duplo clique no estado alterna aceitação', q1.accept === !acc0);
    undo();

    // ---------- 4. modo criar transições ----------
    toggleDrawMode();
    check('botão alterna para "Criando Transições"', canvasMode === 'transition' && $('btn-draw-mode').textContent.includes('Criando'));
    toggleDrawMode();
    check('botão volta para "Mover Nós"', canvasMode === 'drag');

    // ---------- 5. layouts ----------
    const snapPos = () => machine.states.map((st) => st.x + ',' + st.y).join('|');
    const p0 = snapPos();
    autoLayoutCircle(); const pc = snapPos();
    check('layout em círculo reposiciona', pc !== p0);
    layoutLine(); const pl = snapPos();
    check('layout em linha reposiciona (y igual)', pl !== pc && new Set(machine.states.map((st) => st.y)).size === 1);
    layoutGrid(); const pg = snapPos();
    check('layout em grade reposiciona', pg !== pl);
    undo(); undo(); undo();
    check('desfazer x3 restaura as posições originais', snapPos() === p0);

    // ---------- 6. reprodução passo a passo ----------
    loadExample('an_bbb');
    startSingleSimulation();
    check('simulação pré-calcula os passos', sim.frames.length === 14, sim.frames.length);
    simStepForward(); simStepForward(); simStepForward();
    check('avançar 3 passos', sim.index === 3, sim.index);
    simStepBack();
    check('voltar 1 passo', sim.index === 2, sim.index);
    simStepLast();
    check('ir ao fim = ACEITA', simStatus() === 'accepted' && sim.index === 13, simStatus());
    simStepFirst();
    check('ir ao início = pronta', sim.index === 0 && simStatus() === 'ready', simStatus());
    stepSimulation(); stepSimulation(); stepSimulation(); stepSimulation(); stepSimulation();
    check('regra aplicada fica destacada no diagrama', simActiveEdgeIds().size === 1);
    const hiRows = $('transition-table-body').querySelectorAll ? [...document.querySelectorAll('#transition-table-body tr')].filter((r) => r.className.includes('bg-indigo-500/20')) : [];
    check('regra aplicada fica destacada na tabela', hiRows.length === 1, hiRows.length);
    const rows = document.querySelectorAll('#trace-list > div');
    check('rastreamento lista passo 0 + 13 passos', rows.length >= 14, rows.length);
    rows[8].click();
    check('clicar numa linha do rastreamento salta para o passo', sim.index === 8, sim.index);
    check('linha de configuração (⊢) aparece', $('cfg-line').textContent.trim().length > 0 && $('trace-list').textContent.includes('⊢'));
    simTogglePlay();
    check('Play liga o temporizador', sim.playing === true);
    simTogglePlay();
    check('Pausar desliga o temporizador', sim.playing === false && sim.timer === null);

    // ---------- 7. estado de rejeição (0ⁿ1ⁿ da aula) ----------
    loadExample('zero_one');
    let r = run('0011');
    check('0ⁿ1ⁿ aceita 0011', r.status === 'accepted', r.status);
    r = run('0111');
    check('0ⁿ1ⁿ rejeita 0111 entrando em q_r', r.status === 'rejected' && r.note.includes('rejeição'), r.status + ' ' + r.note);
    check('estado q_r é de rejeição e q_a de aceitação', stateByName('qr').reject && stateByName('qa').accept);

    // ---------- 8. B é o branco ----------
    $('input-alphabet-field').value = '0 1 B';
    updateAlphabets();
    check('B é removido de Σ', !machine.inputAlphabet.includes('B'), machine.inputAlphabet.join(' '));
    $('input-string-field').value = '0B1';
    startSingleSimulation();
    check('entrada com B é recusada com aviso', $('toast').textContent.includes('branco'), $('toast').textContent);

    // ---------- 9. menu de contexto ----------
    const pz = screenOf(stateByName('q1'));
    canvas.dispatchEvent(new MouseEvent('contextmenu', { clientX: pz.x, clientY: pz.y, bubbles: true }));
    const items = [...document.querySelectorAll('#context-menu button')].map((x) => x.textContent);
    check('botão direito no estado abre o menu (com rejeição e laço)',
        !$('context-menu').classList.contains('hidden') && items.some((t) => t.includes('rejeição')) && items.some((t) => t.includes('laço')), items.join(' | '));
    hideContextMenu();

    // ---------- 10. salvar no navegador ----------
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('mt_modelador_v1')); } catch (e) { /* ignora */ }
    check('máquina é salva no navegador', !!saved && saved.machine.states.length === machine.states.length);
    const keep = machine.states.length;
    machine.states.length = 0;   // simula reabrir a página
    check('restaurar devolve a máquina salva', restoreFromLocalStorage() === true && machine.states.length === keep, machine.states.length);

    // ---------- 11. exportações ----------
    loadExample('zero_one');
    const tex = generateTikZ();
    check('TikZ: laços usam loop above', tex.includes('loop above'));
    check('TikZ: sem \\textvisiblespace e com B', !tex.includes('textvisiblespace') && tex.includes('B \\mapsto B'));
    check('TikZ: estado de rejeição tem estilo próprio', tex.includes('draw=red!70!black'));
    check('documento .tex completo é compilável (standalone)', generateFullTeX().includes('\\documentclass') && generateFullTeX().includes('\\end{document}'));
    const json = machineJSON();
    check('JSON registra branco B e rejeição', json.branco === 'B' && json.estados.some((e) => e.rejeicao === true));
    const dark0 = isDark();
    const png = buildPNGDataURL();
    check('PNG gerado (data URL) e tema restaurado', png.startsWith('data:image/png;base64,') && png.length > 5000 && isDark() === dark0);
    applyImported(JSON.parse(JSON.stringify(json)));
    check('importar o JSON mantém a rejeição', stateByName('qr') && stateByName('qr').reject === true);

    // ---------- 12. teste em lote ----------
    $('batch-input-textarea').value = '01\n0011\n10\n0';
    runBatchTests();
    check('lote: 2 aceitas e 2 rejeitadas', $('batch-stats-accepted').textContent.startsWith('2') && $('batch-stats-rejected').textContent.startsWith('2'),
        $('batch-stats-accepted').textContent + ' / ' + $('batch-stats-rejected').textContent);

    // ---------- limpeza ----------
    try { localStorage.removeItem('mt_modelador_v1'); } catch (e) { /* ignora */ }
    loadExample('an_bbb');
    switchSimTab('single');
    const summary = 'RESUMO UI: PASS=' + pass + ' FAIL=' + fail;
    out.push(summary);
    console.log(out.join('\n'));
    return out.join('\n');
})()
