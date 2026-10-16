import { AppError } from './schema.mjs';
export const transcriptionSchema = { type: 'object', properties: { question: { type: 'string' }, attempt: { type: 'string' }, uncertainty: { type: 'string' } }, required: ['question', 'attempt', 'uncertainty'], additionalProperties: false };
export function validateImage(raw) {
  if (!raw || !['physics','mathematics','programming'].includes(raw.subject) || !raw.image || !['image/png','image/jpeg','image/webp'].includes(raw.image.mimeType) || typeof raw.image.data !== 'string') throw new AppError('Choose Physics, Maths or Code and upload a PNG, JPEG or WebP image.');
  const { data, mimeType } = raw.image;
  if (data.length > 2796204 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new AppError('Use a valid image of at most 2 MB.');
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length < 16 || bytes.length > 2097152 || bytes.toString('base64') !== data) throw new AppError('The image data is invalid or exceeds 2 MB.');
  const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
  if (!(mimeType === 'image/png' && png || mimeType === 'image/jpeg' && jpeg || mimeType === 'image/webp' && webp)) throw new AppError('The image file does not match its PNG, JPEG or WebP type.');
  const language = typeof raw.language === 'string' && raw.language.length <= 60 ? raw.language : 'Python';
  return { image: { data, mimeType }, subject: raw.subject, language };
}
export function validateTranscription(raw) {
  if (!raw || typeof raw.question !== 'string' || raw.question.length > 4000 || typeof raw.attempt !== 'string' || raw.attempt.length > 12000 || typeof raw.uncertainty !== 'string' || raw.uncertainty.length > 1200 || (raw.question + raw.attempt).trim().length < 3) throw new AppError('Gemma could not return a valid transcription. Try a clearer crop or type the work yourself.', 502, 'TRANSCRIPTION_INVALID');
  return { question: raw.question, attempt: raw.attempt, uncertainty: raw.uncertainty.trim() || 'Gemma reported no specific ambiguity. This is not proof of accurate transcription; check every line against the image.' };
}
