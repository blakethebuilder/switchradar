/**
 * Identifies if a business phone provider is a mobile network
 * or if the number itself falls into South African mobile ranges.
 */
export const isMobileProvider = (provider: string, phone?: string): boolean => {
    const upperProvider = provider.toUpperCase();

    // Explicit Landline GNP providers (Business Landline accounts with Mobile Providers)
    if (upperProvider.includes('VODAGNP') || upperProvider.includes('MTNBSGNP')) return false;

    // 1. Check provider name (MTN, Vodacom, Cell C, etc.)
    const mobileProviders = ['MTN', 'VODACOM', 'CELL C', 'TELKMOBL'];
    if (mobileProviders.some(p => upperProvider.includes(p))) return true;

    // 2. Check South African phone number prefixes
    // Landline (Geographic) numbers start with 01 through 05.
    // Mobile numbers usually start with 06, 07, 08.
    if (phone) {
        const cleaned = phone.replace(/\D/g, '');
        const saNumber = cleaned.startsWith('27') ? cleaned.slice(2) : cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;

        if (saNumber.length >= 2) {
            const prefix = saNumber.substring(0, 1);
            const fullPrefix = saNumber.substring(0, 2);

            // Geographic ranges: 01, 02, 03, 04, 05
            if (['1', '2', '3', '4', '5'].includes(prefix)) return false;

            // Mobile ranges: 06, 07, 08
            if (['6', '7', '8'].includes(prefix)) return true;

            // 087 is often VoIP but treated as "Landline" for business purposes
            if (fullPrefix === '87') return false;
        }
    }

    return false;
};
