import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './locales';

const LANGUAGE_STORAGE_KEY = 'smartshelf-language';
const DEFAULT_LANGUAGE = 'en';

const getInitialLanguage = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? DEFAULT_LANGUAGE;
};

const humanizeMissingKey = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: Object.keys(resources),
    load: 'languageOnly',
    parseMissingKeyHandler: humanizeMissingKey,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
export { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY };
