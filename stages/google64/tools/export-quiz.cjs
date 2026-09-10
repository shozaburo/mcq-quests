/*
 * クイズ本文は data/quests を正本として編集する。
 * 書き出し: node stages/google64/tools/export-quiz.cjs
 * 整合確認: node stages/google64/tools/export-quiz.cjs --check
 * Node.js の標準機能だけで実行できる。
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
const context = vm.createContext({window: {}});
for (const area of 'ABCDEFGH') {
  for (const kind of ['quests', 'missions']) {
    vm.runInContext(fs.readFileSync(path.join(base, 'data', kind, area + '.js'), 'utf8'), context);
  }
}
vm.runInContext(fs.readFileSync(path.join(base, 'data/advice.js'), 'utf8'), context);
const ids = [...'ABCDEFGH'].flatMap(a => Array.from({length: 8}, (_, i) => a + (i + 1)));
for (const collection of ['MCQ_QUESTS', 'MCQ_MISSIONS', 'MCQ_ADVICE']) {
  assert.deepEqual(Object.keys(context.window[collection]).sort(), ids, collection + ': 64マスの構成');
}
const check = process.argv.includes('--check');
for (const id of ids) {
  const quest = context.window.MCQ_QUESTS[id];
  assert.equal(quest.quiz.length, 5, id);
  assert.ok(quest.name.trim(), id);
  assert.ok(context.window.MCQ_ADVICE[id].text.trim(), id + ' 助言');
  for (const field of ['m125', 'evidence']) assert.ok(context.window.MCQ_MISSIONS[id][field].trim(), id);
  for (const q of quest.quiz) {
    assert.equal(q.choices.length, 4, id);
    assert.equal(new Set(q.choices).size, 4, id + ' 選択肢の重複');
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, id);
    assert.ok(q.q.trim() && q.explain.trim() && q.choices.every(s => s.trim()), id);
  }
  if (id[0] === 'H') continue;
  const lines = [`【${id}】${quest.name} - クイズ（サイト実装分）`, '',
    `出典：stages/google64/data/quests/${id[0]}.js の ${id}`, `サイト版：quest.html?id=${id}`, ''];
  quest.quiz.forEach((q, i) => {
    lines.push(`Q${i + 1}. ${q.q}`);
    q.choices.forEach((s, n) => lines.push(`${n + 1}. ${s}${n === q.answer ? ' ← 正解' : ''}`));
    lines.push(`解説：${q.explain}`, '');
  });
  const file = path.join(base, 'quiz', id + '.txt');
  const content = lines.join('\n');
  if (check) assert.equal(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), content, id + ' 本文の同期');
  else fs.writeFileSync(file, content);
}
assert.deepEqual(fs.readdirSync(path.join(base, 'quiz')).filter(f => f.endsWith('.txt')).sort(), ids.filter(id => id[0] !== 'H').map(id => id + '.txt'));
console.log(`64マス・320問・助言64本を確認。クイズ56本を${check ? '照合しました' : '書き出しました'}。`);
