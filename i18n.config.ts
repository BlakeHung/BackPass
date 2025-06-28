import { getMessages, defaultLocale } from '@/lib/i18n';
import { IntlConfig } from 'next-intl';

export default {
  locale: defaultLocale,
  messages: getMessages,
} satisfies IntlConfig; 