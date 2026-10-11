(() => {
  'use strict';

  const templates = [
    { id: 'pop', name: 'The pop loop', four: ['I', 'V', 'vi', 'IV'], three: ['I', 'V', 'vi'] },
    { id: 'anthem', name: 'The anthem', four: ['I', 'IV', 'V', 'I'], three: ['I', 'IV', 'V'] },
    { id: 'wistful', name: 'The wistful turn', four: ['vi', 'IV', 'I', 'V'], three: ['vi', 'IV', 'I'] },
    { id: 'classic', name: 'The classic cadence', four: ['I', 'vi', 'ii', 'V'], three: ['ii', 'V', 'I'] },
    { id: 'home', name: 'The way home', four: ['I', 'IV', 'I', 'V'], three: ['I', 'vi', 'V'] },
    { id: 'gentle', name: 'The gentle lift', four: ['I', 'iii', 'IV', 'V'], three: ['I', 'iii', 'IV'] },
    { id: 'minor', name: 'The minor turn', four: ['vi', 'IV', 'V', 'I'], three: ['vi', 'ii', 'V'] },
    { id: 'walk', name: 'The descending walk', four: ['I', 'V', 'IV', 'I'], three: ['I', 'V', 'IV'] },
    { id: 'circle', name: 'The circle', four: ['I', 'vi', 'ii', 'V'], three: ['I', 'ii', 'V'] },
    { id: 'fifties', name: 'The 50s cadence', four: ['I', 'vi', 'IV', 'V'], three: ['I', 'vi', 'ii'] },
    { id: 'six-four', name: 'Six-four resolve', four: ['I', 'V', 'vi', 'iii'], three: ['IV', 'I', 'V'] },
    { id: 'minor-descent', name: 'Minor descent', four: ['vi', 'V', 'IV', 'V'], three: ['vi', 'V', 'IV'] },
    { id: 'open-road', name: 'Open road', four: ['I', 'ii', 'IV', 'V'], three: ['I', 'ii', 'V'] },
    { id: 'bright-turn', name: 'Bright turn', four: ['I', 'iii', 'vi', 'IV'], three: ['I', 'IV', 'vi'] },
    { id: 'plagal', name: 'Plagal turn', four: ['IV', 'I', 'V', 'vi'], three: ['IV', 'I', 'vi'] },
    { id: 'lift', name: 'The lift', four: ['IV', 'V', 'iii', 'vi'], three: ['IV', 'V', 'I'] },
    { id: 'falling-third', name: 'Falling thirds', four: ['iii', 'vi', 'ii', 'V'], three: ['iii', 'vi', 'ii'] },
    { id: 'soft-landing', name: 'Soft landing', four: ['vi', 'iii', 'IV', 'I'], three: ['I', 'iii', 'V'] },
    { id: 'backdoor', name: 'Back around', four: ['I', 'IV', 'ii', 'V'], three: ['IV', 'ii', 'V'] },
    { id: 'dominant-turn', name: 'Dominant turn', four: ['V', 'vi', 'IV', 'I'], three: ['I', 'vi', 'ii'] },
    { id: 'open-cadence', name: 'Open cadence', four: ['I', 'vi', 'ii', 'IV'], three: ['ii', 'IV', 'I'] },
    { id: 'minor-predominant', name: 'Minor predominant', four: ['vi', 'IV', 'ii', 'V'], three: ['V', 'vi', 'ii'] },
    { id: 'reordered', name: 'Reordered cadence', four: ['I', 'ii', 'V', 'IV'], three: ['I', 'IV', 'ii'] },
  ];

  const roots = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const degreeSemitones = { I: 0, ii: 2, iii: 4, IV: 5, V: 7, vi: 9 };
  const quality = { I: 'major', ii: 'minor', iii: 'minor', IV: 'major', V: 'major', vi: 'minor' };
  const chordDegrees = ['I', 'ii', 'iii', 'IV', 'V', 'vi'];
  const $ = id => document.getElementById(id);

  let question;
  let correct = 0;
  let answered = 0;
  let playing = false;
  let audioContext;
  let playTimer;
  let stepTimers = [];

  const SETTINGS_KEY = 'chord-quiz-settings-v1';
  const STATS_KEY = 'chord-quiz-progress-v1';
  const LEGACY_STATS_KEY = 'cadence-prototype-stats';

  const stats = (() => {
    try {
      const stored = localStorage.getItem(STATS_KEY);
      const legacy = stored === null;
      const raw = stored ?? localStorage.getItem(LEGACY_STATS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;

      if (legacy && parsed) {
        try {
          localStorage.setItem(STATS_KEY, JSON.stringify(parsed));
          localStorage.removeItem(LEGACY_STATS_KEY);
        } catch {}
      }

      return parsed || { correct: 0, answered: 0 };
    } catch {
      return { correct: 0, answered: 0 };
    }
  })();

  correct = Number(stats.correct) || 0;
  answered = Number(stats.answered) || 0;

  const wave = $('wave');
  for (let i = 0; i < 21; i++) {
    const bar = document.createElement('i');
    bar.style.setProperty('--h', `${6 + Math.abs(Math.sin(i * 1.71)) * 72}px`);
    bar.style.setProperty('--d', `${(i % 9) * -0.07}s`);
    wave.append(bar);
  }

  function shuffle(items) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      if (!saved) return;

      if (['random', ...Object.keys(roots)].includes(saved.key)) $('key').value = saved.key;
      if (['3', '4'].includes(String(saved.length))) $('length').value = String(saved.length);
      if (['slow', 'normal', 'fast'].includes(saved.speed)) $('speed').value = saved.speed;

      $('play-on-select').checked = saved.playOnSelect === true;
    } catch {}
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        key: $('key').value,
        length: $('length').value,
        speed: $('speed').value,
        playOnSelect: $('play-on-select').checked,
      }));
    } catch {}
  }

  function newRound() {
    stopVisual();

    const length = Number($('length').value);
    const key = $('key').value;
    const keyName = key === 'random' ? Object.keys(roots)[Math.floor(Math.random() * 7)] : key;
    const field = length === 4 ? 'four' : 'three';
    const available = templates
      .map(template => template[field])
      .filter((sequence, index, all) => all.findIndex(other => other.join('|') === sequence.join('|')) === index);

    const previous = question?.correct?.join('|');
    const choices = available.filter(sequence => sequence.join('|') !== previous);
    const pool = choices.length ? choices : available;

    question = {
      length,
      keyName,
      correct: pool[Math.floor(Math.random() * pool.length)],
      sequence: [],
      checked: false,
      hasPlayed: false,
    };
    $('next').hidden = true;
    $('next').classList.remove('visible');

    renderBuilder();
    updateStats();
  }

  function renderBuilder() {
    const { sequence, length, checked } = question;
    $('sequence').style.gridTemplateColumns = `repeat(${length},minmax(0,1fr))`;

    $('sequence').innerHTML = Array.from({ length }, (_, index) => {
      const chord = sequence[index] || '';
      const matches = chord === question.correct[index];
      const resultClass = checked ? (matches ? 'correct' : 'wrong') : '';
      const content = checked && !matches
        ? `<s>${chord}</s><span class="correction">${question.correct[index]}</span>`
        : chord;
      const label = chord
        ? `Position ${index + 1}: ${chord}${checked ? ', play selected chord' : ''}${checked && !matches ? `, correct chord ${question.correct[index]}` : ''}`
        : `Position ${index + 1}: empty`;

      return `<button class="sequence-slot ${chord ? 'filled' : ''} ${resultClass}" type="button" data-slot="${index}" aria-label="${label}" ${!chord ? 'disabled' : ''}>${content}</button>`;
    }).join('');

    $('sequence').querySelectorAll('.sequence-slot:not(:disabled)').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.slot);

      if (question.checked) {
        playAnswerChord(index);
        return;
      }
      question.sequence.splice(index, 1);
      renderBuilder();
    }));

    $('choices').innerHTML = chordDegrees.map(chord =>
      `<button class="chord-choice" type="button" data-chord="${chord}" aria-label="Add ${chord}" ${!question.hasPlayed || checked || sequence.length === length ? 'disabled' : ''}>${chord}</button>`
    ).join('');

    $('choices').querySelectorAll('.chord-choice:not(:disabled)').forEach(button => button.addEventListener('click', () => {
      const index = question.sequence.length;
      question.sequence.push(button.dataset.chord);

      if ($('play-on-select').checked) playAnswerChord(index);

      renderBuilder();
    }));

    updateActionButton();
  }

  function updateActionButton() {
    const isCheckAction = !question.checked;
    const actionAvailable = question.checked || question.sequence.length === question.length;
    const icon = isCheckAction
      ? '<path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    const label = isCheckAction ? 'Check answer' : 'Next progression';

    $('next').innerHTML = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${icon}</svg>`;
    $('next').setAttribute('aria-label', label);
    $('next').title = label;
    $('next').hidden = !actionAvailable;
    $('next').classList.toggle('visible', actionAvailable);
    $('next').classList.toggle('check-action', isCheckAction);
  }

  function chordNotes(degree, keyMidi) {
    const root = keyMidi + degreeSemitones[degree];
    return quality[degree] === 'major' ? [root, root + 4, root + 7] : [root, root + 3, root + 7];
  }

  function playAnswerChord(index) {
    const ctx = getAudio();
    const notes = chordNotes(question.sequence[index], 48 + roots[question.keyName]);
    const start = ctx.currentTime + 0.025;
    const duration = 0.8;

    tone(ctx, 440 * Math.pow(2, (notes[0] - 12 - 69) / 12), start, duration, 0.16, 'sine');

    notes.forEach((note, j) => tone(
      ctx,
      440 * Math.pow(2, (note + 12 - 69) / 12),
      start + j * 0.018,
      duration,
      0.075,
      j === 0 ? 'triangle' : 'sine',
    ));
  }

  function getAudio() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();

    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  }

  function tone(ctx, frequency, start, duration, volume, type = 'triangle') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  function play() {
    if (playing) return;

    const ctx = getAudio();
    const base = ctx.currentTime + 0.08;
    const speed = $('speed').value;
    const beat = speed === 'slow' ? 1.05 : speed === 'fast' ? 0.5 : 0.72;
    const duration = beat * 0.88;
    const keyMidi = 48 + roots[question.keyName];
    const progression = question.correct;

    playing = true;
    wave.classList.add('playing');
    $('play').setAttribute('aria-label', 'Playing progression');
    $('play').disabled = true;
    $('next').disabled = true;

    $('choices').querySelectorAll('.chord-choice').forEach(button => {
      button.disabled = true;
    });

    progression.forEach((degree, index) => {
      const start = base + index * beat;
      const notes = chordNotes(degree, keyMidi);

      // Root in the bass plus a close, soft triad above it.
      tone(ctx, 440 * Math.pow(2, (notes[0] - 12 - 69) / 12), start, duration * 0.96, 0.16, 'sine');
      notes.forEach((note, j) => tone(
        ctx,
        440 * Math.pow(2, (note + 12 - 69) / 12),
        start + j * 0.018,
        duration,
        0.075,
        j === 0 ? 'triangle' : 'sine',
      ));

      const playbackQuestion = question;
      stepTimers.push(setTimeout(() => {
        if (question !== playbackQuestion || !playing) return;
        Array.from($('sequence').children).forEach((slot, slotIndex) => {
          slot.classList.toggle('audio-current', slotIndex === index);
        });
        $('play').setAttribute('aria-label', `Playing progression, chord ${index + 1} of ${progression.length}`);
      }, Math.max(0, (start - ctx.currentTime) * 1000)));
    });

    const playbackQuestion = question;
    playTimer = setTimeout(() => {
      if (question !== playbackQuestion) return;

      question.hasPlayed = true;
      stopVisual();
      renderBuilder();
    }, (progression.length * beat + 0.2) * 1000);
  }

  function stopVisual() {
    playing = false;

    clearTimeout(playTimer);
    stepTimers.forEach(clearTimeout);
    stepTimers = [];
    wave.classList.remove('playing');
    Array.from($('sequence').children).forEach(slot => slot.classList.remove('audio-current'));

    if ($('play')) {
      $('play').disabled = false;
      $('play').setAttribute('aria-label', 'Play progression');
    }
    if ($('next')) $('next').disabled = false;

    $('choices').querySelectorAll('.chord-choice').forEach(button => {
      button.disabled = false;
    });
  }

  function checkAnswer() {
    if (!question || question.checked || question.sequence.length !== question.length) return;

    question.checked = true;
    answered++;

    const isCorrect = question.sequence.every((chord, index) => chord === question.correct[index]);
    if (isCorrect) correct++;

    try {
      localStorage.setItem(STATS_KEY, JSON.stringify({ correct, answered }));
    } catch {}

    renderBuilder();
    $('next').focus({ preventScroll: true });
    updateStats();
  }

  function updateStats() {
    const pct = answered ? Math.round(correct / answered * 100) : 0;

    $('progress-text').textContent = answered ? `${pct}%` : '—';
  }

  $('play').addEventListener('click', play);

  $('reset-progress').addEventListener('click', () => {
    if (!window.confirm('Reset progress?')) return;

    correct = 0;
    answered = 0;

    try {
      localStorage.removeItem(STATS_KEY);
      localStorage.removeItem(LEGACY_STATS_KEY);
    } catch {}

    updateStats();
  });

  $('next').addEventListener('click', () => {
    if (!question.checked) {
      checkAnswer();
      return;
    }

    newRound();
    play();
  });

  $('key').addEventListener('change', () => {
    saveSettings();
    newRound();
  });

  $('length').addEventListener('change', () => {
    saveSettings();
    newRound();
  });

  $('speed').addEventListener('change', saveSettings);
  $('play-on-select').addEventListener('change', saveSettings);

  document.addEventListener('keydown', event => {
    if (
      event.key === 'Backspace' &&
      !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) &&
      !question.checked
    ) {
      event.preventDefault();
      question.sequence.pop();

      renderBuilder();
    }
    if ((event.key === ' ' || event.key === 'Enter') && event.target === document.body) {
      event.preventDefault();

      play();
    }
  });

  loadSettings();
  newRound();
})();
