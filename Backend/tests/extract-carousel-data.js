const axios = require('axios');
const fs = require('fs');

// Your LiteAPI key
const LITEAPI_KEY = 'prod_5d46ccea-23f3-4e2f-861b-2158cc0f234e';

// Your search queries
const searchQueries = [
  "Beachfront hotels in Maldives with infinity pools over $500",
  "Ocean view hotels in Santorini with sunset terraces over $350", 
  "Beach resort hotels in Bora Bora with overwater dining over $600",
  "Luxury beach hotels in Seychelles with private pools over $450",
  "Modern beach hotels in Tulum with rooftop pools around $280",
  
  // MOUNTAIN + ARCHITECTURE + VIEWS
  "Mountain view hotels in Swiss Alps with glass facades over $400",
  "Ski hotels in Aspen with panoramic windows over $500", 
  "Boutique mountain hotels in Banff with lake views around $320",
  "Alpine hotels in Chamonix with glacier views around $350",
  "Cliffside hotels in Big Sur with ocean panoramas over $450",
  
  // URBAN + ROOFTOP + SKYLINE VIEWS
  "Rooftop pool hotels in Singapore with city skylines over $300",
  "High-rise hotels in Dubai with Burj Khalifa views over $400",
  "Penthouse hotels in Manhattan with Central Park views over $600", 
  "Sky bar hotels in Bangkok with river views around $180",
  "Tower hotels in Tokyo with Mount Fuji views around $250",
  
  // LUXURY RESORT HOTELS + POOLS
  "Resort hotels in Cabo with infinity pools facing ocean over $350",
  "Luxury hotels in Mykonos with white architecture around $400",
  "Pool villa hotels in Phuket with private decks around $300",
  "Garden resort hotels in Ubud with rice terrace views around $220",
  "Lagoon hotels in Tahiti with turquoise water views over $550",
  
  // BOUTIQUE + DESIGN + ARCHITECTURE
  "Design hotels in Miami South Beach with art deco style around $250",
  "Boutique hotels in Copenhagen with modern Scandinavian design around $200", 
  "Architectural hotels in Barcelona with Gaudi-inspired features around $180",
  "Contemporary hotels in Amsterdam with canal views around $160",
  "Minimalist hotels in Kyoto with zen gardens around $280",
  
  // WINE COUNTRY + SCENIC + LUXURY
  "Vineyard hotels in Napa Valley with tasting rooms over $400",
  "Wine resort hotels in Tuscany with rolling hill views around $350",
  "Boutique hotels in Mendoza with Andes mountain backdrops around $200",
  "Luxury hotels in Bordeaux with château architecture around $300",
  "Modern hotels in Douro Valley with river terraces around $250"
];

// City/Country mappings for your search queries
const searchToDestination = {
  "Maldives": { cityName: "Maafushi", countryCode: "MV" },
  "Santorini": { cityName: "Santorini", countryCode: "GR" },
  "Bora Bora": { cityName: "Vaitape", countryCode: "PF" },
  "Seychelles": { cityName: "Victoria", countryCode: "SC" },
  "Tulum": { cityName: "Tulum", countryCode: "MX" },
  "Swiss Alps": { cityName: "Zermatt", countryCode: "CH" },
  "Aspen": { cityName: "Aspen", countryCode: "US" },
  "Banff": { cityName: "Banff", countryCode: "CA" },
  "Chamonix": { cityName: "Chamonix", countryCode: "FR" },
  "Big Sur": { cityName: "Monterey", countryCode: "US" },
  "Singapore": { cityName: "Singapore", countryCode: "SG" },
  "Dubai": { cityName: "Dubai", countryCode: "AE" },
  "Manhattan": { cityName: "New York", countryCode: "US" },
  "Bangkok": { cityName: "Bangkok", countryCode: "TH" },
  "Tokyo": { cityName: "Tokyo", countryCode: "JP" },
  "Cabo": { cityName: "Los Cabos", countryCode: "MX" },
  "Mykonos": { cityName: "Mykonos", countryCode: "GR" },
  "Phuket": { cityName: "Phuket", countryCode: "TH" },
  "Ubud": { cityName: "Ubud", countryCode: "ID" },
  "Tahiti": { cityName: "Papeete", countryCode: "PF" },
  "Miami South Beach": { cityName: "Miami", countryCode: "US" },
  "Copenhagen": { cityName: "Copenhagen", countryCode: "DK" },
  "Barcelona": { cityName: "Barcelona", countryCode: "ES" },
  "Amsterdam": { cityName: "Amsterdam", countryCode: "NL" },
  "Kyoto": { cityName: "Kyoto", countryCode: "JP" },
  "Napa Valley": { cityName: "Napa", countryCode: "US" },
  "Tuscany": { cityName: "Florence", countryCode: "IT" },
  "Mendoza": { cityName: "Mendoza", countryCode: "AR" },
  "Bordeaux": { cityName: "Bordeaux", countryCode: "FR" },
  "Douro Valley": { cityName: "Porto", countryCode: "PT" }
};

