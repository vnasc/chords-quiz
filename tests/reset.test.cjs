const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../script.js'), 'utf8');

for (const storageAvailable of [true, false]) {
  test(`reset clears session statistics and refreshes accuracy with storage ${storageAvailable ? 'available' : 'unavailable'}`, () => {
    let reset;
    const progress = {};
    const removed = [];

    const context = vm.createContext({
      correct: 7,
      answered: 10,
      language: 'en',
      STATS_KEY: 'chord-quiz-progress-v1',
      LEGACY_STATS_KEY: 'cadence-prototype-stats',
      $: id => id === 'progress-text' ? progress : { addEventListener(type, callback) { reset = callback; } },
      localStorage: {
        removeItem(key) {
          if (!storageAvailable) throw new Error('Storage unavailable');

          removed.push(key);
        },
      },
    });

    const updateStart = source.indexOf('  function updateStats() {');
    const updateEnd = source.indexOf("  $('play').addEventListener", updateStart);
    const resetStart = source.indexOf("  $('reset-progress').addEventListener");
    const resetEnd = source.indexOf("  $('next').addEventListener", resetStart);
    vm.runInContext(source.slice(updateStart, updateEnd) + source.slice(resetStart, resetEnd), context);
    reset();
    assert.equal(context.correct, 0);
    assert.equal(context.answered, 0);
    assert.equal(progress.textContent, '—');

    if (storageAvailable) {
      assert.deepEqual(removed, ['chord-quiz-progress-v1', 'cadence-prototype-stats']);
    }
  });
}
