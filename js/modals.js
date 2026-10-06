/* ===== 6. Modais ================= */
        function closeModal(id) { $(id).classList.add('hidden'); }
        let modalCtx = { transition: null };

        function openStateModal(st) {
            modalCtx.state = st.id;
            $('state-name-input').value = st.name;
            $('state-initial-input').checked = st.initial;
            $('state-accept-input').checked = st.accept;
            $('state-reject-input').checked = !!st.reject;
            $('state-modal').classList.remove('hidden');
            $('state-name-input').focus();
        }
        function saveStateModal() {
            const st = stateById(modalCtx.state);
            if (!st) return closeModal('state-modal');
            const name = $('state-name-input').value.trim().replace(/\s+/g, '');
            if (!name) return toast('O nome do estado não pode ser vazio', 'err');
            if (machine.states.some((s) => s.id !== st.id && s.name === name)) return toast('Já existe um estado chamado ' + name, 'err');
            pushHistory();
            st.name = name;
            const wantInitial = $('state-initial-input').checked;
            if (wantInitial) machine.states.forEach((s) => s.initial = false);
            st.initial = wantInitial;
            const wantAccept = $('state-accept-input').checked;
            const wantReject = $('state-reject-input').checked;
            st.accept = wantAccept;
            st.reject = wantReject && !wantAccept;   // um estado não pode aceitar e rejeitar ao mesmo tempo
            closeModal('state-modal');
            afterEdit();
            toast('Estado ' + pretty(name) + ' atualizado');
        }
        function deleteStateFromModal() {
            const id = modalCtx.state;
            closeModal('state-modal');
            deleteState(id);
        }

        function openNewTransitionModal() {
            if (!machine.states.length) return toast('Crie estados primeiro', 'warn');
            const first = (initialState() || machine.states[0]).id;
            openTransitionModal(null, first, first);
        }
        function setModalBlank(inputId) {
            $(inputId).value = '_';
            updateTransPreview();
        }
        function openTransitionModal(t, fromId, toId) {
            if (!machine.states.length) return toast('Crie estados primeiro', 'warn');
            if (t) {
                modalCtx.transition = t.id;
                $('trans-from-input').value = t.from;
                fillStateSelect($('trans-from-input'), t.from);
                fillStateSelect($('trans-to-input'), t.to);
                $('trans-read-input').value = t.read === BLANK ? '_' : t.read;
                $('trans-write-input').value = t.write === BLANK ? '_' : t.write;
                $('trans-move-input').value = t.move;
                $('transition-modal-sub').textContent = 'Editar δ(' + pretty((stateById(t.from) || {}).name) + ', ' + (t.read === BLANK ? BLANK : t.read) + ')';
            } else {
                modalCtx.transition = null;
                fillStateSelect($('trans-from-input'), fromId);
                fillStateSelect($('trans-to-input'), toId);
                const first = machine.tapeAlphabet[0] || 'a';
                $('trans-read-input').value = first;
                $('trans-write-input').value = first;
                $('trans-move-input').value = 'R';
                $('transition-modal-sub').textContent = 'Nova regra de δ';
            }
            updateTransPreview();
            $('transition-modal').classList.remove('hidden');
            $('trans-read-input').focus();
        }
        function readModalTransition() {
            const read = (['_', '␣', '□', BLANK].includes($('trans-read-input').value.trim())) ? BLANK : $('trans-read-input').value.trim();
            const writeRaw = $('trans-write-input').value.trim();
            const write = (['_', '␣', '□', BLANK].includes(writeRaw)) ? BLANK : writeRaw;
            return {
                from: $('trans-from-input').value,
                to: $('trans-to-input').value,
                read, write,
                move: $('trans-move-input').value
            };
        }
        function updateTransPreview() {
            const d = readModalTransition();
            const a = stateById(d.from), b = stateById(d.to);
            $('trans-preview').textContent = 'δ(' + pretty((a || {}).name) + ', ' + (d.read === BLANK ? BLANK : d.read) + ') = (' +
                pretty((b || {}).name) + ', ' + (d.write === BLANK ? BLANK : d.write) + ', ' + d.move + ')';
        }
        ['trans-from-input', 'trans-to-input', 'trans-read-input', 'trans-write-input', 'trans-move-input'].forEach((id) => {
            const el = $(id);
            if (el) el.addEventListener('input', updateTransPreview);
            if (el) el.addEventListener('change', updateTransPreview);
        });
        function saveTransitionModal() {
            const d = readModalTransition();
            if (!d.from || !d.to) return toast('Escolha os estados de origem e destino', 'err');
            if (!d.read || !d.write) return toast('Informe o símbolo lido e o escrito', 'err');
            if (d.read !== BLANK && !machine.tapeAlphabet.includes(d.read)) return toast('Símbolo lido "' + d.read + '" não pertence a Γ', 'err');
            if (d.write !== BLANK && !machine.tapeAlphabet.includes(d.write)) return toast('Símbolo escrito "' + d.write + '" não pertence a Γ', 'err');
            pushHistory();
            if (modalCtx.transition) {
                const t = transitionById(modalCtx.transition);
                if (t) Object.assign(t, d);
            } else {
                machine.transitions.push(Object.assign({ id: 't' + (machine.seq++) }, d));
            }
            closeModal('transition-modal');
            resetSimulation(false);
            renderAll();
            toast('Regra de δ salva');
        }
        function deleteTransitionFromModal() {
            if (modalCtx.transition) {
                pushHistory();
                machine.transitions = machine.transitions.filter((t) => t.id !== modalCtx.transition);
            }
            closeModal('transition-modal');
            renderAll();
            toast('Regra removida');
        }
