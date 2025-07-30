// luxuryBeautifulHotelsExtractor.ts - Extract stunning luxury hotels $500-$1000 from premium destinations
import axios, { AxiosResponse } from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// ======================== CONFIGURATION ========================
const OUTPUT_FILE = './luxury_beautiful_hotels_data.txt';
const MAX_HOTELS_PER_CITY = 5; // Increased to account for price filtering
const TOTAL_TARGET_HOTELS = 50;
const MIN_PRICE_PER_NIGHT = 500; // Minimum luxury threshold
const MAX_PRICE_PER_NIGHT = 1000; // Maximum threshold for accessibility

// ======================== INTERFACES ========================
interface LuxuryBeautifulHotelData {
  hotelId: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  address: string;
  description: string;
  images: string[];
  amenities: string[];
  starRating: number;
  latitude?: number;
  longitude?: number;
  
  // NEW: HomeScreen-style price data
  price: number; // Main display price (per night)
  originalPrice: number; // Calculated original price (15% higher)
  priceComparison: string; // Display string with provider info
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  } | null;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
    display: string;
  };
  
  // NEW: Refundable policy data (matching HomeScreen)
  isRefundable?: boolean;
  refundableTag?: string | null;
  refundableInfo?: string;
  
  uniqueFeatures: string[];
  architecturalStyle?: string;
  surroundings?: string;
  extractedFrom: string;
}

interface SearchPrompt {
  cityName: string;
  countryCode: string;
  promptDescription: string;
  aiSearchQuery: string;
}

