import { detectLanguage, supportedLanguages } from '../public/i18n.js';

export function requestLanguage(header = '', explicit) {
  if (supportedLanguages.includes(explicit)) return explicit;
  const preferences = String(header).split(',').map((entry, index) => {
    const [language, ...parameters] = entry.trim().split(';');
    const quality = parameters.find(parameter => parameter.trim().startsWith('q='));
    const weight = quality === undefined ? 1 : Number(quality.trim().slice(2));
    return { language, weight, index };
  }).filter(({ weight }) => Number.isFinite(weight) && weight > 0 && weight <= 1)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  return detectLanguage(preferences.map(({ language }) => language));
}
