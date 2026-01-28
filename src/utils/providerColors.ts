export const PROVIDER_COLORS: Record<string, string> = {
  // Primary Telecom Providers
  'MTN': '#EFCC00',      // Yellow
  'Telkom': '#005FB8',   // Blue
  'Vodacom': '#E60000',  // Red
  'TELKMOBL': '#40E0D0', // Turquoise
  'VOX': '#32CD32',      // Lime Green
  'HEROGNP': '#FF8C00',  // Orange
  'BACKSPACE': '#00008B',// Dark Blue
  'VODAGNP': '#E60000',   // Red (Landline)
  'MTNBSGNP': '#EFCC00',  // Yellow (Landline)

  // Secondary Providers
  'Cell C': '#000000',
  'Rain': '#FF0099',
  'Liquid': '#2D2D8B',
  'Vox': '#EE3A43',
  'Vumatel': '#B71B7C',
  'Frogfoot': '#81C141',
  'Openserve': '#00ADB5',

  // Defaults
  'Unknown': '#94A3B8',
  'Default': '#6366F1'
};

const hashCode = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const intToRGB = (i: number) => {
  const c = (i & 0x00FFFFFF).toString(16).toUpperCase();
  return "00000".substring(0, 6 - c.length) + c;
};

export const getProviderColor = (provider: string): string => {
  const normalized = provider.toUpperCase().trim();

  if (normalized.includes('TELKMOBL')) return PROVIDER_COLORS['TELKMOBL'];
  if (normalized.includes('MTN')) return PROVIDER_COLORS['MTN'];
  if (normalized.includes('TELKOM')) return PROVIDER_COLORS['Telkom'];
  if (normalized.includes('VODACOM')) return PROVIDER_COLORS['Vodacom'];
  if (normalized.includes('VOX')) return PROVIDER_COLORS['VOX'];
  if (normalized.includes('HEROGNP')) return PROVIDER_COLORS['HEROGNP'];
  if (normalized.includes('BACKSPACE')) return PROVIDER_COLORS['BACKSPACE'];
  if (normalized.includes('VODAGNP')) return PROVIDER_COLORS['VODAGNP'];
  if (normalized.includes('MTNBSGNP')) return PROVIDER_COLORS['MTNBSGNP'];
  if (normalized.includes('CELL')) return PROVIDER_COLORS['Cell C'];
  if (normalized.includes('RAIN')) return PROVIDER_COLORS['Rain'];

  // Search keys
  const exactMatch = Object.keys(PROVIDER_COLORS).find(key =>
    normalized.includes(key.toUpperCase())
  );

  if (exactMatch) return PROVIDER_COLORS[exactMatch];

  // Generate stable color for others
  return `#${intToRGB(hashCode(normalized))}`;
};

export const createProviderBadgeStyle = (provider: string) => {
  const color = getProviderColor(provider);
  return {
    backgroundColor: `${color}20`,
    color: color,
    borderColor: color
  };
};