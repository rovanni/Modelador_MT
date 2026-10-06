/* ===== 11. Teclado e inicialização ================= */
        document.addEventListener('keydown', (e) => {
            const tag = (e.target && e.target.tagName ? e.target.tagName : '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (e.key === 'Escape') {
                closeModal('state-modal'); closeModal('transition-modal');
                closeModal('latex-modal'); hideContextMenu();
                return;
            }
            if (e.ctrlKey || e.metaKey) {
                const k = e.key.toLowerCase();
                if (k === 'z') { e.preventDefault(); undo(); }
                else if (k === 'y') { e.preventDefault(); redo(); }
                else if (k === 's') { e.preventDefault(); exportToJSON(); }
                else if (k === 'e') { e.preventDefault(); exportToLaTeX(); }
                else if (k === 'p') { e.preventDefault(); exportToPNG(); }
                return;
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (hoverEdge) {
                    e.preventDefault();
                    pushHistory();
                    machine.transitions = machine.transitions.filter((t) => t.id !== hoverEdge.id);
                    hoverEdge = null;
                    afterEdit();
                    toast('Regra removida');
                }
                return;
            }
            if (e.key === ' ') { e.preventDefault(); if (tag === 'button') e.target.blur(); simTogglePlay(); return; }
            if (e.key === 'ArrowRight') { e.preventDefault(); stopRun(); stepSimulation(); return; }
            if (e.key === 'ArrowLeft') { e.preventDefault(); simStepBack(); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); zoomBy(1.15); return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); zoomBy(1 / 1.15); return; }
            if (e.key === 'r' || e.key === 'R') { resetSimulation(true); renderAll(); return; }
            if (e.key === 'f' || e.key === 'F') { fitView(); return; }
        });
        /* Arrastar a fita com o mouse para rolar para os lados */
        (function enableTapeDrag() {
            const vp = $('tape-viewport');
            let d = null;
            vp.style.cursor = 'grab';
            vp.addEventListener('mousedown', (e) => { d = { x: e.clientX, left: vp.scrollLeft }; vp.style.cursor = 'grabbing'; });
            window.addEventListener('mousemove', (e) => { if (d) vp.scrollLeft = d.left - (e.clientX - d.x); });
            window.addEventListener('mouseup', () => { if (d) { d = null; vp.style.cursor = 'grab'; } });
        })();
        window.addEventListener('resize', () => { resizeCanvas(); draw(); });
        function init() {
            const restored = restoreFromLocalStorage();   // continua de onde o aluno parou
            resizeCanvas();
            if (restored) {
                resetSimulation(false);
                renderAll();
                fitView();
                toast('Máquina restaurada da última sessão (use os Exemplos para recomeçar)');
            } else {
                loadExample('an_bbb');
            }
        }
        init();
