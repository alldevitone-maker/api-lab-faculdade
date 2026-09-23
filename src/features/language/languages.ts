// Opções de idioma da interface. Só pt-BR está publicado neste momento.
// O texto do aviso fica no idioma escolhido para o visitante entender o estado da opção.
export const LANGUAGES = [
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷', available: true, notice: '' },
  { code: 'en', name: 'English', flag: '🇬🇧', available: false, notice: 'Language under development. Returning to Portuguese.' },
  { code: 'es', name: 'Español', flag: '🇪🇸', available: false, notice: 'Idioma en desarrollo. Volviendo al portugués.' },
  { code: 'zh-Hans', name: '简体中文', flag: '🇨🇳', available: false, notice: '语言正在开发中。正在返回葡萄牙语。' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', available: false, notice: '言語は開発中です。ポルトガル語に戻ります。' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', available: false, notice: 'Язык в разработке. Возвращаемся к португальскому.' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', available: false, notice: 'Sprache in Entwicklung. Zurück zu Portugiesisch.' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', available: false, notice: 'Langue en cours de développement. Retour au portugais.' }
] as const;
