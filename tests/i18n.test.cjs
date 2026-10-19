const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../i18n.js'), 'utf8');

function load(document) {
  const context = vm.createContext({ document, language: 'en' });
  vm.runInContext(`${source}\nthis.api = { TRANSLATIONS, defaultLanguage, ...createI18n(() => language) };`, context);
  return context;
}

test('English and Brazilian Portuguese cover every static and dynamic translation key', () => {
  const { api } = load();
  const html = readFileSync(join(__dirname, '../index.html'), 'utf8');
  const script = readFileSync(join(__dirname, '../script.js'), 'utf8');
  const keys = Object.keys(api.TRANSLATIONS.en).sort();
  assert.deepEqual(Object.keys(api.TRANSLATIONS['pt-BR']).sort(), keys);

  for (const language of ['en', 'pt-BR']) {
    for (const key of keys) {
      assert.ok(api.TRANSLATIONS[language][key].length > 0);
      const placeholders = text => [...text.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
      assert.deepEqual(placeholders(api.TRANSLATIONS[language][key]), placeholders(api.TRANSLATIONS.en[key]));
    }

    for (const match of html.matchAll(/data-i18n(?:-aria|-title)?="([^"]+)"/g)) {
      assert.equal(typeof api.TRANSLATIONS[language][match[1]], 'string', match[1]);
    }

    for (const match of script.matchAll(/\bt\('([^']+)'/g)) {
      assert.equal(typeof api.TRANSLATIONS[language][match[1]], 'string', match[1]);
    }
  }
});

test('browser language detection matches interval-quiz', () => {
  const { defaultLanguage } = load().api;

  for (const locale of ['pt-BR', 'pt-br', 'pt-BR-u-nu-latn']) {
    assert.equal(defaultLanguage({ languages: [locale, 'en'] }), 'pt-BR');
  }

  for (const locale of ['en-US', 'pt-PT', 'pt', 'es-ES']) {
    assert.equal(defaultLanguage({ languages: [locale, 'pt-BR'] }), 'en');
  }

  assert.equal(defaultLanguage({ language: 'pt-BR' }), 'pt-BR');
  assert.equal(defaultLanguage({ languages: [], language: 'pt-BR' }), 'pt-BR');
  assert.equal(defaultLanguage({}), 'en');
  assert.equal(defaultLanguage(), 'en');
});

test('option labels are compact with descriptive accessible chord counts', () => {
  const context = load();
  const { t } = context.api;

  for (const language of ['en', 'pt-BR']) {
    context.language = language;
    assert.equal(t('chordCountShort', { count: 3 }), '3');
    assert.equal(t('chordCountShort', { count: 4 }), '4');
    assert.equal(t('secondsShort', { count: 3 }), '3 s');
    assert.equal(t('secondsShort', { count: 5 }), '5 s');
    assert.equal(t('now'), language === 'en' ? 'Instant' : 'Imediata');
    assert.equal(t('chordCount', { count: 4 }), language === 'en' ? '4 chords' : '4 acordes');
  }
});

test('dynamic text interpolates chord positions, playback, and countdowns', () => {
  const context = load();
  const { t } = context.api;
  assert.equal(t('checkInOne'), 'Check answer in 1 second');
  assert.equal(t('nextIn', { count: 5 }), 'Next progression in 5 seconds');
  context.language = 'pt-BR';
  assert.equal(t('checkInOne'), 'Verificar resposta em 1 segundo');
  assert.equal(t('checkIn', { count: 3 }), 'Verificar resposta em 3 segundos');
  assert.equal(t('nextInOne'), 'Próxima progressão em 1 segundo');
  assert.equal(t('position', { index: 2, chord: 'vi' }), 'Posição 2: vi');
  assert.equal(t('playingChord', { index: 2, count: 4 }), 'Reproduzindo progressão, acorde 2 de 4');
  assert.equal(t('add', { chord: 'IV' }), 'Adicionar IV');
});

test('renderLanguage updates text, accessibility labels, tooltips, and flag states', () => {
  function element(attributes, dataset = {}) {
    return { dataset, textContent: '', attributes, getAttribute: key => attributes[key], setAttribute: (key, value) => { attributes[key] = value; } };
  }

  const text = element({ 'data-i18n': 'chordCount' }, { count: '4' });
  const aria = element({ 'data-i18n-aria': 'randomKey' });
  const title = element({ 'data-i18n-title': 'randomKey' });
  const flags = ['en', 'pt-BR'].map(language => ({
    ...element({}, { language }),
    classList: { toggle(name, active) { this.active = active; } },
  }));
  const document = {
    documentElement: {},
    querySelectorAll: selector => ({ '[data-i18n]': [text], '[data-i18n-aria]': [aria], '[data-i18n-title]': [title], '[data-language]': flags })[selector],
  };
  const context = load(document);
  context.language = 'pt-BR';
  context.api.renderLanguage();
  assert.equal(document.documentElement.lang, 'pt-BR');
  assert.equal(document.title, 'Quiz de Acordes — identifique progressões de ouvido');
  assert.equal(text.textContent, '4 acordes');
  assert.equal(aria.attributes['aria-label'], 'Tonalidade aleatória');
  assert.equal(title.attributes.title, 'Tonalidade aleatória');
  assert.equal(flags[0].attributes['aria-pressed'], 'false');
  assert.equal(flags[1].attributes['aria-pressed'], 'true');
  context.language = 'en';
  context.api.renderLanguage();
  assert.equal(text.textContent, '4 chords');
  assert.equal(flags[0].classList.active, true);
});
