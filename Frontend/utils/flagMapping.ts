// utils/flagMapping.ts - Country code to flag emoji mapping utility

export interface FlagMapping {
  [key: string]: string;
}

// Comprehensive mapping of country codes to flag emojis
export const COUNTRY_FLAG_MAPPING: FlagMapping = {
  // Major countries
  'US': '🇺🇸',
  'USA': '🇺🇸',
  'CA': '🇨🇦',
  'GB': '🇬🇧',
  'AU': '🇦🇺',
  'NZ': '🇳🇿',
  'IE': '🇮🇪',
  'ZA': '🇿🇦',
  
  // European countries
  'FR': '🇫🇷',
  'DE': '🇩🇪',
  'IT': '🇮🇹',
  'ES': '🇪🇸',
  'PT': '🇵🇹',
  'NL': '🇳🇱',
  'BE': '🇧🇪',
  'CH': '🇨🇭',
  'AT': '🇦🇹',
  'SE': '🇸🇪',
  'NO': '🇳🇴',
  'DK': '🇩🇰',
  'FI': '🇫🇮',
  'IS': '🇮🇸',
  'PL': '🇵🇱',
  'CZ': '🇨🇿',
  'SK': '🇸🇰',
  'HU': '🇭🇺',
  'RO': '🇷🇴',
  'BG': '🇧🇬',
  'HR': '🇭🇷',
  'SI': '🇸🇮',
  'EE': '🇪🇪',
  'LV': '🇱🇻',
  'LT': '🇱🇹',
  'LU': '🇱🇺',
  'MT': '🇲🇹',
  'CY': '🇨🇾',
  'GR': '🇬🇷',
  'TR': '🇹🇷',
  'RU': '🇷🇺',
  'UA': '🇺🇦',
  'BY': '🇧🇾',
  'MD': '🇲🇩',
  'RS': '🇷🇸',
  'BA': '🇧🇦',
  'ME': '🇲🇪',
  'MK': '🇲🇰',
  'AL': '🇦🇱',
  'XK': '🇽🇰',
  
  // Asian countries
  'JP': '🇯🇵',
  'KR': '🇰🇷',
  'CN': '🇨🇳',
  'HK': '🇭🇰',
  'TW': '🇹🇼',
  'SG': '🇸🇬',
  'MY': '🇲🇾',
  'TH': '🇹🇭',
  'VN': '🇻🇳',
  'PH': '🇵🇭',
  'ID': '🇮🇩',
  'IN': '🇮🇳',
  'PK': '🇵🇰',
  'BD': '🇧🇩',
  'LK': '🇱🇰',
  'MV': '🇲🇻',
  'NP': '🇳🇵',
  'BT': '🇧🇹',
  'MM': '🇲🇲',
  'KH': '🇰🇭',
  'LA': '🇱🇦',
  'BN': '🇧🇳',
  'MN': '🇲🇳',
  'KZ': '🇰🇿',
  'UZ': '🇺🇿',
  'KG': '🇰🇬',
  'TJ': '🇹🇯',
  'TM': '🇹🇲',
  'AF': '🇦🇫',
  'IR': '🇮🇷',
  'IQ': '🇮🇶',
  'SA': '🇸🇦',
  'AE': '🇦🇪',
  'QA': '🇶🇦',
  'BH': '🇧🇭',
  'KW': '🇰🇼',
  'OM': '🇴🇲',
  'YE': '🇾🇪',
  'JO': '🇯🇴',
  'LB': '🇱🇧',
  'SY': '🇸🇾',
  'IL': '🇮🇱',
  'PS': '🇵🇸',
  'AM': '🇦🇲',
  'AZ': '🇦🇿',
  'GE': '🇬🇪',
  
  // African countries
  'EG': '🇪🇬',
  'LY': '🇱🇾',
  'TN': '🇹🇳',
  'DZ': '🇩🇿',
  'MA': '🇲🇦',
  'SD': '🇸🇩',
  'SS': '🇸🇸',
  'ET': '🇪🇹',
  'ER': '🇪🇷',
  'DJ': '🇩🇯',
  'SO': '🇸🇴',
  'KE': '🇰🇪',
  'UG': '🇺🇬',
  'TZ': '🇹🇿',
  'RW': '🇷🇼',
  'BI': '🇧🇮',
  'CD': '🇨🇩',
  'CG': '🇨🇬',
  'CF': '🇨🇫',
  'TD': '🇹🇩',
  'CM': '🇨🇲',
  'NG': '🇳🇬',
  'NE': '🇳🇪',
  'BF': '🇧🇫',
  'ML': '🇲🇱',
  'SN': '🇸🇳',
  'MR': '🇲🇷',
  'GW': '🇬🇼',
  'GN': '🇬🇳',
  'SL': '🇸🇱',
  'LR': '🇱🇷',
  'CI': '🇨🇮',
  'GH': '🇬🇭',
  'TG': '🇹🇬',
  'BJ': '🇧🇯',
  'GA': '🇬🇦',
  'GQ': '🇬🇶',
  'ST': '🇸🇹',
  'AO': '🇦🇴',
  'ZM': '🇿🇲',
  'ZW': '🇿🇼',
  'BW': '🇧🇼',
  'NA': '🇳🇦',
  'SZ': '🇸🇿',
  'LS': '🇱🇸',
  'MW': '🇲🇼',
  'MZ': '🇲🇿',
  'MG': '🇲🇬',
  'MU': '🇲🇺',
  'SC': '🇸🇨',
  'KM': '🇰🇲',
  
  // North American countries
  'MX': '🇲🇽',
  'GT': '🇬🇹',
  'BZ': '🇧🇿',
  'SV': '🇸🇻',
  'HN': '🇭🇳',
  'NI': '🇳🇮',
  'CR': '🇨🇷',
  'PA': '🇵🇦',
  'CU': '🇨🇺',
  'JM': '🇯🇲',
  'HT': '🇭🇹',
  'DO': '🇩🇴',
  'BS': '🇧🇸',
  'BB': '🇧🇧',
  'TT': '🇹🇹',
  'GD': '🇬🇩',
  'VC': '🇻🇨',
  'LC': '🇱🇨',
  'DM': '🇩🇲',
  'AG': '🇦🇬',
  'KN': '🇰🇳',
  
  // South American countries
  'BR': '🇧🇷',
  'AR': '🇦🇷',
  'CL': '🇨🇱',
  'PE': '🇵🇪',
  'BO': '🇧🇴',
  'PY': '🇵🇾',
  'UY': '🇺🇾',
  'CO': '🇨🇴',
  'VE': '🇻🇪',
  'GY': '🇬🇾',
  'SR': '🇸🇷',
  'EC': '🇪🇨',
  
  // Oceania
  'FJ': '🇫🇯',
  'PG': '🇵🇬',
  'SB': '🇸🇧',
  'VU': '🇻🇺',
  'NC': '🇳🇨',
  'PF': '🇵🇫',
  'WS': '🇼🇸',
  'TO': '🇹🇴',
  'FM': '🇫🇲',
  'MH': '🇲🇭',
  'PW': '🇵🇼',
  'NR': '🇳🇷',
  'KI': '🇰🇮',
  'TV': '🇹🇻',
  
  // Additional territories and special cases
  'PR': '🇵🇷',
  'VI': '🇻🇮',
  'GU': '🇬🇺',
  'AS': '🇦🇸',
  'MP': '🇲🇵',
  'UM': '🇺🇲',
  'BM': '🇧🇲',
  'KY': '🇰🇾',
  'TC': '🇹🇨',
  'VG': '🇻🇬',
  'AI': '🇦🇮',
  'MS': '🇲🇸',
  'FK': '🇫🇰',
  'GS': '🇬🇸',
  'SH': '🇸🇭',
  'IO': '🇮🇴',
  'CC': '🇨🇨',
  'CX': '🇨🇽',
  'NF': '🇳🇫',
  'PN': '🇵🇳',
  'TK': '🇹🇰',
  'NU': '🇳🇺',
  'CK': '🇨🇰',
  'WF': '🇼🇫',
  'BL': '🇧🇱',
  'MF': '🇲🇫',
  'PM': '🇵🇲',
  'YT': '🇾🇹',
  'RE': '🇷🇪',
  'GP': '🇬🇵',
  'MQ': '🇲🇶',
  'GF': '🇬🇫',
  'TF': '🇹🇫',
  'AQ': '🇦🇶',
  'BV': '🇧🇻',
  'HM': '🇭🇲',
  'SJ': '🇸🇯',
  'GL': '🇬🇱',
  'FO': '🇫🇴',
  'AX': '🇦🇽',
  'GI': '🇬🇮',
  'VA': '🇻🇦',
  'SM': '🇸🇲',
  'MC': '🇲🇨',
  'AD': '🇦🇩',
  'LI': '🇱🇮',
  'JE': '🇯🇪',
  'GG': '🇬🇬',
  'IM': '🇮🇲',
  'EH': '🇪🇭'
};

