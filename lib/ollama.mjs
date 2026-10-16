import { AppError, feedbackSchema } from './schema.mjs';
const base = 'http://127.0.0.1:11434';
const models = ['gemma4:e2b-it-q4_K_M', 'gemma4:e2b', 'gemma4:e4b', 'gemma4:12b', 'gemma4:26b', 'gemma4:31b'];

async function localRequest(path, body, fetchImpl) {
  let response;
  try { response = await fetchImpl(base + path, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(body ? 90000 : 5000) }); }
  catch { throw new AppError('Local Gemma is unavailable or took too long. Start Ollama, check that Gemma 4 is downloaded, and retry. No cloud fallback was used.', 503, 'OLLAMA_UNREACHABLE'); }
  if (!response.ok) throw new AppError('Ollama could not run the local model. Check the model download, free memory, and Ollama version. No cloud fallback was used.', 502, 'OLLAMA_ERROR');
  try { return await response.json(); } catch { throw new AppError('Ollama returned an unreadable response.', 502, 'OLLAMA_RESPONSE_INVALID'); }
}
export async function checkLocalModel(config, fetchImpl = fetch) {
  if (!models.includes(config.model)) throw new AppError('Offline mode requires a supported local Gemma 4 tag, such as gemma4:e2b. Cloud tags and other model families are disabled.', 503, 'MODEL_NOT_ALLOWED');
  const tags = await localRequest('/api/tags', null, fetchImpl);
  const model = tags.models?.find(m => m.name === config.model || m.model === config.model);
  if (!model) throw new AppError(`Download the local model first: ollama pull ${config.model}. This requires internet once; inference can then run offline.`, 503, 'LOCAL_MODEL_MISSING');
  if (model.details?.family !== 'gemma4' && !model.details?.families?.includes('gemma4')) throw new AppError('Ollama did not identify this model as Gemma 4. Other model families are disabled.', 503, 'MODEL_UNVERIFIED');
  return { model: config.model, available: true, provider: 'ollama', offline: true, digest: model.digest };
}
export async function localGeneration(config, prompt, fetchImpl = fetch) {
  const data = await localRequest('/api/chat', { model: config.model, stream: false, think: false, messages: [{ role: 'user', content: prompt }], format: feedbackSchema, options: { temperature: 0.1, num_ctx: 16384, num_predict: 4096 } }, fetchImpl);
  if (data.model !== config.model || !data.done || data.done_reason !== 'stop' || typeof data.message?.content !== 'string') throw new AppError('Local Gemma did not finish a matching, usable response. Shorten the code or solution and retry.', 502, 'MODEL_RESPONSE_INCOMPLETE');
  return { modelVersion: data.model, candidates: [{ finishReason: 'STOP', content: { parts: [{ text: data.message.content }] } }] };
}
