'use strict';

const TRANSLATIONS = {
  en: {
    title: 'Chord Quiz — identify progressions by ear',
    practice: 'Chord progression ear training',
    playback: 'Audio playback',
    progression: 'PROGRESSION',
    yourProgression: 'Your progression',
    chords: 'CHORDS',
    choices: 'Chord choices',
    settingsProgress: 'Practice settings and progress',
    settings: 'Settings',
    key: 'Key',
    randomKey: 'Random key',
    length: 'Chords',
    chordCount: '{count} chords',
    chordCountShort: '{count}',
    speed: 'Speed',
    slow: 'Slow',
    normal: 'Normal',
    fast: 'Fast',
    autoCheck: 'Auto-check',
    off: 'Off',
    now: 'Instant',
    manualCheck: 'Off (press Check)',
    immediately: 'Immediately',
    secondsShort: '{count} s',
    afterSeconds: 'After {count} seconds',
    seconds: '{count} seconds',
    autoNext: 'Auto-next',
    statistics: 'Statistics',
    reset: 'Reset',
    accuracy: 'Accuracy',
    language: 'Language',
    play: 'Play progression',
    playing: 'Playing progression',
    playingChord: 'Playing progression, chord {index} of {count}',
    next: 'Next progression',
    check: 'Check answer',
    nextIn: 'Next progression in {count} seconds',
    nextInOne: 'Next progression in 1 second',
    checkIn: 'Check answer in {count} seconds',
    checkInOne: 'Check answer in 1 second',
    hearOn: 'Hear selected chord: on',
    hearOff: 'Hear selected chord: off',
    position: 'Position {index}: {chord}',
    empty: 'empty',
    playSelected: ', play selected chord',
    correction: ', correct chord {chord}',
    add: 'Add {chord}',
    resetConfirm: 'Reset progress?',
  },
  'pt-BR': {
    title: 'Quiz de Acordes — identifique progressões de ouvido',
    practice: 'Treino de percepção de progressões de acordes',
    playback: 'Reprodução de áudio',
    progression: 'PROGRESSÃO',
    yourProgression: 'Sua progressão',
    chords: 'ACORDES',
    choices: 'Opções de acordes',
    settingsProgress: 'Configurações de prática e progresso',
    settings: 'Configurações',
    key: 'Tom',
    randomKey: 'Tonalidade aleatória',
    length: 'Acordes',
    chordCount: '{count} acordes',
    chordCountShort: '{count}',
    speed: 'Velocidade',
    slow: 'Lenta',
    normal: 'Normal',
    fast: 'Rápida',
    autoCheck: 'Verificação automática',
    off: 'Não',
    now: 'Imediata',
    manualCheck: 'Desativado (pressione Verificar)',
    immediately: 'Imediatamente',
    secondsShort: '{count} s',
    afterSeconds: 'Após {count} segundos',
    seconds: '{count} segundos',
    autoNext: 'Avanço automático',
    statistics: 'Estatísticas',
    reset: 'Zerar',
    accuracy: 'Precisão',
    language: 'Idioma',
    play: 'Reproduzir progressão',
    playing: 'Reproduzindo progressão',
    playingChord: 'Reproduzindo progressão, acorde {index} de {count}',
    next: 'Próxima progressão',
    check: 'Verificar resposta',
    nextIn: 'Próxima progressão em {count} segundos',
    nextInOne: 'Próxima progressão em 1 segundo',
    checkIn: 'Verificar resposta em {count} segundos',
    checkInOne: 'Verificar resposta em 1 segundo',
    hearOn: 'Ouvir acorde selecionado: ativado',
    hearOff: 'Ouvir acorde selecionado: desativado',
    position: 'Posição {index}: {chord}',
    empty: 'vazia',
    playSelected: ', reproduzir acorde selecionado',
    correction: ', acorde correto {chord}',
    add: 'Adicionar {chord}',
    resetConfirm: 'Zerar progresso?',
  },
};

function defaultLanguage(navigator = globalThis.navigator) {
  const locale = navigator?.languages?.[0] || navigator?.language || '';
  return /^pt-BR(?:-|$)/i.test(locale) ? 'pt-BR' : 'en';
}

function createI18n(getLanguage) {
  function t(key, values = {}) {
    return TRANSLATIONS[getLanguage()][key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  }

  function renderLanguage() {
    document.documentElement.lang = getLanguage();
    document.title = t('title');

    for (const attribute of ['text', 'aria', 'title']) {
      const dataAttribute = attribute === 'text' ? 'data-i18n' : `data-i18n-${attribute}`;

      document.querySelectorAll(`[${dataAttribute}]`).forEach(element => {
        const values = element.dataset.count ? { count: Number(element.dataset.count) } : {};
        const text = t(element.getAttribute(dataAttribute), values);

        if (attribute === 'text') {
          element.textContent = text;
        } else {
          element.setAttribute(attribute === 'aria' ? 'aria-label' : 'title', text);
        }
      });
    }

    document.querySelectorAll('[data-language]').forEach(button => {
      const active = button.dataset.language === getLanguage();
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  return { t, renderLanguage };
}