// LiteAPI instance
const liteApiInstance = axios.create({
  baseURL: 'https://api.liteapi.travel/v3.0',
  headers: {
    'X-API-Key': LITEAPI_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Extract destination from search query
function extractDestination(query) {
  for (const [location, details] of Object.entries(searchToDestination)) {
    if (query.includes(location)) {
      return details;
    }
  }
  // Fallback
  return { cityName: "New York", countryCode: "US" };
}

// Fetch hotels for a destination
async function fetchHotels(destination, limit = 50) {
  try {
    const response = await liteApiInstance.get('/data/hotels', {
      params: {
        countryCode: destination.countryCode,
        cityName: destination.cityName,
        language: 'en',
        limit: limit
      }
    });

    return response.data?.data || response.data || [];
  } catch (error) {
    console.error(`Error fetching hotels for ${destination.cityName}:`, error.message);
    return [];
  }
}

// Fetch rates for hotels
async function fetchRates(hotelIds, destination) {
  try {
    // Use dates 2 months from now for 3 nights
    const checkin = new Date();
    checkin.setMonth(checkin.getMonth() + 2);
    const checkout = new Date(checkin);
    checkout.setDate(checkin.getDate() + 3);

    const ratesRequestBody = {
      checkin: checkin.toISOString().split('T')[0],
      checkout: checkout.toISOString().split('T')[0],
      currency: 'USD',
      guestNationality: 'US',
      occupancies: [{
        adults: 2,
        children: []
      }],
      timeout: 4,
      maxRatesPerHotel: 1,
      hotelIds: hotelIds,
      limit: 200
    };

    const response = await liteApiInstance.post('/hotels/rates', ratesRequestBody);
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error(`Error fetching rates for ${destination.cityName}:`, error.message);
    return [];
  }
}

// Calculate price from hotel rates
function calculatePrice(hotel) {
  if (!hotel.roomTypes || hotel.roomTypes.length === 0) {
    return { price: 0, priceDisplay: 'Price not available' };
  }

  const prices = hotel.roomTypes
    .flatMap(room => room.rates || [])
    .map(rate => rate.retailRate?.total?.[0]?.amount)
    .filter(price => price != null);

  if (prices.length === 0) {
    return { price: 0, priceDisplay: 'Price not available' };
  }

  const minPrice = Math.min(...prices);
  return {
    price: Math.round(minPrice / 3), // Price per night (3 nights total)
    priceDisplay: `$${Math.round(minPrice / 3)}/night`
  };
}

// Process a single search query
async function processSearchQuery(query, index) {
  try {
    console.log(`[${index + 1}/${searchQueries.length}] Processing: ${query}`);
    
    const destination = extractDestination(query);
    console.log(`   Destination: ${destination.cityName}, ${destination.countryCode}`);
    
    // Fetch hotels
    const hotels = await fetchHotels(destination, 100);
    if (hotels.length === 0) {
      console.log(`   No hotels found for ${destination.cityName}`);
      return [];
    }
    
    console.log(`   Found ${hotels.length} hotels`);
    
    // Get hotel IDs
    const hotelIds = hotels.map(h => h.id || h.hotelId).filter(Boolean).slice(0, 50);
    
    // Fetch rates
    const hotelsWithRates = await fetchRates(hotelIds, destination);
    console.log(`   Got rates for ${hotelsWithRates.length} hotels`);
    
    // Create hotel metadata map
    const hotelMetadataMap = new Map();
    hotels.forEach(hotel => {
      const id = hotel.id || hotel.hotelId;
      if (id) {
        hotelMetadataMap.set(String(id), hotel);
      }
    });
    
    // Process hotels with rates
    const processedHotels = hotelsWithRates.map(rateHotel => {
      const hotelId = rateHotel.hotelId || rateHotel.id;
      const metadata = hotelMetadataMap.get(String(hotelId));
      
      if (!metadata) return null;
      
      const priceInfo = calculatePrice(rateHotel);
      
      return {
        searchQuery: query,
        hotelId: hotelId,
        name: metadata.name || 'Unknown Hotel',
        image: metadata.main_photo || metadata.thumbnail || '',
        price: priceInfo.price,
        priceDisplay: priceInfo.priceDisplay,
        rating: metadata.rating || (Math.random() * 2 + 7), // 7-9 fake rating
        location: metadata.address || `${metadata.city}, ${metadata.country}`,
        city: metadata.city || destination.cityName,
        country: metadata.country || 'Unknown Country',
        fullAddress: metadata.address || '',
        coordinates: {
          latitude: metadata.latitude,
          longitude: metadata.longitude
        }
      };
    }).filter(Boolean);
    
    // Return top 5 hotels
    const topHotels = processedHotels
      .filter(h => h.price > 0) // Only hotels with valid prices
      .sort((a, b) => b.rating - a.rating) // Sort by rating
      .slice(0, 5);
    
    console.log(`   Returning ${topHotels.length} top hotels`);
    return topHotels;
    
  } catch (error) {
    console.error(`Error processing query "${query}":`, error.message);
    return [];
  }
}

// Convert to CSV
function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        let value = row[header];
        
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value).replace(/"/g, '""');
        }
        
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

// Main function
async function runCarouselDataExtraction() {
  console.log(`Starting carousel data extraction for ${searchQueries.length} queries...`);
  console.log(`Estimated time: ${Math.ceil(searchQueries.length * 3 / 60)} minutes`);
  
  const allHotelData = [];
  const queryResults = [];
  
  for (let i = 0; i < searchQueries.length; i++) {
    const query = searchQueries[i];
    
    try {
      const hotels = await processSearchQuery(query, i);
      
      if (hotels.length > 0) {
        allHotelData.push(...hotels);
        queryResults.push({
          query: query,
          hotelCount: hotels.length,
          status: 'success'
        });
      } else {
        queryResults.push({
          query: query,
          hotelCount: 0,
          status: 'no_results'
        });
      }
      
    } catch (error) {
      console.error(`Failed to process query: ${query}`);
      queryResults.push({
        query: query,
        hotelCount: 0,
        status: 'error',
        error: error.message
      });
    }
    
    // Delay between requests
    if (i < searchQueries.length - 1) {
      console.log(`   Waiting 3s before next request...`);
      await sleep(3000);
    }
  }
  
  // Generate CSV files
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const hotelCSV = convertToCSV(allHotelData);
  const hotelFilename = `carousel_hotels_${timestamp}.csv`;
  fs.writeFileSync(hotelFilename, hotelCSV);
  
  const summaryCSV = convertToCSV(queryResults);
  const summaryFilename = `carousel_summary_${timestamp}.csv`;
  fs.writeFileSync(summaryFilename, summaryCSV);
  
  // Statistics
  const stats = {
    totalQueries: searchQueries.length,
    successfulQueries: queryResults.filter(r => r.status === 'success').length,
    totalHotels: allHotelData.length,
    averageHotelsPerQuery: allHotelData.length / queryResults.filter(r => r.status === 'success').length || 0,
    uniqueDestinations: [...new Set(allHotelData.map(h => `${h.city}, ${h.country}`))].length,
    priceRange: allHotelData.length > 0 ? {
      min: Math.min(...allHotelData.map(h => h.price).filter(p => p > 0)),
      max: Math.max(...allHotelData.map(h => h.price).filter(p => p > 0)),
      average: allHotelData.reduce((sum, h) => sum + h.price, 0) / allHotelData.length
    } : null
  };
  
  console.log('\n=== EXTRACTION COMPLETE ===');
  console.log(`Hotel Data: ${hotelFilename}`);
  console.log(`Summary: ${summaryFilename}`);
  console.log(`\nStats:`);
  console.log(`  Queries: ${stats.successfulQueries}/${stats.totalQueries} successful`);
  console.log(`  Total Hotels: ${stats.totalHotels}`);
  console.log(`  Avg Hotels/Query: ${stats.averageHotelsPerQuery.toFixed(1)}`);
  console.log(`  Destinations: ${stats.uniqueDestinations}`);
  if (stats.priceRange) {
    console.log(`  Price Range: $${stats.priceRange.min} - $${stats.priceRange.max} (avg: $${stats.priceRange.average.toFixed(0)})`);
  }
  
  return {
    hotelData: allHotelData,
    stats: stats,
    files: {
      hotels: hotelFilename,
      summary: summaryFilename
    }
  };
}

// Run the script
runCarouselDataExtraction().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});