// utils/countryMapping.ts - Country code to full name mapping utility

export interface CountryMapping {
    [key: string]: string;
  }
  
  // Comprehensive mapping of country codes to full country names
  export const COUNTRY_CODE_MAPPING: CountryMapping = {
    // Major countries
    'US': 'United States',
    'CA': 'Canada',
    'GB': 'United Kingdom',
    'AU': 'Australia',
    'NZ': 'New Zealand',
    'IE': 'Ireland',
    'ZA': 'South Africa',
    
    // European countries
    'FR': 'France',
    'DE': 'Germany',
    'IT': 'Italy',
    'ES': 'Spain',
    'PT': 'Portugal',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'IS': 'Iceland',
    'PL': 'Poland',
    'CZ': 'Czech Republic',
    'SK': 'Slovakia',
    'HU': 'Hungary',
    'RO': 'Romania',
    'BG': 'Bulgaria',
    'HR': 'Croatia',
    'SI': 'Slovenia',
    'EE': 'Estonia',
    'LV': 'Latvia',
    'LT': 'Lithuania',
    'LU': 'Luxembourg',
    'MT': 'Malta',
    'CY': 'Cyprus',
    'GR': 'Greece',
    'TR': 'Turkey',
    'RU': 'Russia',
    'UA': 'Ukraine',
    'BY': 'Belarus',
    'MD': 'Moldova',
    'RS': 'Serbia',
    'BA': 'Bosnia and Herzegovina',
    'ME': 'Montenegro',
    'MK': 'North Macedonia',
    'AL': 'Albania',
    'XK': 'Kosovo',
    
    // Asian countries
    'JP': 'Japan',
    'KR': 'South Korea',
    'CN': 'China',
    'HK': 'Hong Kong',
    'TW': 'Taiwan',
    'SG': 'Singapore',
    'MY': 'Malaysia',
    'TH': 'Thailand',
    'VN': 'Vietnam',
    'PH': 'Philippines',
    'ID': 'Indonesia',
    'IN': 'India',
    'PK': 'Pakistan',
    'BD': 'Bangladesh',
    'LK': 'Sri Lanka',
    'MV': 'Maldives',
    'NP': 'Nepal',
    'BT': 'Bhutan',
    'MM': 'Myanmar',
    'KH': 'Cambodia',
    'LA': 'Laos',
    'BN': 'Brunei',
    'MN': 'Mongolia',
    'KZ': 'Kazakhstan',
    'UZ': 'Uzbekistan',
    'KG': 'Kyrgyzstan',
    'TJ': 'Tajikistan',
    'TM': 'Turkmenistan',
    'AF': 'Afghanistan',
    'IR': 'Iran',
    'IQ': 'Iraq',
    'SA': 'Saudi Arabia',
    'AE': 'United Arab Emirates',
    'QA': 'Qatar',
    'BH': 'Bahrain',
    'KW': 'Kuwait',
    'OM': 'Oman',
    'YE': 'Yemen',
    'JO': 'Jordan',
    'LB': 'Lebanon',
    'SY': 'Syria',
    'IL': 'Israel',
    'PS': 'Palestine',
    'AM': 'Armenia',
    'AZ': 'Azerbaijan',
    'GE': 'Georgia',
    
    // African countries
    'EG': 'Egypt',
    'LY': 'Libya',
    'TN': 'Tunisia',
    'DZ': 'Algeria',
    'MA': 'Morocco',
    'SD': 'Sudan',
    'SS': 'South Sudan',
    'ET': 'Ethiopia',
    'ER': 'Eritrea',
    'DJ': 'Djibouti',
    'SO': 'Somalia',
    'KE': 'Kenya',
    'UG': 'Uganda',
    'TZ': 'Tanzania',
    'RW': 'Rwanda',
    'BI': 'Burundi',
    'CD': 'Democratic Republic of the Congo',
    'CG': 'Republic of the Congo',
    'CF': 'Central African Republic',
    'TD': 'Chad',
    'CM': 'Cameroon',
    'NG': 'Nigeria',
    'NE': 'Niger',
    'BF': 'Burkina Faso',
    'ML': 'Mali',
    'SN': 'Senegal',
    'MR': 'Mauritania',
    'GW': 'Guinea-Bissau',
    'GN': 'Guinea',
    'SL': 'Sierra Leone',
    'LR': 'Liberia',
    'CI': 'Ivory Coast',
    'GH': 'Ghana',
    'TG': 'Togo',
    'BJ': 'Benin',
    'GA': 'Gabon',
    'GQ': 'Equatorial Guinea',
    'ST': 'São Tomé and Príncipe',
    'AO': 'Angola',
    'ZM': 'Zambia',
    'ZW': 'Zimbabwe',
    'BW': 'Botswana',
    'NA': 'Namibia',
    'SZ': 'Eswatini',
    'LS': 'Lesotho',
    'MW': 'Malawi',
    'MZ': 'Mozambique',
    'MG': 'Madagascar',
    'MU': 'Mauritius',
    'SC': 'Seychelles',
    'KM': 'Comoros',
    
    // North American countries
    'MX': 'Mexico',
    'GT': 'Guatemala',
    'BZ': 'Belize',
    'SV': 'El Salvador',
    'HN': 'Honduras',
    'NI': 'Nicaragua',
    'CR': 'Costa Rica',
    'PA': 'Panama',
    'CU': 'Cuba',
    'JM': 'Jamaica',
    'HT': 'Haiti',
    'DO': 'Dominican Republic',
    'BS': 'Bahamas',
    'BB': 'Barbados',
    'TT': 'Trinidad and Tobago',
    'GD': 'Grenada',
    'VC': 'Saint Vincent and the Grenadines',
    'LC': 'Saint Lucia',
    'DM': 'Dominica',
    'AG': 'Antigua and Barbuda',
    'KN': 'Saint Kitts and Nevis',
    
    // South American countries
    'BR': 'Brazil',
    'AR': 'Argentina',
    'CL': 'Chile',
    'PE': 'Peru',
    'BO': 'Bolivia',
    'PY': 'Paraguay',
    'UY': 'Uruguay',
    'CO': 'Colombia',
    'VE': 'Venezuela',
    'GY': 'Guyana',
    'SR': 'Suriname',
    'EC': 'Ecuador',
    
    // Oceania
    'FJ': 'Fiji',
    'PG': 'Papua New Guinea',
    'SB': 'Solomon Islands',
    'VU': 'Vanuatu',
    'NC': 'New Caledonia',
    'PF': 'French Polynesia',
    'WS': 'Samoa',
    'TO': 'Tonga',
    'FM': 'Micronesia',
    'MH': 'Marshall Islands',
    'PW': 'Palau',
    'NR': 'Nauru',
    'KI': 'Kiribati',
    'TV': 'Tuvalu',
    
    // Additional territories and special cases
    'PR': 'Puerto Rico',
    'VI': 'U.S. Virgin Islands',
    'GU': 'Guam',
    'AS': 'American Samoa',
    'MP': 'Northern Mariana Islands',
    'UM': 'U.S. Minor Outlying Islands',
    'BM': 'Bermuda',
    'KY': 'Cayman Islands',
    'TC': 'Turks and Caicos Islands',
    'VG': 'British Virgin Islands',
    'AI': 'Anguilla',
    'MS': 'Montserrat',
    'FK': 'Falkland Islands',
    'GS': 'South Georgia and the South Sandwich Islands',
    'SH': 'Saint Helena',
    'IO': 'British Indian Ocean Territory',
    'CC': 'Cocos Islands',
    'CX': 'Christmas Island',
    'NF': 'Norfolk Island',
    'PN': 'Pitcairn Islands',
    'TK': 'Tokelau',
    'NU': 'Niue',
    'CK': 'Cook Islands',
    'WF': 'Wallis and Futuna',
    'BL': 'Saint Barthélemy',
    'MF': 'Saint Martin',
    'PM': 'Saint Pierre and Miquelon',
    'YT': 'Mayotte',
    'RE': 'Réunion',
    'GP': 'Guadeloupe',
    'MQ': 'Martinique',
    'GF': 'French Guiana',
    'TF': 'French Southern Territories',
    'AQ': 'Antarctica',
    'BV': 'Bouvet Island',
    'HM': 'Heard Island and McDonald Islands',
    'SJ': 'Svalbard and Jan Mayen',
    'GL': 'Greenland',
    'FO': 'Faroe Islands',
    'AX': 'Åland Islands',
    'GI': 'Gibraltar',
    'VA': 'Vatican City',
    'SM': 'San Marino',
    'MC': 'Monaco',
    'AD': 'Andorra',
    'LI': 'Liechtenstein',
    'JE': 'Jersey',
    'GG': 'Guernsey',
    'IM': 'Isle of Man',
    'EH': 'Western Sahara'
  };
  
  /**
   * Converts a country code to its full country name
   * @param countryCode - The 2-letter ISO country code (e.g., 'US', 'FR', 'JP')
   * @param fallback - Optional fallback value if country code is not found
   * @returns The full country name or the fallback value
   */
  export const getCountryName = (
    countryCode: string | undefined | null, 
    fallback?: string
  ): string => {
    if (!countryCode) {
      return fallback || '';
    }
    
    // Convert to uppercase to handle case variations
    const upperCode = countryCode.toUpperCase().trim();
    
    // Return mapped name or fallback to the original code
    return COUNTRY_CODE_MAPPING[upperCode] || fallback || countryCode;
  };
  
  /**
   * Checks if a country code exists in the mapping
   * @param countryCode - The 2-letter ISO country code
   * @returns True if the country code is mapped, false otherwise
   */
  export const isValidCountryCode = (countryCode: string): boolean => {
    if (!countryCode) return false;
    return countryCode.toUpperCase().trim() in COUNTRY_CODE_MAPPING;
  };
  
  /**
   * Gets all available country codes
   * @returns Array of all available 2-letter country codes
   */
  export const getAllCountryCodes = (): string[] => {
    return Object.keys(COUNTRY_CODE_MAPPING).sort();
  };
  
  /**
   * Gets all available country names
   * @returns Array of all available country names
   */
  export const getAllCountryNames = (): string[] => {
    return Object.values(COUNTRY_CODE_MAPPING).sort();
  };
  
  /**
   * Searches for countries by partial name match
   * @param searchTerm - The search term to match against country names
   * @returns Array of matching countries with their codes and names
   */
  export const searchCountries = (searchTerm: string): Array<{ code: string; name: string }> => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    const results: Array<{ code: string; name: string }> = [];
    
    for (const [code, name] of Object.entries(COUNTRY_CODE_MAPPING)) {
      if (name.toLowerCase().includes(term)) {
        results.push({ code, name });
      }
    }
    
    return results.sort((a, b) => a.name.localeCompare(b.name));
  };
  
  /**
   * Formats location display with proper country name
   * @param city - The city name
   * @param countryCode - The country code or full country name
   * @returns Formatted location string "City, Country"
   */
  export const formatLocationDisplay = (
    city: string | undefined | null,
    countryCode: string | undefined | null
  ): string => {
    if (!city && !countryCode) return '';
    
    if (!city) {
      return getCountryName(countryCode) || countryCode || '';
    }
    
    if (!countryCode) {
      return city;
    }
    
    const countryName = getCountryName(countryCode, countryCode);
    return `${city}, ${countryName}`;
  };
  
  export default {
    getCountryName,
    isValidCountryCode,
    getAllCountryCodes,
    getAllCountryNames,
    searchCountries,
    formatLocationDisplay,
    COUNTRY_CODE_MAPPING
  };