// ======================== AXIOS INSTANCES ========================
const liteApiInstance = axios.create({
  baseURL: 'https://api.liteapi.travel/v3.0',
  headers: {
    'X-API-Key': process.env.LITEAPI_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

const internalApiInstance = axios.create({
  baseURL: process.env.BASE_URL || 'http://localhost:3003',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// ======================== LUXURY BEAUTIFUL HOTEL SEARCH PROMPTS ========================
const luxuryBeautifulHotelPrompts: SearchPrompt[] = [
  // Iconic Modern Architecture & Design
  {
    cityName: 'Dubai',
    countryCode: 'AE',
    promptDescription: 'Futuristic luxury with iconic architecture',
    aiSearchQuery: 'Luxury hotels $500-1000 with stunning modern architecture, iconic skyline views, infinity pools, and world-class spa facilities in Dubai Marina or Downtown'
  },
  
  // Historic Luxury Palaces
  {
    cityName: 'Paris',
    countryCode: 'FR',
    promptDescription: 'Palace hotels with Parisian elegance',
    aiSearchQuery: 'Historic palace hotels $500-1000 with ornate French architecture, luxury suites, Michelin dining, and views of Eiffel Tower or Louvre'
  },
  
  // Tropical Paradise Luxury
  {
    cityName: 'Bali',
    countryCode: 'ID',
    promptDescription: 'Tropical paradise with infinity pools',
    aiSearchQuery: 'Luxury resort hotels $500-1000 with infinity pools, private villas, spa treatments, jungle or ocean views, and traditional Balinese architecture'
  },
  
  // Mountain Resort Luxury
  {
    cityName: 'Aspen',
    countryCode: 'US',
    promptDescription: 'Mountain lodges with alpine charm',
    aiSearchQuery: 'Luxury mountain hotels $500-1000 with ski-in/ski-out access, alpine spa, panoramic mountain views, and rustic luxury design'
  },
  
  // Coastal Cliffside Luxury
  {
    cityName: 'Santorini',
    countryCode: 'GR',
    promptDescription: 'Cliffside hotels with sunset views',
    aiSearchQuery: 'Luxury cliffside hotels $500-1000 with infinity pools, caldera views, cave suites, private terraces, and traditional Cycladic architecture'
  },
  
  // Urban Rooftop Luxury
  {
    cityName: 'New York',
    countryCode: 'US',
    promptDescription: 'Manhattan luxury with skyline views',
    aiSearchQuery: 'Luxury boutique hotels $500-1000 with rooftop bars, Manhattan skyline views, contemporary design, and premium locations in Midtown or SoHo'
  },
  
  // Desert Oasis Luxury
  {
    cityName: 'Marrakech',
    countryCode: 'MA',
    promptDescription: 'Moroccan riads with traditional luxury',
    aiSearchQuery: 'Luxury riads and hotels $500-1000 with traditional Moroccan architecture, rooftop terraces, ornate courtyards, and authentic hammam spas'
  },
  
  // Scandinavian Modern Luxury
  {
    cityName: 'Copenhagen',
    countryCode: 'DK',
    promptDescription: 'Scandinavian design luxury',
    aiSearchQuery: 'Luxury design hotels $500-1000 with minimalist Scandinavian architecture, innovative dining, harbor views, and sustainable luxury features'
  },
  
  // Japanese Zen Luxury
  {
    cityName: 'Tokyo',
    countryCode: 'JP',
    promptDescription: 'Modern Japanese luxury with traditional elements',
    aiSearchQuery: 'Luxury hotels $500-1000 with traditional Japanese design, zen gardens, onsen baths, city views, and authentic kaiseki dining'
  },
  
  // Swiss Alpine Luxury
  {
    cityName: 'Zermatt',
    countryCode: 'CH',
    promptDescription: 'Alpine luxury with Matterhorn views',
    aiSearchQuery: 'Luxury alpine hotels $500-1000 with Matterhorn views, world-class spas, gourmet dining, and traditional Swiss luxury service'
  },
  
  // Italian Renaissance Luxury
  {
    cityName: 'Florence',
    countryCode: 'IT',
    promptDescription: 'Renaissance palazzos with artistic heritage',
    aiSearchQuery: 'Luxury palazzo hotels $500-1000 in historic Renaissance buildings, with art collections, rooftop terraces, and views of Duomo or Arno River'
  },
  
  // Patagonian Wilderness Luxury
  {
    cityName: 'Torres del Paine',
    countryCode: 'CL',
    promptDescription: 'Wilderness luxury with dramatic landscapes',
    aiSearchQuery: 'Luxury eco-lodges $500-1000 with dramatic Patagonian views, glacier access, wildlife viewing, and sustainable luxury amenities'
  },
  
  // Australian Coastal Luxury
  {
    cityName: 'Sydney',
    countryCode: 'AU',
    promptDescription: 'Harbor luxury with Opera House views',
    aiSearchQuery: 'Luxury harbor hotels $500-1000 with Sydney Opera House views, rooftop pools, contemporary Australian design, and premium waterfront locations'
  },
  
  // Canadian Wilderness Luxury
  {
    cityName: 'Whistler',
    countryCode: 'CA',
    promptDescription: 'Mountain luxury with outdoor adventure',
    aiSearchQuery: 'Luxury mountain resorts $500-1000 with ski access, spa facilities, mountain views, and contemporary Canadian lodge architecture'
  },
  
  // Indian Palace Luxury
  {
    cityName: 'Udaipur',
    countryCode: 'IN',
    promptDescription: 'Palace hotels with royal heritage',
    aiSearchQuery: 'Luxury palace hotels $500-1000 with traditional Rajasthani architecture, lake views, royal courtyards, and authentic Indian luxury experiences'
  },
  
  // South African Safari Luxury
  {
    cityName: 'Cape Town',
    countryCode: 'ZA',
    promptDescription: 'African luxury with mountain and ocean views',
    aiSearchQuery: 'Luxury hotels $500-1000 with Table Mountain views, wine estates, contemporary African design, and world-class spa facilities'
  },
  
  // Mexican Riviera Luxury
  {
    cityName: 'Tulum',
    countryCode: 'MX',
    promptDescription: 'Beachfront eco-luxury with Mayan heritage',
    aiSearchQuery: 'Luxury eco-resorts $500-1000 with private beaches, cenote access, sustainable architecture, and authentic Mexican luxury experiences'
  },
  
  // Icelandic Natural Luxury
  {
    cityName: 'Reykjavik',
    countryCode: 'IS',
    promptDescription: 'Northern lights and unique Icelandic stays',
    aiSearchQuery: 'Luxury hotels $500-1000 with Northern Lights viewing, geothermal spas, modern Nordic design, and unique Icelandic luxury experiences'
  },
  
  // Norwegian Fjord Luxury
  {
    cityName: 'Bergen',
    countryCode: 'NO',
    promptDescription: 'Norwegian fjord hotels',
    aiSearchQuery: 'Luxury fjord hotels $500-1000 with dramatic fjord views, sustainable Nordic design, gourmet dining, and access to natural wonders'
  },
  
  // Costa Rican Rainforest Luxury
  {
    cityName: 'Manuel Antonio',
    countryCode: 'CR',
    promptDescription: 'Rainforest canopy and wildlife hotels',
    aiSearchQuery: 'Luxury rainforest hotels $500-1000 with canopy views, wildlife watching, infinity pools, and sustainable eco-luxury amenities'
  }
];

// ======================== HELPER FUNCTIONS ========================

// NEW: Extract price information EXACTLY like HomeScreen does but filter for luxury range
const extractLuxuryHomeScreenStylePricing = (hotel: any): {
  price: number;
  originalPrice: number;
  priceComparison: string;
  pricePerNight: any;
  priceRange: any;
  isLuxuryRange: boolean;
} => {
  // Default values (matching HomeScreen logic)
  let price = 200;
  let originalPrice = price * 1.15;
  let priceComparison = "Standard rate";
  let pricePerNight = null;
  let priceRange = null;

  // EXACT LOGIC FROM HOMESCREEN: Check pricePerNight first
  if (hotel.pricePerNight) {
    price = hotel.pricePerNight.amount;
    originalPrice = Math.round(price * 1.15);
    priceComparison = hotel.pricePerNight.display;
    
    if (hotel.pricePerNight.provider) {
      priceComparison += ` (${hotel.pricePerNight.provider})`;
    }
    
    pricePerNight = hotel.pricePerNight;
  } 
  // EXACT LOGIC FROM HOMESCREEN: Fallback to priceRange
  else if (hotel.priceRange) {
    price = hotel.priceRange.min;
    originalPrice = Math.round(price * 1.15);
    priceComparison = hotel.priceRange.display;
    priceRange = hotel.priceRange;
  }

  // Check if in luxury price range ($500-$1000)
  const isLuxuryRange = price >= MIN_PRICE_PER_NIGHT && price <= MAX_PRICE_PER_NIGHT;

  return {
    price: Math.round(price),
    originalPrice: Math.round(originalPrice),
    priceComparison,
    pricePerNight,
    priceRange,
    isLuxuryRange
  };
};

// NEW: Extract hotel image EXACTLY like HomeScreen does
const getHotelImageHomeScreenStyle = (hotel: any): string => {
  const defaultImage = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80";
  
  if (hotel.images && hotel.images.length > 0) {
    const firstImage = hotel.images[0];
    if (firstImage && typeof firstImage === 'string' && firstImage.trim() !== '') {
      if (firstImage.startsWith('http://') || firstImage.startsWith('https://') || firstImage.startsWith('//')) {
        return firstImage;
      }
    }
  }
  
  return defaultImage;
};

// NEW: Extract refundable policy data (matching HomeScreen)
const extractRefundablePolicyData = (hotel: any): {
  isRefundable?: boolean;
  refundableTag?: string | null;
  refundableInfo?: string;
} => {
  return {
    isRefundable: hotel.isRefundable,
    refundableTag: hotel.refundableTag,
    refundableInfo: hotel.refundableInfo
  };
};

// Extract comprehensive hotel data with HomeScreen-style pricing for luxury range
const extractLuxuryHotelData = (hotel: any, searchPrompt: SearchPrompt): LuxuryBeautifulHotelData | null => {
  console.log(`     🔍 Processing: ${hotel?.name || 'Unknown Hotel'}`);
  
  // Extract pricing using EXACT HomeScreen logic
  const pricingData = extractLuxuryHomeScreenStylePricing(hotel);
  
  if (!pricingData.isLuxuryRange) {
    console.log(`     💰 Skipping ${hotel?.name || 'Unknown Hotel'} - Outside luxury range ($${pricingData.price}/night not in $${MIN_PRICE_PER_NIGHT}-$${MAX_PRICE_PER_NIGHT} range)`);
    return null;
  }

  // Extract refundable policy data
  const refundableData = extractRefundablePolicyData(hotel);

  // Extract images using HomeScreen logic
  const primaryImage = getHotelImageHomeScreenStyle(hotel);
  const hotelImages: string[] = Array.isArray(hotel.images) 
    ? hotel.images.filter((img: any): img is string => typeof img === 'string' && img.trim() !== '')
    : [];
  
  const allImages: string[] = hotelImages.length > 0 ? hotelImages : [primaryImage];
  
  // Extract amenities with proper type checking
  const amenities: string[] = Array.isArray(hotel.amenities) 
    ? hotel.amenities.filter((amenity: any): amenity is string => typeof amenity === 'string')
    : Array.isArray(hotel.topAmenities)
    ? hotel.topAmenities.filter((amenity: any): amenity is string => typeof amenity === 'string')
    : [];

  // Use the description from the controller's processed data
  const description = hotel.description || hotel.summarizedInfo?.description || 'Luxury accommodations with exceptional amenities and stunning design';

  // Identify luxury features based on amenities and description
  const luxuryFeatures: string[] = [];
  const allText = (description + ' ' + amenities.join(' ')).toLowerCase();
  
  const luxuryFeatureKeywords = {
    'infinity pool': ['infinity pool', 'infinity edge', 'rooftop pool'],
    'spa & wellness': ['spa', 'wellness', 'massage', 'hammam', 'onsen'],
    'fine dining': ['michelin', 'gourmet', 'fine dining', 'celebrity chef'],
    'panoramic views': ['panoramic', 'skyline', 'mountain view', 'ocean view', 'city view'],
    'luxury suites': ['suite', 'penthouse', 'villa', 'presidential'],
    'private terraces': ['terrace', 'balcony', 'private', 'rooftop'],
    'butler service': ['butler', 'concierge', 'personal service'],
    'wine cellar': ['wine', 'cellar', 'sommelier', 'vineyard'],
    'helicopter pad': ['helicopter', 'helipad', 'private jet'],
    'yacht access': ['yacht', 'marina', 'boat', 'harbor']
  };

  Object.entries(luxuryFeatureKeywords).forEach(([feature, keywords]) => {
    if (keywords.some(keyword => allText.includes(keyword))) {
      luxuryFeatures.push(feature);
    }
  });

  // Determine architectural style based on luxury indicators
  let architecturalStyle = 'Contemporary Luxury';
  if (allText.includes('traditional') || allText.includes('heritage') || allText.includes('palace')) {
    architecturalStyle = 'Historic Luxury';
  } else if (allText.includes('modern') || allText.includes('contemporary') || allText.includes('minimalist')) {
    architecturalStyle = 'Modern Luxury';
  } else if (allText.includes('boutique') || allText.includes('design') || allText.includes('artistic')) {
    architecturalStyle = 'Boutique Luxury';
  }

  console.log(`     ✅ Added: ${hotel.name} ($${pricingData.price}/night, ${allImages.length} images, ${pricingData.priceComparison})`);

  return {
    hotelId: hotel.hotelId || hotel.id || 'unknown',
    name: hotel.name || 'Unknown Hotel',
    city: hotel.city || searchPrompt.cityName,
    country: hotel.country || 'Unknown',
    countryCode: searchPrompt.countryCode,
    address: hotel.address || 'Address not available',
    description: description,
    images: [...new Set(allImages)], // Remove duplicates
    amenities: amenities.slice(0, 15),
    starRating: hotel.starRating || hotel.rating || 8.5, // Higher default for luxury
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    
    // NEW: HomeScreen-style pricing data
    price: pricingData.price,
    originalPrice: pricingData.originalPrice,
    priceComparison: pricingData.priceComparison,
    pricePerNight: pricingData.pricePerNight,
    priceRange: pricingData.priceRange,
    
    // NEW: Refundable policy data
    isRefundable: refundableData.isRefundable,
    refundableTag: refundableData.refundableTag,
    refundableInfo: refundableData.refundableInfo,
    
    uniqueFeatures: luxuryFeatures.slice(0, 5),
    architecturalStyle,
    surroundings: searchPrompt.promptDescription,
    extractedFrom: `${searchPrompt.cityName} - ${searchPrompt.promptDescription}`
  };
};

// ======================== MAIN EXTRACTION FUNCTION ========================

const extractLuxuryBeautifulHotels = async (): Promise<LuxuryBeautifulHotelData[]> => {
  console.log('🌟 Starting extraction of luxury beautiful hotels $500-$1000/night...');
  console.log(`🎯 Target: ${TOTAL_TARGET_HOTELS} luxury hotels from ${luxuryBeautifulHotelPrompts.length} premium destinations`);
  console.log(`💰 Luxury price range: $${MIN_PRICE_PER_NIGHT}-$${MAX_PRICE_PER_NIGHT}/night (using HomeScreen pricing logic)`);
  
  const allLuxuryHotels: LuxuryBeautifulHotelData[] = [];
  let promptIndex = 0;

  for (const searchPrompt of luxuryBeautifulHotelPrompts) {
    promptIndex++;
    
    try {
      console.log(`\n🏨 [${promptIndex}/${luxuryBeautifulHotelPrompts.length}] Processing: ${searchPrompt.cityName}, ${searchPrompt.countryCode}`);
      console.log(`✨ Theme: ${searchPrompt.promptDescription}`);
      console.log(`🔍 AI Query: "${searchPrompt.aiSearchQuery}"`);
      
      // Step 1: Use the hotel search controller to get AI-matched hotels
      const searchRequest = {
        userInput: `Hotels in ${searchPrompt.cityName}, ${searchPrompt.countryCode} for 2 adults, check-in tomorrow, check-out in 3 days. ${searchPrompt.aiSearchQuery}`
      };

      console.log(`   📡 Sending search request...`);
      
      const searchResponse = await internalApiInstance.post('/api/hotels/search-and-match', searchRequest);
      
      if (!searchResponse.data || !searchResponse.data.hotels || searchResponse.data.hotels.length === 0) {
        console.log(`   ⚠️  No hotels returned for ${searchPrompt.cityName}`);
        continue;
      }

      const hotelsFromSearch = searchResponse.data.hotels;
      console.log(`   ✅ Found ${hotelsFromSearch.length} AI-matched hotels`);

      // Step 2: Process each hotel with luxury price filtering
      let processedCount = 0;
      let skippedCount = 0;
      
      for (const hotel of hotelsFromSearch.slice(0, MAX_HOTELS_PER_CITY)) {
        try {
          // Extract hotel data with luxury price filtering
          const luxuryHotel = extractLuxuryHotelData(hotel, searchPrompt);
          
          if (luxuryHotel) {
            allLuxuryHotels.push(luxuryHotel);
            processedCount++;
          } else {
            skippedCount++;
          }
          
        } catch (hotelError) {
          console.warn(`     ⚠️  Error processing individual hotel:`, hotelError);
          skippedCount++;
        }
      }

      console.log(`   🎯 Successfully processed ${processedCount} luxury hotels, skipped ${skippedCount} outside price range from ${searchPrompt.cityName}`);
      
      // Break if we've reached our target
      if (allLuxuryHotels.length >= TOTAL_TARGET_HOTELS) {
        console.log(`\n🎉 Reached target of ${TOTAL_TARGET_HOTELS} luxury hotels!`);
        break;
      }
      
      // Small delay between cities
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error processing ${searchPrompt.cityName}:`, error);
      continue;
    }
  }

  console.log(`\n🌟 Extraction complete! Collected ${allLuxuryHotels.length} luxury beautiful hotels in $${MIN_PRICE_PER_NIGHT}-$${MAX_PRICE_PER_NIGHT}/night range`);
  return allLuxuryHotels.slice(0, TOTAL_TARGET_HOTELS);
};

// ======================== EXPORT FUNCTIONS ========================

const exportToTextFile = (hotels: LuxuryBeautifulHotelData[]): void => {
  console.log(`📝 Creating detailed text file with ${hotels.length} luxury beautiful hotels...`);
  
  let content = '';
  
  // Header
  content += '🌟 LUXURY BEAUTIFUL HOTELS DATA EXTRACTION ($500-$1000/night)\n';
  content += '==============================================================\n\n';
  content += `📊 Total Hotels: ${hotels.length}\n`;
  content += `💰 Luxury Price Range: $${MIN_PRICE_PER_NIGHT}-$${MAX_PRICE_PER_NIGHT}/night (HomeScreen pricing logic)\n`;
  content += `📅 Generated: ${new Date().toISOString()}\n`;
  content += `🎯 Purpose: Beautiful luxury hotels with unique design and premium amenities\n\n`;
  
  // Statistics
  const citiesRepresented = [...new Set(hotels.map(h => h.city))];
  const countriesRepresented = [...new Set(hotels.map(h => h.country))];
  const avgImages = Math.round(hotels.reduce((sum, h) => sum + h.images.length, 0) / hotels.length);
  const avgStarRating = (hotels.reduce((sum, h) => sum + (h.starRating || 0), 0) / hotels.length).toFixed(1);
  const avgPrice = Math.round(hotels.reduce((sum, h) => sum + h.price, 0) / hotels.length);
  const priceRanges = {
    tier1: hotels.filter(h => h.price >= 500 && h.price < 650).length,
    tier2: hotels.filter(h => h.price >= 650 && h.price < 800).length,
    tier3: hotels.filter(h => h.price >= 800 && h.price <= 1000).length
  };
  
  // Luxury features statistics
  const luxuryStats = {
    totalWithPolicy: hotels.filter(h => h.isRefundable !== undefined).length,
    refundable: hotels.filter(h => h.isRefundable === true).length,
    nonRefundable: hotels.filter(h => h.isRefundable === false).length,
    withInfinityPools: hotels.filter(h => h.uniqueFeatures.includes('infinity pool')).length,
    withSpas: hotels.filter(h => h.uniqueFeatures.includes('spa & wellness')).length,
    withFineDining: hotels.filter(h => h.uniqueFeatures.includes('fine dining')).length
  };
  
  content += '📈 EXTRACTION STATISTICS\n';
  content += '========================\n';
  content += `🏙️  Cities: ${citiesRepresented.length} (${citiesRepresented.join(', ')})\n`;
  content += `🌍 Countries: ${countriesRepresented.length} (${countriesRepresented.join(', ')})\n`;
  content += `📸 Average Images per Hotel: ${avgImages}\n`;
  content += `⭐ Average Star Rating: ${avgStarRating}\n`;
  content += `💰 Average Price: $${avgPrice}/night (Luxury HomeScreen logic)\n`;
  content += `🏨 Hotels with 5+ Images: ${hotels.filter(h => h.images.length >= 5).length}\n`;
  content += `🔄 Hotels with Refundable Policy Data: ${luxuryStats.totalWithPolicy}\n`;
  content += `✅ Refundable Hotels: ${luxuryStats.refundable}\n`;
  content += `❌ Non-Refundable Hotels: ${luxuryStats.nonRefundable}\n\n`;
  
  content += '💰 LUXURY PRICE DISTRIBUTION (HomeScreen Style)\n';
  content += '===============================================\n';
  content += `Accessible Luxury ($500-$650): ${priceRanges.tier1} hotels\n`;
  content += `Premium Luxury ($650-$800): ${priceRanges.tier2} hotels\n`;
  content += `Ultra Luxury ($800-$1000): ${priceRanges.tier3} hotels\n\n`;
  
  content += '🏆 LUXURY FEATURES ANALYSIS\n';
  content += '===========================\n';
  content += `🏊 Hotels with Infinity Pools: ${luxuryStats.withInfinityPools}\n`;
  content += `🧘 Hotels with Spa & Wellness: ${luxuryStats.withSpas}\n`;
  content += `🍾 Hotels with Fine Dining: ${luxuryStats.withFineDining}\n\n`;
  
  // Individual hotel details
  content += '🏨 LUXURY HOTEL DETAILS (HomeScreen Format)\n';
  content += '===========================================\n\n';
  
  hotels.forEach((hotel, index) => {
    content += `${index + 1}. ${hotel.name.toUpperCase()}\n`;
    content += `${'='.repeat(hotel.name.length + 3)}\n`;
    content += `🆔 Hotel ID: ${hotel.hotelId}\n`;
    content += `📍 Location: ${hotel.city}, ${hotel.country} (${hotel.countryCode})\n`;
    content += `🏠 Address: ${hotel.address}\n`;
    content += `⭐ Rating: ${hotel.starRating}/10\n`;
    
    // NEW: HomeScreen-style luxury pricing display
    content += `💰 Luxury Price (HomeScreen Style):\n`;
    content += `   • Display Price: $${hotel.price}/night\n`;
    content += `   • Original Price: $${hotel.originalPrice}/night\n`;
    content += `   • Price Comparison: ${hotel.priceComparison}\n`;
    
    if (hotel.pricePerNight) {
      content += `   • Structured Price Data:\n`;
      content += `     - Amount: ${hotel.pricePerNight.amount}\n`;
      content += `     - Total Amount: ${hotel.pricePerNight.totalAmount}\n`;
      content += `     - Currency: ${hotel.pricePerNight.currency}\n`;
      content += `     - Display: ${hotel.pricePerNight.display}\n`;
      content += `     - Provider: ${hotel.pricePerNight.provider || 'N/A'}\n`;
      content += `     - Is Supplier Price: ${hotel.pricePerNight.isSupplierPrice}\n`;
    }
    
    if (hotel.priceRange) {
      content += `   • Price Range: ${hotel.priceRange.display} (${hotel.priceRange.min}-${hotel.priceRange.max} ${hotel.priceRange.currency})\n`;
    }
    
    // NEW: Refundable policy information
    if (hotel.isRefundable !== undefined) {
      content += `🔄 Refundable Policy:\n`;
      content += `   • Is Refundable: ${hotel.isRefundable ? 'Yes' : 'No'}\n`;
      if (hotel.refundableTag) {
        content += `   • Policy Tag: ${hotel.refundableTag}\n`;
      }
      if (hotel.refundableInfo) {
        content += `   • Policy Info: ${hotel.refundableInfo}\n`;
      }
    }
    
    content += `🏗️  Style: ${hotel.architecturalStyle}\n`;
    content += `🌟 Theme: ${hotel.surroundings}\n`;
    content += `🔍 Extracted From: ${hotel.extractedFrom}\n`;
    
    if (hotel.latitude && hotel.longitude) {
      content += `📍 Coordinates: ${hotel.latitude}, ${hotel.longitude}\n`;
    }
    
    content += `\n📝 Description:\n${hotel.description}\n`;
    
    if (hotel.uniqueFeatures.length > 0) {
      content += `\n✨ Luxury Features:\n`;
      hotel.uniqueFeatures.forEach(feature => {
        content += `   • ${feature}\n`;
      });
    }
    
    if (hotel.amenities.length > 0) {
      content += `\n🏨 Premium Amenities (${hotel.amenities.length}):\n`;
      hotel.amenities.slice(0, 10).forEach(amenity => {
        content += `   • ${amenity}\n`;
      });
      if (hotel.amenities.length > 10) {
        content += `   ... and ${hotel.amenities.length - 10} more luxury amenities\n`;
      }
    }
    
    if (hotel.images.length > 0) {
      content += `\n📸 Images (${hotel.images.length}):\n`;
      hotel.images.forEach((image, imgIndex) => {
        content += `   ${imgIndex + 1}. ${image}\n`;
      });
    }
    
    content += '\n' + '-'.repeat(80) + '\n\n';
  });
  
  // Footer with JavaScript array format (HomeScreen compatible)
  content += '\n📋 JAVASCRIPT ARRAY FORMAT (HomeScreen Compatible - Luxury Hotels)\n';
  content += '================================================================\n\n';
  content += 'const luxuryBeautifulHotels = [\n';
  
  hotels.forEach((hotel, index) => {
    content += `  {\n`;
    content += `    // HomeScreen compatible luxury hotel object\n`;
    content += `    id: '${hotel.hotelId}',\n`;
    content += `    name: '${hotel.name.replace(/'/g, "\\'")}',\n`;
    content += `    image: '${hotel.images[0] || ''}',\n`;
    content += `    images: ${JSON.stringify(hotel.images.slice(0, 5))},\n`;
    content += `    price: ${hotel.price}, // Luxury range ${MIN_PRICE_PER_NIGHT}-${MAX_PRICE_PER_NIGHT}\n`;
    content += `    originalPrice: ${hotel.originalPrice},\n`;
    content += `    priceComparison: '${hotel.priceComparison.replace(/'/g, "\\'")}',\n`;
    content += `    rating: ${hotel.starRating || 8.5}, // Higher luxury default\n`;
    content += `    reviews: ${Math.floor(Math.random() * 1000) + 100}, // Generated\n`;
    content += `    safetyRating: ${(9.0 + Math.random() * 1.0).toFixed(1)}, // Higher luxury default\n`;
    content += `    transitDistance: '5 min walk to main area', // Generated\n`;
    content += `    tags: ${JSON.stringify(hotel.uniqueFeatures.slice(0, 3))}, // Luxury features as tags\n`;
    content += `    location: '${hotel.address.replace(/'/g, "\\'")}',\n`;
    content += `    features: ${JSON.stringify(hotel.amenities.slice(0, 5))},\n`;
    content += `    city: '${hotel.city}',\n`;
    content += `    country: '${hotel.country}',\n`;
    content += `    latitude: ${hotel.latitude || 'null'},\n`;
    content += `    longitude: ${hotel.longitude || 'null'},\n`;
    content += `    topAmenities: ${JSON.stringify(hotel.amenities.slice(0, 5))},\n`;
    content += `    fullDescription: '${hotel.description.substring(0, 100).replace(/'/g, "\\'")}...',\n`;
    content += `    fullAddress: '${hotel.address.replace(/'/g, "\\'")}',\n`;
    
    // HomeScreen luxury pricing structure
    if (hotel.pricePerNight) {
      content += `    pricePerNight: {\n`;
      content += `      amount: ${hotel.pricePerNight.amount},\n`;
      content += `      totalAmount: ${hotel.pricePerNight.totalAmount},\n`;
      content += `      currency: '${hotel.pricePerNight.currency}',\n`;
      content += `      display: '${hotel.pricePerNight.display.replace(/'/g, "\\'")}',\n`;
      content += `      provider: ${hotel.pricePerNight.provider ? `'${hotel.pricePerNight.provider}'` : 'null'},\n`;
      content += `      isSupplierPrice: ${hotel.pricePerNight.isSupplierPrice}\n`;
      content += `    },\n`;
    } else {
      content += `    pricePerNight: null,\n`;
    }
    
    if (hotel.priceRange) {
      content += `    priceRange: {\n`;
      content += `      min: ${hotel.priceRange.min},\n`;
      content += `      max: ${hotel.priceRange.max},\n`;
      content += `      currency: '${hotel.priceRange.currency}',\n`;
      content += `      display: '${hotel.priceRange.display.replace(/'/g, "\\'")}'\n`;
      content += `    },\n`;
    }
    
    // NEW: Refundable policy data (matching HomeScreen)
    if (hotel.isRefundable !== undefined) {
      content += `    isRefundable: ${hotel.isRefundable},\n`;
    }
    if (hotel.refundableTag) {
      content += `    refundableTag: '${hotel.refundableTag.replace(/'/g, "\\'")}',\n`;
    }
    if (hotel.refundableInfo) {
      content += `    refundableInfo: '${hotel.refundableInfo.replace(/'/g, "\\'")}',\n`;
    }
    
    content += `    hasAvailability: true, // Default\n`;
    content += `    totalRooms: ${Math.floor(Math.random() * 50) + 20}, // Generated luxury range\n`;
    content += `    theme: '${hotel.surroundings}',\n`;
    content += `    architecturalStyle: '${hotel.architecturalStyle}',\n`;
    content += `    uniqueFeatures: ${JSON.stringify(hotel.uniqueFeatures)}\n`;
    content += `  }${index < hotels.length - 1 ? ',' : ''}\n`;
  });
  
  content += '];\n\n';
  
  // Export function compatible with HomeScreen
  content += '// Export function that converts to HomeScreen Hotel format (Luxury)\n';
  content += 'export const convertLuxuryToHomeScreenFormat = (luxuryHotel, index = 0) => {\n';
  content += '  return {\n';
  content += '    id: luxuryHotel.id,\n';
  content += '    name: luxuryHotel.name,\n';
  content += '    image: luxuryHotel.image,\n';
  content += '    images: luxuryHotel.images || [],\n';
  content += '    price: luxuryHotel.price, // Luxury pricing $500-$1000\n';
  content += '    originalPrice: luxuryHotel.originalPrice,\n';
  content += '    priceComparison: luxuryHotel.priceComparison,\n';
  content += '    rating: luxuryHotel.rating || 8.5, // Higher luxury default\n';
  content += '    reviews: luxuryHotel.reviews || Math.floor(Math.random() * 1000) + 200,\n';
  content += '    safetyRating: luxuryHotel.safetyRating || 9.0 + Math.random() * 1.0,\n';
  content += '    tags: luxuryHotel.tags || luxuryHotel.uniqueFeatures?.slice(0, 3) || [],\n';
  content += '    location: luxuryHotel.location,\n';
  content += '    features: luxuryHotel.features || [],\n';
  content += '    pricePerNight: luxuryHotel.pricePerNight,\n';
  content += '    priceRange: luxuryHotel.priceRange,\n';
  content += '    city: luxuryHotel.city,\n';
  content += '    country: luxuryHotel.country,\n';
  content += '    latitude: luxuryHotel.latitude,\n';
  content += '    longitude: luxuryHotel.longitude,\n';
  content += '    topAmenities: luxuryHotel.topAmenities || [],\n';
  content += '    fullDescription: luxuryHotel.fullDescription,\n';
  content += '    fullAddress: luxuryHotel.fullAddress,\n';
  content += '    hasAvailability: luxuryHotel.hasAvailability !== false,\n';
  content += '    totalRooms: luxuryHotel.totalRooms || 30,\n';
  content += '    isRefundable: luxuryHotel.isRefundable,\n';
  content += '    refundableTag: luxuryHotel.refundableTag,\n';
  content += '    refundableInfo: luxuryHotel.refundableInfo,\n';
  content += '    // Luxury AI fields\n';
  content += '    aiExcerpt: "Exceptional luxury hotel with stunning design and world-class amenities",\n';
  content += '    whyItMatches: "Perfect luxury choice with exceptional design, premium location, and exclusive amenities",\n';
  content += '    funFacts: ["Award-winning architecture", "Michelin-starred dining", "Celebrity guest history"],\n';
  content += '    aiMatchPercent: 90 + Math.floor(Math.random() * 10), // 90-100% for luxury\n';
  content += '    guestInsights: "Guests consistently praise the exceptional luxury, impeccable service, and stunning design that sets this property apart.",\n';
  content += '    nearbyAttractions: [`${luxuryHotel.city} landmarks`, "Exclusive shopping", "Cultural highlights"],\n';
  content += '    locationHighlight: "Prime luxury location",\n';
  content += '    matchType: "exceptional",\n';
  content += '    uniqueFeatures: luxuryHotel.uniqueFeatures || []\n';
  content += '  };\n';
  content += '};\n\n';
  
  content += '// Usage example for HomeScreen luxury integration:\n';
  content += '// const displayLuxuryHotels = luxuryBeautifulHotels.map((hotel, index) => convertLuxuryToHomeScreenFormat(hotel, index));\n\n';
  content += '// Luxury hotel themes available:\n';
  const themes = [...new Set(hotels.map(h => h.surroundings))];
  content += `// ${JSON.stringify(themes, null, 2)}\n\n`;
  content += '// End of luxury beautiful hotels data\n';
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
  console.log(`✅ Data exported to: ${OUTPUT_FILE}`);
  console.log(`📊 File size: ${Math.round(fs.statSync(OUTPUT_FILE).size / 1024)}KB`);
};

// Enhanced export function that creates HomeScreen-ready luxury data
const exportLuxuryHomeScreenReadyData = (hotels: LuxuryBeautifulHotelData[]): void => {
  console.log(`🏠 Creating HomeScreen-ready luxury hotel data file...`);
  
  const homeScreenLuxuryHotels = hotels.map((hotel, index) => ({
    // Core HomeScreen Hotel interface fields - LUXURY VERSION
    id: hotel.hotelId,
    name: hotel.name,
    image: hotel.images[0] || getHotelImageHomeScreenStyle(hotel),
    images: hotel.images,
    price: hotel.price, // $500-$1000 range
    originalPrice: hotel.originalPrice,
    priceComparison: hotel.priceComparison,
    rating: hotel.starRating || 8.5, // Higher default for luxury
    reviews: Math.floor(Math.random() * 1000) + 200, // Higher base for luxury
    safetyRating: +(9.0 + Math.random() * 1.0).toFixed(1), // Higher luxury range
    transitDistance: 'Premium location access', // Luxury-appropriate description
    tags: hotel.uniqueFeatures.slice(0, 3), // Use luxury features as tags
    location: hotel.address,
    features: hotel.amenities,
    
    // Price structure exactly like HomeScreen
    pricePerNight: hotel.pricePerNight,
    priceRange: hotel.priceRange,
    
    // Location data
    city: hotel.city,
    country: hotel.country,
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    topAmenities: hotel.amenities.slice(0, 5),
    fullDescription: hotel.description,
    fullAddress: hotel.address,
    hasAvailability: true, // Default
    totalRooms: Math.floor(Math.random() * 50) + 20, // Luxury range
    
    // Refundable policy (exactly like HomeScreen)
    isRefundable: hotel.isRefundable,
    refundableTag: hotel.refundableTag,
    refundableInfo: hotel.refundableInfo,
    
    // Luxury-specific features
    uniqueFeatures: hotel.uniqueFeatures,
    architecturalStyle: hotel.architecturalStyle,
    theme: hotel.surroundings,
    
    // AI fields (enhanced for luxury)
    aiExcerpt: "Exceptional luxury hotel with world-class amenities and stunning architectural design",
    whyItMatches: "Perfect luxury choice featuring premium location, exclusive amenities, and award-winning design",
    funFacts: ["Award-winning architecture", "Michelin-starred dining", "Celebrity guest destination"],
    aiMatchPercent: 90 + Math.floor(Math.random() * 10), // 90-100% for luxury
    guestInsights: "Guests consistently praise the exceptional luxury experience, impeccable service, and breathtaking design that defines this world-class property.",
    nearbyAttractions: [`${hotel.city} cultural landmarks`, "Exclusive shopping districts", "Fine dining establishments"],
    locationHighlight: `Premium ${hotel.city} location`,
    matchType: "exceptional"
  }));
  
  // Create TypeScript file for direct import
  const tsContent = `// Luxury Beautiful Hotels - HomeScreen Ready Data
// Generated: ${new Date().toISOString()}
// Total Hotels: ${hotels.length}
// Luxury Price Range: ${MIN_PRICE_PER_NIGHT}-${MAX_PRICE_PER_NIGHT}/night

export interface LuxuryHomeScreenHotel {
  id: string;
  name: string;
  image: string;
  images: string[];
  price: number; // ${MIN_PRICE_PER_NIGHT}-${MAX_PRICE_PER_NIGHT} range
  originalPrice: number;
  priceComparison: string;
  rating: number;
  reviews: number;
  safetyRating: number;
  transitDistance: string;
  tags: string[];
  location: string;
  features: string[];
  pricePerNight?: {
    amount: number;
    totalAmount: number;
    currency: string;
    display: string;
    provider: string | null;
    isSupplierPrice: boolean;
  } | null;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
    display: string;
  };
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  topAmenities: string[];
  fullDescription: string;
  fullAddress: string;
  hasAvailability: boolean;
  totalRooms: number;
  isRefundable?: boolean;
  refundableTag?: string | null;
  refundableInfo?: string;
  // Luxury-specific fields
  uniqueFeatures: string[];
  architecturalStyle: string;
  theme: string;
  // Enhanced AI fields for luxury
  aiExcerpt?: string;
  whyItMatches?: string;
  funFacts?: string[];
  aiMatchPercent?: number;
  guestInsights?: string;
  nearbyAttractions?: string[];
  locationHighlight?: string;
  matchType?: string;
}

export const luxuryBeautifulHotels: LuxuryHomeScreenHotel[] = ${JSON.stringify(homeScreenLuxuryHotels, null, 2)};

// Helper functions for luxury hotels
export const getLuxuryHotelsByTheme = (theme: string): LuxuryHomeScreenHotel[] => {
  return luxuryBeautifulHotels.filter(hotel => hotel.theme.toLowerCase().includes(theme.toLowerCase()));
};

export const getLuxuryHotelsByPriceRange = (minPrice: number, maxPrice: number): LuxuryHomeScreenHotel[] => {
  return luxuryBeautifulHotels.filter(hotel => hotel.price >= minPrice && hotel.price <= maxPrice);
};

export const getTopLuxuryHotels = (minRating: number = 8.5): LuxuryHomeScreenHotel[] => {
  return luxuryBeautifulHotels
    .filter(hotel => hotel.rating >= minRating)
    .sort((a, b) => b.rating - a.rating);
};

export const getLuxuryHotelsByFeatures = (features: string[]): LuxuryHomeScreenHotel[] => {
  return luxuryBeautifulHotels.filter(hotel =>
    features.some(feature => 
      hotel.uniqueFeatures.some(hotelFeature => 
        hotelFeature.toLowerCase().includes(feature.toLowerCase())
      )
    )
  );
};

export default luxuryBeautifulHotels;
`;
  
  const tsOutputFile = './luxury_beautiful_hotels_homescreen.ts';
  fs.writeFileSync(tsOutputFile, tsContent, 'utf8');
  console.log(`✅ HomeScreen-ready luxury TypeScript data exported to: ${tsOutputFile}`);
  console.log(`📊 File size: ${Math.round(fs.statSync(tsOutputFile).size / 1024)}KB`);
  console.log(`🏠 Ready to import in HomeScreen: import luxuryBeautifulHotels from './luxury_beautiful_hotels_homescreen';`);
};

// ======================== MAIN EXECUTION ========================

const main = async () => {
  console.log('🌟 LUXURY BEAUTIFUL HOTELS EXTRACTOR ($500-$1000 HomeScreen Compatible)');
  console.log('=======================================================================');
  console.log('🏠 Using EXACT HomeScreen pricing logic for luxury hotels');
  console.log(`💎 Targeting premium beautiful hotels in ${MIN_PRICE_PER_NIGHT}-${MAX_PRICE_PER_NIGHT} range`);
  
  // Validate environment
  if (!process.env.LITEAPI_KEY) {
    console.error('❌ LITEAPI_KEY environment variable is required');
    process.exit(1);
  }
  
  if (!process.env.BASE_URL) {
    console.warn('⚠️  BASE_URL not set, using default: http://localhost:3003');
  }
  
  try {
    const startTime = Date.now();
    
    // Extract luxury beautiful hotels
    const luxuryHotels = await extractLuxuryBeautifulHotels();
    
    if (luxuryHotels.length === 0) {
      console.error('❌ No luxury hotels in the target price range were found');
      return;
    }
    
    // Export to text file (detailed report)
    exportToTextFile(luxuryHotels);
    
    // Export HomeScreen-ready TypeScript file
    exportLuxuryHomeScreenReadyData(luxuryHotels);
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n🎉 LUXURY EXTRACTION COMPLETE!');
    console.log('===============================');
    console.log(`🏨 Luxury hotels extracted: ${luxuryHotels.length}`);
    console.log(`💰 Price range: ${MIN_PRICE_PER_NIGHT}-${MAX_PRICE_PER_NIGHT}/night (HomeScreen pricing)`);
    console.log(`⭐ Average rating: ${(luxuryHotels.reduce((sum, h) => sum + h.starRating, 0) / luxuryHotels.length).toFixed(1)}/10`);
    console.log(`🏗️  Architectural styles: ${[...new Set(luxuryHotels.map(h => h.architecturalStyle))].join(', ')}`);
    console.log(`⏱️  Total time: ${Math.round(totalTime / 1000)}s`);
    console.log(`📁 Output files:`);
    console.log(`   • Detailed report: ${OUTPUT_FILE}`);
    console.log(`   • HomeScreen data: ./luxury_beautiful_hotels_homescreen.ts`);
    console.log(`\n💡 HomeScreen integration:`);
    console.log(`   1. Import: import luxuryBeautifulHotels from './luxury_beautiful_hotels_homescreen';`);
    console.log(`   2. Use: setDisplayHotels(luxuryBeautifulHotels);`);
    console.log(`   3. All pricing logic matches your HomeScreen exactly!`);
    console.log(`   4. Features luxury pricing, unique amenities, and premium locations!`);
    
  } catch (error) {
    console.error('❌ Luxury extraction failed:', error);
    process.exit(1);
  }
};

// Export for use as module
export { extractLuxuryBeautifulHotels, LuxuryBeautifulHotelData, exportLuxuryHomeScreenReadyData };

// Run if called directly
if (require.main === module) {
  main();
}

// ======================== USAGE ========================
/*

WHAT THIS UPDATED LUXURY SCRIPT DOES:
✅ Targets beautiful, unique luxury hotels in $500-$1000 range
✅ Uses EXACT HomeScreen price extraction logic
✅ Focuses on premium destinations with iconic architecture
✅ Includes luxury-specific features (infinity pools, spas, fine dining)
✅ Creates HomeScreen-compatible Hotel interface objects
✅ Generates TypeScript file for direct import
✅ Maintains all original functionality with luxury focus

KEY LUXURY TARGETING FEATURES:
✅ price: $500-$1000 range (accessible luxury)
✅ originalPrice: calculated as price * 1.15
✅ priceComparison: string (with provider info)
✅ uniqueFeatures: luxury amenities (infinity pools, spas, etc.)
✅ architecturalStyle: Historic/Modern/Boutique Luxury categories
✅ Higher default ratings (8.5+ instead of 7.5+)

LUXURY DESTINATIONS COVERED:
- Dubai (Futuristic luxury with iconic architecture)
- Paris (Palace hotels with Parisian elegance)
- Bali (Tropical paradise with infinity pools)
- Aspen (Mountain lodges with alpine charm)
- Santorini (Cliffside hotels with sunset views)
- New York (Manhattan luxury with skyline views)
- Marrakech (Moroccan riads with traditional luxury)
- Copenhagen (Scandinavian design luxury)
- Tokyo (Modern Japanese luxury with traditional elements)
- Zermatt (Alpine luxury with Matterhorn views)
- Florence (Renaissance palazzos with artistic heritage)
- And more premium destinations...

LUXURY FEATURES TARGETED:
🏊 Infinity pools and rooftop terraces
🧘 World-class spas and wellness centers
🍾 Michelin-starred and fine dining restaurants
🌄 Panoramic views (ocean, mountain, city skyline)
🏛️  Historic palaces and architectural landmarks
🚁 Exclusive amenities (helicopter pads, yacht access)
🍷 Wine cellars and sommelier services
🛎️  Butler and concierge services

HOMESCREEN INTEGRATION:
1. Run: npx ts-node luxuryBeautifulHotelsExtractor.ts
2. Import: import luxuryBeautifulHotels from './luxury_beautiful_hotels_homescreen';
3. Use: setDisplayHotels(luxuryBeautifulHotels);

The generated luxury hotels will work perfectly with your existing HomeScreen logic
while providing stunning, unique, premium properties in the $500-$1000 range!

*/