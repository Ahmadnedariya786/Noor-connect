import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n-new';

export const useI18n = () => {
    const { t } = useTranslation(undefined, { i18n });
    const locale = i18n.language || 'en';
    
    return {
        t,
        tp: (key: string, count: number, options?: any) => {
            return t(key, { count, ...options });
        },
        
        formatNumber: (num: number) => {
            return new Intl.NumberFormat(locale).format(num);
        },
        
        formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => {
            return new Intl.DateTimeFormat(locale, options).format(date);
        },
    };
};