/**
 * Gets the flag emoji for a country code
 * @param countryCode - The 2-letter ISO country code (e.g., 'US', 'FR', 'JP')
 * @param fallback - Optional fallback emoji if country code is not found
 * @returns The flag emoji or the fallback
 */
export const getFlagEmoji = (
  countryCode: string | undefined | null, 
  fallback: string = '🏳️'
): string => {
  if (!countryCode) {
    return fallback;
  }
  
  // Convert to uppercase to handle case variations
  const upperCode = countryCode.toUpperCase().trim();
  
  // Return flag emoji or fallback
  return COUNTRY_FLAG_MAPPING[upperCode] || fallback;
};

/**
 * Checks if a country code has a flag emoji mapping
 * @param countryCode - The 2-letter ISO country code
 * @returns True if the country code has a flag emoji, false otherwise
 */
export const hasFlagEmoji = (countryCode: string): boolean => {
  if (!countryCode) return false;
  return countryCode.toUpperCase().trim() in COUNTRY_FLAG_MAPPING;
};

/**
 * Gets all available flag emojis
 * @returns Array of all available flag emojis
 */
export const getAllFlagEmojis = (): string[] => {
  return Object.values(COUNTRY_FLAG_MAPPING);
};

/**
 * Gets country code to flag emoji pairs
 * @returns Array of objects with country code and flag emoji
 */
