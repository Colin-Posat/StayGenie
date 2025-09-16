// Script to fetch facilities and generate a dictionary mapping facility names to IDs

const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

async function generateFacilitiesDict() {
  try {
    console.log('Fetching facilities from LiteAPI...');
    
    const response = await axios.get('https://api.liteapi.travel/v3.0/data/facilities', {
      headers: {
        'X-API-Key': ''
      }
    });

    const facilities = response.data?.data || [];
    console.log(`Fetched ${facilities.length} facilities`);

    // Create comprehensive mapping dictionary
    const facilitiesDict = {};

    facilities.forEach(facility => {
      const id = facility.facility_id;
      const mainName = facility.facility.toLowerCase().trim();
      
      // Add main facility name (English only)
      facilitiesDict[mainName] = id;
      
      // Skip translations - English only
      
      // Add common variations and synonyms for main facility
      const synonyms = generateSynonyms(mainName);
      synonyms.forEach(synonym => {
        facilitiesDict[synonym] = id;
      });
    });

    // Generate TypeScript/JavaScript object
    const dictContent = `// Auto-generated facilities dictionary
// Generated on: ${new Date().toISOString()}
// Total facilities: ${facilities.length}
// Total mappings: ${Object.keys(facilitiesDict).length}

export const FACILITIES_DICT: { [key: string]: number } = ${JSON.stringify(facilitiesDict, null, 2)};

// Reverse lookup: ID to name
export const FACILITIES_ID_TO_NAME: { [key: number]: string } = {
${facilities.map(f => `  ${f.facility_id}: "${f.facility}"`).join(',\n')}
};`;

    // Create directory if it doesn't exist
    const dir = './src/data';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file
    fs.writeFileSync('./src/data/facilities-dict.ts', dictContent);
    
    console.log(`✅ Generated facilities dictionary with ${Object.keys(facilitiesDict).length} mappings`);
    console.log(`📄 Saved to: ./src/data/facilities-dict.ts`);
    
    // Show sample mappings
    console.log('\nSample mappings:');
    Object.entries(facilitiesDict).slice(0, 10).forEach(([name, id]) => {
      console.log(`  "${name}" -> ${id}`);
    });

    return facilitiesDict;
    
  } catch (error) {
    console.error('Error generating facilities dictionary:', error);
    throw error;
  }
}

// Generate common synonyms and variations
function generateSynonyms(facilityName) {
  const synonyms = [];
  const name = facilityName.toLowerCase();
  
  // Common facility synonyms
  const synonymMap = {
    'swimming pool': ['pool', 'pools', 'swimming', 'swim'],
    'fitness center': ['gym', 'fitness', 'workout', 'exercise'],
    'wi-fi': ['wifi', 'internet', 'wireless internet', 'free wifi'],
    'restaurant': ['dining', 'food', 'eatery'],
    'parking': ['car park', 'garage', 'valet parking'],
    'spa': ['wellness', 'massage', 'spa services'],
    'business center': ['business', 'meeting room', 'conference'],
    'room service': ['in-room dining', 'room dining'],
    'laundry service': ['laundry', 'dry cleaning', 'washing'],
    'air conditioning': ['ac', 'cooling', 'climate control'],
    'elevator': ['lift', 'elevators'],
    'safe': ['safety box', 'security box'],
    'mini bar': ['minibar', 'mini-bar', 'fridge'],
    'balcony': ['terrace', 'patio'],
    'bathtub': ['bath', 'tub', 'bathing'],
    'shower': ['bathroom', 'private bathroom'],
    'pet friendly': ['pets allowed', 'pet', 'dog friendly']
  };
  
  // Check if current facility matches any synonym patterns
  for (const [mainTerm, syns] of Object.entries(synonymMap)) {
    if (name.includes(mainTerm) || syns.some(syn => name.includes(syn))) {
      synonyms.push(...syns);
      synonyms.push(mainTerm);
      break;
    }
  }
  
  // Add plural/singular variations
  if (name.endsWith('s') && name.length > 3) {
    synonyms.push(name.slice(0, -1)); // Remove 's'
  } else if (!name.endsWith('s')) {
    synonyms.push(name + 's'); // Add 's'
  }
  
  // Add hyphenated versions
  if (name.includes(' ')) {
    synonyms.push(name.replace(/\s+/g, '-'));
    synonyms.push(name.replace(/\s+/g, ''));
  }
  
  // Remove duplicates and return
  return [...new Set(synonyms)];
}

// Run the script
if (require.main === module) {
  generateFacilitiesDict()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { generateFacilitiesDict };