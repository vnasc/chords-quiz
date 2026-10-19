const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

function loadApp(saved, navigator = { language: 'en-US' }) {
  const elements = new Map();
  const timers = new Map();
  let persisted;

  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        value: { key: 'random', length: '4', speed: 'normal', 'check-answers': 'manual', 'auto-next-countdown': '0' }[id],
        style: { setProperty() {} },
        children: [],
        handlers: {},
        attributes: {},
        classList: { add() {}, remove() {}, toggle() {} },
        append() {},
        querySelectorAll() { return []; },
        setAttribute(key, value) { this.attributes[key] = value; },
        addEventListener(type, callback) { this.handlers[type] = callback; },
        focus() {},
      });
    }

    return elements.get(id);
  }

  const context = vm.createContext({
    navigator,
    document: {
      documentElement: {},
      getElementById: element,
      querySelector: element,
      querySelectorAll: () => [],
      createElement: () => element('bar'),
      addEventListener() {},
    },
    localStorage: {
      getItem: key => key === 'chord-quiz-settings-v1' ? JSON.stringify(saved) : null,
      setItem(key, value) { persisted = JSON.parse(value); },
    },
    clearTimeout() {},
    setInterval(callback) { const id = timers.size + 1; timers.set(id, callback); return id; },
    clearInterval(id) { timers.delete(id); },
  });

  for (const file of ['i18n.js', 'script.js']) {
    let source = readFileSync(join(__dirname, '..', file), 'utf8');

    if (file === 'script.js') {
      source = source.replace(/\}\)\(\);\s*$/, 'globalThis.api = { get language() { return language; }, get question() { return question; }, startAutoCheck, startAutoNext };\n})();');
    }

    vm.runInContext(source, context);
  }

  function switchLanguage(language) {
    element('.language-switch').handlers.click({ target: { closest: () => ({ dataset: { language } }) } });
  }

  return { context, api: context.api, element, timers, switchLanguage, get persisted() { return persisted; } };
}

test('saved language overrides browser language and invalid preferences use the browser default', () => {
  assert.equal(loadApp({ language: 'en' }, { language: 'pt-BR' }).api.language, 'en');
  assert.equal(loadApp({ language: 'pt-BR' }).api.language, 'pt-BR');

  for (const saved of [null, {}, { language: 'fr' }]) {
    const app = loadApp(saved, { language: 'pt-BR' });
    assert.equal(app.api.language, 'pt-BR');
    assert.equal(app.context.document.documentElement.lang, 'pt-BR');
  }
});

test('language switching preserves answers and a live auto-check countdown', () => {
  const app = loadApp({ checkAnswers: '3' });
  const question = app.api.question;
  question.hasPlayed = true;
  question.sequence.push('I', 'V', 'vi', 'IV');
  app.api.startAutoCheck(3);
  const [timerId, tick] = [...app.timers.entries()][0];
  tick();
  app.switchLanguage('pt-BR');
  assert.equal(app.api.question, question);
  assert.equal(question.sequence.join(','), 'I,V,vi,IV');
  assert.equal(app.timers.get(timerId), tick);
  assert.equal(app.element('next').title, 'Verificar resposta em 2 segundos');
  assert.equal(app.persisted.language, 'pt-BR');
  assert.match(app.element('choices').innerHTML, /Adicionar IV/);
  tick();
  assert.equal(app.element('next').title, 'Verificar resposta em 1 segundo');
});

test('language switching preserves checked results and a live auto-next countdown', () => {
  const app = loadApp({ autoNextCountdown: '5' });
  const question = app.api.question;
  question.checked = true;
  question.sequence.push('I', 'V', 'vi', 'IV');
  app.api.startAutoNext();
  const [timerId, tick] = [...app.timers.entries()][0];
  tick();
  app.switchLanguage('pt-BR');
  assert.equal(app.api.question, question);
  assert.equal(question.checked, true);
  assert.equal(app.timers.get(timerId), tick);
  assert.equal(app.element('next').title, 'Próxima progressão em 4 segundos');
  assert.equal(app.element('play').disabled, true);
});