export const getCountryFlagPairs = (): Array<{ code: string; flag: string }> => {
  return Object.entries(COUNTRY_FLAG_MAPPING).map(([code, flag]) => ({
    code,
    flag
  }));
};

/**
 * Searches for countries by partial country code match
 * @param searchTerm - The search term to match against country codes
 * @returns Array of matching countries with their codes and flag emojis
 */
export const searchCountryFlags = (searchTerm: string): Array<{ code: string; flag: string }> => {
  if (!searchTerm.trim()) return [];
  
  const term = searchTerm.toUpperCase();
  const results: Array<{ code: string; flag: string }> = [];
  
  for (const [code, flag] of Object.entries(COUNTRY_FLAG_MAPPING)) {
    if (code.includes(term)) {
      results.push({ code, flag });
    }
  }
  
  return results.sort((a, b) => a.code.localeCompare(b.code));
};

/**
 * Formats country display with flag emoji
 * @param countryCode - The country code
 * @param countryName - The full country name (optional)
 * @param showCode - Whether to show the country code alongside the flag
 * @returns Formatted string with flag emoji
 */
export const formatCountryWithFlag = (
  countryCode: string | undefined | null,
  countryName?: string,
  showCode: boolean = false
): string => {
  const flag = getFlagEmoji(countryCode);
  
  if (!countryName && !countryCode) {
    return flag; // Just the default flag
  }
  
  if (showCode && countryCode) {
    return countryName 
      ? `${flag} ${countryName} (${countryCode.toUpperCase()})`
      : `${flag} ${countryCode.toUpperCase()}`;
  }
  
  return countryName 
    ? `${flag} ${countryName}`
    : `${flag} ${countryCode?.toUpperCase() || ''}`;
};

/**
 * Gets a random flag emoji
 * @returns A random flag emoji from the mapping
 */
export const getRandomFlag = (): string => {
  const flags = getAllFlagEmojis();
  return flags[Math.floor(Math.random() * flags.length)];
};

export default {
  getFlagEmoji,
  hasFlagEmoji,
  getAllFlagEmojis,
  getCountryFlagPairs,
  searchCountryFlags,
  formatCountryWithFlag,
  getRandomFlag,
  COUNTRY_FLAG_MAPPING
};