const fs = require('fs');
const path_ = require('path');
const ORDER = ['model', 'canvas', 'panels', 'modals', 'simulation', 'examples', 'export', 'main'];
const jsDir = path_.join(__dirname, '..', 'js');
const code = ORDER.map((n) => fs.readFileSync(path_.join(jsDir, n + '.js'), 'utf8')).join(String.fromCharCode(10));

const ctxStub = new Proxy({}, {
    get: (t, k) => {
        if (k === 'measureText') return () => ({ width: 20 });
        return () => {};
    },
    set: () => true
});

function makeEl(id) {
    return {
        id: id, value: '', textContent: '', innerHTML: '', className: '',
        style: {}, width: 800, height: 440, clientWidth: 800, clientHeight: 440,
        classList: (() => {
            const set = new Set(['hidden']);
            return {
                add: (...c) => c.forEach((x) => set.add(x)),
                remove: (...c) => c.forEach((x) => set.delete(x)),
                toggle: (c) => (set.has(c) ? set.delete(c) : set.add(c)),
                contains: (c) => set.has(c),
                _set: set
            };
        })(),
        appendChild() {}, removeChild() {}, insertBefore() {},
        querySelectorAll() { return []; }, querySelector() { return null; },
        addEventListener() {}, removeEventListener() {},
        getContext() { return ctxStub; },
        toDataURL() { return 'data:image/png;base64,STUB'; },
        getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 440 }; },
        click() {}, select() {}, remove() {}, focus() {}, blur() {},
        setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
        dataset: {}, children: [], options: [], parentNode: null,
        closest() { return null; }, contains() { return false; }
    };
}
const els = {};
const listeners = { document: {}, window: {} };
const documentStub = {
    getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; },
    createElement(tag) { return makeEl('dyn-' + tag); },
    createTextNode() { return {}; },
    addEventListener(type, fn) { (listeners.document[type] = listeners.document[type] || []).push(fn); },
    removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    documentElement: { classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} } },
    body: { appendChild() {}, removeChild() {} }
};
const windowStub = {
    addEventListener(type, fn) { (listeners.window[type] = listeners.window[type] || []).push(fn); },
    removeEventListener() {},
    devicePixelRatio: 1, innerWidth: 1200, innerHeight: 900,
    matchMedia() { return { matches: false, addEventListener() {} }; }
};
const URLStub = { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} };
class BlobStub { constructor() {} }
const storage = {
    store: {},
    getItem(k) { return this.store[k] === undefined ? null : this.store[k]; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
};

const EXPORT_HOOK = `
;globalThis.__tm = {
    examples, loadExample, stepSimulation, resetSimulation, runSimulation, buildFrames, showFrame, simStepBack, simStepFirst, simStepLast, simTogglePlay, startSingleSimulation, runBatchTests, autoLayoutCircle, layoutGrid, layoutLine, simActiveEdgeIds, renderTrace, stopRun,
    machineJSON, applyImported, importFromJSON, generateTikZ, exportToJSON,
    exportToPNG, exportToLaTeX, copyTikZ, undo, redo, fitView, zoomBy,
    get machine() { return machine; },
    get sim() { return sim; },
    get tapeWindow() { return tapeWindow; },
    get tapeGet() { return tapeGet; },
    get computeTapeRange() { return computeTapeRange; },
    simStatus,
    get hoverEdge() { return hoverEdge; },
    set hoverEdge(v) { hoverEdge = v; },
    listeners: LISTENERS
};
`;

const fn = new Function('document', 'window', 'navigator', 'URL', 'Blob', 'localStorage', 'requestAnimationFrame', 'alert', 'LISTENERS', code + EXPORT_HOOK);
fn(documentStub, windowStub, {}, URLStub, BlobStub, storage, (f) => { f(() => {}); }, () => {}, listeners);
console.log('SCRIPT LOADED OK');

module.exports = { els, documentStub, windowStub };
