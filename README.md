# Modelador de Máquinas de Turing (MT)

Simulador visual de Máquinas de Turing (determinísticas e não determinísticas) para a disciplina de Teoria da Computação. Segue o mesmo padrão do `Modelador_AP`.

**Online:** https://rovanni.github.io/Modelador_MT/

**Local:** clone o repositório (`git clone https://github.com/rovanni/Modelador_MT.git`) e abra `index.html` no navegador. Funciona **sem internet**: Tailwind e fontes são locais. O guia didático está em `ajuda.html`.

## Estrutura

```
index.html          estrutura da página (HTML)
ajuda.html          guia didático
css/tailwind.css    utilitários do Tailwind já compilados (gerado, não editar à mão)
css/fonts.css       fontes locais (Fira Code, Inter, Outfit) -> pasta fonts/
css/style.css       estilos complementares
fonts/              arquivos .woff2 das fontes
tools/              configuração para regerar css/tailwind.css
js/model.js         estado da máquina, histórico (desfazer/refazer), utilidades, alfabetos
js/canvas.js        desenho do grafo, interação (mover, conectar, zoom), layouts automáticos
js/panels.js        tabela de transições, validação (MTD/MTN), contadores
js/modals.js        modais de estado e de transição
js/simulation.js    motor da MT, rastreamento pré-computado, fita, ramos, teste em lote
js/examples.js      exemplos prontos (aⁿbⁿ, palíndromo, soma unária, cópia, MTN, loop)
js/export.js        JSON, PNG (fundo branco), LaTeX/TikZ
js/main.js          atalhos de teclado e inicialização
tests/run_tests.js  testes da lógica (node tests/run_tests.js)
tests/ui_checks.js  testes de interface (colar no console do navegador)
exportacoes_teste/  exemplos de JSON, TikZ e PNG gerados pelo simulador
```

A ordem dos `<script>` em `index.html` importa (modelo → canvas → painéis → modais → simulação → exemplos → exportação → início).

## Testes

```
node tests/run_tests.js
```

Carrega os arquivos de `js/` num ambiente simulado e verifica exemplos, parada/aceitação, MTN, exportar/importar JSON, TikZ, atalhos e desfazer/refazer.

## Convenções

- Símbolo de branco: `B`, como nos slides (aceita `_`, `␣` e `□` na digitação e na importação de JSON). Por isso `B` não deve ser usado como símbolo comum de Σ ou Γ.
- Movimentos: `R` direita, `L` esquerda, `S` fica.
- A computação inteira é calculada de uma vez (`buildFrames`) e exibida quadro a quadro; limite de 250 passos.

## Testes de interface

Abra `index.html`, abra o console (F12), cole o conteúdo de `tests/ui_checks.js` e tecle Enter. Ele simula arrastar, Shift+arrastar, duplo clique, menu de contexto, layouts, Play/passos, rejeição, salvamento, PNG/TikZ/JSON e lote, e imprime PASS/FAIL.

## Uso offline (regerar o CSS)

`css/tailwind.css` foi gerado a partir das classes usadas em `index.html`, `ajuda.html` e `js/*.js`. Se você adicionar classes novas do Tailwind, regere (precisa de Node):

```
cd tools
npx tailwindcss@3.4.17 -c tailwind.config.js -i tailwind-input.css -o ../css/tailwind.css --minify
```

## Funcionalidades extras

- **Estado de rejeição (q_r)**: anel tracejado vermelho; ao chegar nele a máquina para e rejeita.
- **Configuração (descrição instantânea)** em cada passo, no formato `X X q₁ y 1`.
- **Salvamento automático** no navegador (localStorage); os Exemplos recomeçam do zero.
- **Exportações**: JSON (inclui `rejeicao`), PNG com fundo branco, TikZ e documento `.tex` completo.
