import { revisionNote } from './revision-note.js';
const $ = id => document.getElementById(id);
let selectedImage = null, imagePreviewUrl = null, transcriptionInfo = null;
let examples = [], quantities = {}, result = null, analyzedInput = null, busy = false, activeProvider = null;
const text = (id, value) => { $(id).textContent = value; };
const visible = (id, show) => { $(id).hidden = !show; };
const stepCount = () => { const code = $('subject').value === 'programming'; const lines = $('attempt').value.split(/\r?\n/); text('step-count', `${code ? ($('attempt').value ? lines.length : 0) : lines.filter(s => s.trim()).length} ${code ? 'lines' : 'steps'}`); };
async function request(path, data) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, expectedProvider: activeProvider }), signal: AbortSignal.timeout(195000) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'The request could not be completed. Please retry.');
  return body;
}
function showError(error) { text('error', error.name === 'TimeoutError' ? 'The request took too long. Your work is still here; please retry.' : error.message || 'Connection failed. Please retry.'); visible('error', true); }
function subjectChanged() {
  const maths = $('subject').value === 'mathematics', code = $('subject').value === 'programming';
  visible('physics-data', !maths && !code); visible('maths-data', maths); visible('code-data', code);
  $('independent-data').hidden = code;
  text('question-label', code ? 'What should this code do?' : 'The question'); text('attempt-label', code ? 'Your code · preserve indentation' : 'Your worked solution');
  $('attempt').placeholder = code ? 'def total(numbers):\n    result = 0\n    for i in range(len(numbers) + 1):\n        result += numbers[i]\n    return result' : 'Write one reasoning step per line.';
  $('question').placeholder = code ? 'Describe the expected behavior, inputs, and what you want to learn.' : maths ? 'Solve 2*x + 3 = 11. Show each step.' : 'A cart starts from rest and accelerates at 2 m/s² for 5 s. Find its final velocity.';
  renderExamples(); stepCount();
}
function renderExamples() {
  $('example-buttons').replaceChildren();
  for (const example of examples.filter(e => (e.subject ?? 'physics') === $('subject').value)) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = example.label;
    button.addEventListener('click', () => {
      if (busy) return;
      $('question').value = example.question; $('attempt').value = example.attempt;
      $('language').value = example.language ?? 'Python'; $('error-message').value = example.errorMessage ?? '';
      $('scenario').value = example.scenario ?? 'general'; $('reference-equation').value = example.referenceEquation ?? '';
      for (const key of Object.keys(quantities)) $('given-' + key).value = example.givens?.[key] ?? '';
      transcriptionInfo = null; visible('transcript-review', false); stepCount(); clearResult(); $('attempt').focus();
    });
    $('example-buttons').append(button);
  }
}
function clearResult() { result = null; visible('results', false); visible('error', false); visible('empty-state', true); }
function getInput() {
  const givens = {};
  if ($('subject').value === 'physics') for (const key of Object.keys(quantities)) { const value = $('given-' + key).value; if (value.trim() !== '') givens[key] = Number(value); }
  return { transcriptionSource: transcriptionInfo ? { ...transcriptionInfo, confirmedByUser: $('confirm-transcript').checked } : null, language: $('language').value, errorMessage: $('subject').value === 'programming' ? $('error-message').value : '', subject: $('subject').value, question: $('question').value, attempt: $('attempt').value, scenario: $('subject').value === 'physics' ? $('scenario').value : 'general', givens, referenceEquation: $('subject').value === 'mathematics' ? $('reference-equation').value : '' };
}
function renderResult(data) {
  result = data;
  const f = data.feedback;
  const labels = { incorrect: 'A wrong turn to revisit', correct: 'Reasoning looks correct', incomplete: 'You’re partway there', ambiguous: 'Needs clarification' };
  text('status-badge', labels[data.status]); $('status-badge').className = 'status-badge ' + data.status;
  text('summary', f.summary); visible('conflict', data.conflict);
  text('conflict', 'Needs review: the independent checks and Gemma’s interpretation do not fully agree, or the confirmed inputs conflict. Review the evidence before trusting a correction.');
  visible('issue-box', Boolean(f.firstIssue));
  if (f.firstIssue) { text('issue-step', `FIRST ISSUE IDENTIFIED BY GEMMA · STEP ${f.firstIssue.step}`); text('issue-quote', f.firstIssue.quote); text('misconception', f.firstIssue.misconception); }
  text('hint-one', f.hints[0]); text('hint-two', f.hints[1]);
  for (const id of ['hint-one', 'hint-two', 'hint-two-button', 'correction-button', 'correction-box', 'follow-up-section', 'follow-up-answer']) visible(id, false);
  visible('hint-one-button', true);
  text('correction-title', data.status === 'correct' ? 'Why this works' : data.status === 'ambiguous' ? 'Clarify before correcting' : 'A better next step');
  text('correction', f.correction); text('follow-up-question', f.followUp.question);
  text('follow-up-answer', `${f.followUp.answer}\n\n${f.followUp.explanation}`); $('follow-up-attempt').value = '';
  text('uncertainty', `Gemma’s uncertainty: ${f.uncertainty}`);
  text('inference-info', `${data.inference.model}\n${(data.inference.milliseconds / 1000).toFixed(1)}s · real inference`);
  const checks = data.verification.checks;
  text('check-count', `${checks.filter(c => c.status === 'pass').length} passed · ${checks.filter(c => c.status === 'fail').length} flagged · ${checks.filter(c => c.status === 'unverified').length} unchecked`);
  $('checks-list').replaceChildren();
  for (const check of checks) {
    const li = document.createElement('li'); li.className = 'check-' + check.status;
    const label = document.createElement('strong'); label.textContent = `Step ${check.step} · ${check.status === 'unverified' ? 'Unchecked' : check.status === 'pass' ? 'Check passed' : 'Flagged'}${check.kind ? ' · ' + check.kind : ''}`;
    const code = document.createElement('code'); code.textContent = check.quote;
    const detail = document.createElement('span'); detail.textContent = check.detail;
    li.append(label, code, detail); $('checks-list').append(li);
  }
  $('reference-list').replaceChildren();
  for (const reference of data.verification.references) { const p = document.createElement('p'); p.className = 'reference'; p.textContent = `${reference.quantity}: ${reference.value} ${reference.unit} · ${reference.rule}`; $('reference-list').append(p); }
  for (const contradiction of data.verification.contradictions) { const p = document.createElement('p'); p.className = 'notice'; p.textContent = `Confirmed ${contradiction.quantity} conflicts with ${contradiction.rule}. Recheck question data.`; $('reference-list').append(p); }
  text('verification-limit', data.verification.limitation);
  visible('results', true); visible('empty-state', false);
}
$('analyze-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  if (transcriptionInfo && !$('confirm-transcript').checked) { showError(new Error('Check the extracted text against the image, edit anything misread, then confirm the transcription.')); return; }
  const input = getInput(); busy = true; result = null;
  $('analyze-button').disabled = true; $('subject').disabled = true;
  text('analyze-button', 'Looking for the first wrong turn…');
  visible('results', false); visible('empty-state', false); visible('error', false); visible('loading', true);
  try { const data = await request('/api/analyze', input); analyzedInput = input; renderResult(data); text('connection', data.inference.offline ? 'Local Gemma 4 connected' : 'Gemma 4 connected'); $('connection').classList.add('connected'); }
  catch (error) { showError(error); visible('empty-state', true); }
  finally { busy = false; $('analyze-button').disabled = false; $('subject').disabled = false; text('analyze-button', 'Find the first wrong turn ↗'); visible('loading', false); }
});
$('check-model').addEventListener('click', async () => { $('check-model').disabled = true; visible('error', false); try { const data = await request('/api/model-check', {}); text('connection', 'Gemma 4 available'); $('connection').classList.add('connected'); text('check-model', `${data.model} is available ✓`); } catch (e) { showError(e); } finally { $('check-model').disabled = false; } });
$('hint-one-button').addEventListener('click', () => { visible('hint-one', true); visible('hint-one-button', false); visible('hint-two-button', true); });
$('hint-two-button').addEventListener('click', () => { visible('hint-two', true); visible('hint-two-button', false); visible('correction-button', true); });
$('correction-button').addEventListener('click', () => { visible('correction-box', true); visible('correction-button', false); visible('follow-up-section', true); });
$('follow-up-answer-button').addEventListener('click', () => visible('follow-up-answer', true));
$('attempt').addEventListener('input', stepCount);
$('subject').addEventListener('change', () => { clearResult(); subjectChanged(); });
$('export-button').addEventListener('click', () => {
  if (!result || !analyzedInput) return;
  const content = revisionNote(analyzedInput, result, $('follow-up-attempt').value, !$('correction-box').hidden, !$('follow-up-answer').hidden);
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `margin-${analyzedInput.subject}-revision.md`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
try {
  const [healthResponse, examplesResponse] = await Promise.all([fetch('/api/health'), fetch('/examples.json')]);
  if (!healthResponse.ok || !examplesResponse.ok) throw new Error('Could not load Margin. Refresh the page.');
  const health = await healthResponse.json(); activeProvider = health.provider ?? 'google'; examples = await examplesResponse.json(); quantities = health.quantities;
  text('connection', health.offline ? 'Local Gemma · not checked' : health.configured ? 'Key saved · connection not checked' : 'Gemma key needed');
  if (health.offline) text('privacy-copy', 'Offline mode: work is sent only to Ollama on this computer. No Google API request or cloud fallback is used.');
  for (const [key, info] of Object.entries(quantities)) {
    const div = document.createElement('div'), label = document.createElement('label'), input = document.createElement('input');
    label.htmlFor = 'given-' + key; label.textContent = `${key} · ${info.unit}`; label.title = info.label;
    input.id = 'given-' + key; input.type = 'number'; input.step = 'any'; input.placeholder = '—'; input.setAttribute('aria-label', `${info.label}, ${info.unit}`);
    div.append(label, input); $('givens').append(div);
  }
  subjectChanged();
} catch (e) { showError(e); }

$('image-input').addEventListener('change', () => {
  const file = $('image-input').files[0]; selectedImage = null; transcriptionInfo = null; visible('transcript-review', false); $('read-image').disabled = true;
  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  visible('image-preview', false); text('image-status', '');
  if (!file) return;
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2097152) { showError(new Error('Use a PNG, JPEG or WebP image no larger than 2 MB.')); return; }
  selectedImage = file; imagePreviewUrl = URL.createObjectURL(file); $('image-preview').src = imagePreviewUrl; visible('image-preview', true); $('read-image').disabled = false;
});
$('read-image').addEventListener('click', async () => {
  if (!selectedImage || busy) return;
  if (($('question').value.trim() || $('attempt').value.trim()) && !window.confirm('Replace the current question and work with the image transcription?')) return;
  busy = true; $('read-image').disabled = true; $('analyze-button').disabled = true; $('subject').disabled = true; visible('error', false); text('image-status', 'Gemma is reading your image…');
  try {
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read this image.')); reader.readAsDataURL(selectedImage); });
    const data = await request('/api/transcribe', { subject: $('subject').value, language: $('language').value, image: { mimeType: selectedImage.type, data: dataUrl.split(',')[1] } });
    $('question').value = data.transcription.question; $('attempt').value = data.transcription.attempt; $('scenario').value = 'general'; $('reference-equation').value = ''; for (const k of Object.keys(quantities)) $('given-' + k).value = '';
    transcriptionInfo = { type: 'image', model: data.inference.model, provider: data.inference.provider, uncertainty: data.transcription.uncertainty };
    clearResult(); stepCount(); $('confirm-transcript').checked = false; visible('transcript-review', true);
    text('transcript-warning', 'Review required: ' + data.transcription.uncertainty + ' Exact-step feedback will refer to your reviewed text, not directly to image pixels.');
    text('image-status', 'Image read with real ' + data.inference.model + '. Review and confirm the extracted text, then debug.');
  } catch (e) { showError(e); text('image-status', 'Image transcription failed. You can retry or enter text manually.'); }
  finally { busy = false; $('read-image').disabled = false; $('analyze-button').disabled = false; $('subject').disabled = false; }
});
