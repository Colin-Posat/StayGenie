// testHotelDetails.ts - Test script to fetch full hotel details JSON
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ======================== CONFIGURATION ========================
const LITEAPI_KEY = process.env.LITEAPI_KEY;
const BASE_URL = 'https://api.liteapi.travel/v3.0';

if (!LITEAPI_KEY) {
  console.error('❌ LITEAPI_KEY is required in your .env file');
  process.exit(1);
}

// ======================== AXIOS INSTANCE ========================
const liteApiInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': LITEAPI_KEY,
    'Content-Type': 'application/json',
    'Connection': 'keep-alive'
  },
  timeout: 15000,
  maxRedirects: 2,
});

// ======================== INTERFACES ========================
interface TestConfig {
  // Test with specific hotel ID
  hotelId?: string;
  
  // Or search for hotels first and pick one
  searchParams?: {
    countryCode: string;
    cityName: string;
    limit?: number;
  };
  
  // Output options
  saveToFile?: boolean;
  includeReviews?: boolean;
}

// ======================== HELPER FUNCTIONS ========================

/**
 * Search for hotels in a city to get hotel IDs
 */
async function searchForHotels(countryCode: string, cityName: string, limit: number = 5) {
  console.log(`🔍 Searching for hotels in ${cityName}, ${countryCode}...`);
  
  try {
    const response = await liteApiInstance.get('/data/hotels', {
      params: {
        countryCode: countryCode,
        cityName: cityName,
        language: 'en',
        limit: limit
      }
    });

    const hotels = response.data?.data || response.data;
    
    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
      throw new Error(`No hotels found in ${cityName}, ${countryCode}`);
    }

    console.log(`✅ Found ${hotels.length} hotels`);
    
    // Display available hotels
    console.log('\n📋 Available Hotels:');
    console.log('='.repeat(80));
    hotels.forEach((hotel: any, index: number) => {
      const hotelId = hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code;
      const name = hotel.name || 'Unknown Hotel';
      const address = hotel.address || 'Address not available';
      const rating = hotel.starRating || hotel.rating || 'N/A';
      
      console.log(`${index + 1}. ID: ${hotelId}`);
      console.log(`   Name: ${name}`);
      console.log(`   Rating: ${rating} stars`);
      console.log(`   Address: ${address}`);
      console.log('');
    });

    return hotels;
  } catch (error) {
    console.error('❌ Failed to search for hotels:', error);
    throw error;
  }
}

/**
 * Fetch complete hotel details using the correct endpoint
 */
async function getHotelDetails(hotelId: string) {
  console.log(`🏨 Fetching detailed information for hotel ID: ${hotelId}...`);
  
  try {
    const response = await liteApiInstance.get('/data/hotel', {
      params: {
        hotelId: hotelId
      }
    });

    if (response.status !== 200) {
      throw new Error(`API returned status ${response.status}`);
    }

    const hotelDetails = response.data;
    console.log(`✅ Successfully fetched details for hotel ${hotelId}`);
    
    return hotelDetails;
  } catch (error) {
    console.error(`❌ Failed to fetch hotel details for ${hotelId}:`, error);
    throw error;
  }
}

/**
 * Fetch hotel rates (optional)
 */
async function getHotelRates(hotelId: string) {
  console.log(`💰 Fetching rates for hotel ID: ${hotelId}...`);
  
  try {
    const checkin = new Date();
    checkin.setDate(checkin.getDate() + 7); // 7 days from now
    const checkout = new Date(checkin);
    checkout.setDate(checkout.getDate() + 2); // 2 night stay

    const ratesRequestBody = {
      checkin: checkin.toISOString().split('T')[0],
      checkout: checkout.toISOString().split('T')[0],
      currency: 'USD',
      guestNationality: 'US',
      occupancies: [
        {
          adults: 2,
          children: []
        }
      ],
      timeout: 10,
      hotelIds: [hotelId]
    };

    const response = await liteApiInstance.post('/hotels/rates', ratesRequestBody);
    
    console.log(`✅ Successfully fetched rates for hotel ${hotelId}`);
    return response.data;
  } catch (error) {
    console.warn(`⚠️  Failed to fetch rates for ${hotelId}:`, error);
    return null;
  }
}

/**
 * Fetch hotel reviews and sentiment (optional)
 */
async function getHotelReviews(hotelId: string) {
  console.log(`💬 Fetching reviews for hotel ID: ${hotelId}...`);
  
  try {
    const response = await liteApiInstance.get('/data/reviews', {
      params: {
        hotelId: hotelId,
        limit: 10,
        timeout: 5,
        getSentiment: true
      }
    });

    console.log(`✅ Successfully fetched reviews for hotel ${hotelId}`);
    return response.data;
  } catch (error) {
    console.warn(`⚠️  Failed to fetch reviews for ${hotelId}:`, error);
    return null;
  }
}

/**
 * Save JSON data to file in current directory
 */
function saveToFile(data: any, filename: string) {
  try {
    const filepath = path.join(__dirname, filename);
    const jsonString = JSON.stringify(data, null, 2);
    
    fs.writeFileSync(filepath, jsonString, 'utf8');
    console.log(`💾 Saved data to: ${filepath}`);
    console.log(`📊 File size: ${(Buffer.byteLength(jsonString, 'utf8') / 1024).toFixed(2)} KB`);
    
    return filepath;
  } catch (error) {
    console.error(`❌ Failed to save file ${filename}:`, error);
    throw error;
  }
}

/**
 * Display summary of hotel details
 */
function displayHotelSummary(hotelDetails: any) {
  console.log('\n🏨 HOTEL DETAILS SUMMARY');
  console.log('='.repeat(80));
  
  const hotel = hotelDetails.data || hotelDetails;
  
  if (hotel.hotelInfo) {
    const info = hotel.hotelInfo;
    console.log(`Name: ${info.name || 'N/A'}`);
    console.log(`Star Rating: ${info.starRating || info.rating || 'N/A'}`);
    console.log(`Address: ${info.address || 'N/A'}`);
    console.log(`City: ${info.city || 'N/A'}`);
    console.log(`Country: ${info.country || 'N/A'}`);
    console.log(`Phone: ${info.phone || 'N/A'}`);
    console.log(`Email: ${info.email || 'N/A'}`);
    
    if (info.coordinates || info.location) {
      const coords = info.coordinates || info.location;
      console.log(`Coordinates: ${coords.latitude}, ${coords.longitude}`);
    }
    
    if (info.amenities && Array.isArray(info.amenities)) {
      console.log(`Amenities: ${info.amenities.length} total`);
      console.log(`Top 5 Amenities: ${info.amenities.slice(0, 5).map((a: any) => a.name || a).join(', ')}`);
    }
    
    if (info.images && Array.isArray(info.images)) {
      console.log(`Images: ${info.images.length} total`);
    }
    
    if (info.description) {
      console.log(`Description: ${info.description.substring(0, 200)}...`);
    }
  }
  
  console.log('='.repeat(80));
}

// ======================== MAIN TEST FUNCTION ========================

async function testHotelDetails(config: TestConfig) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let hotelId = config.hotelId;
  
  try {
    console.log('🚀 Starting Hotel Details Test');
    console.log('='.repeat(80));
    
    // If no hotel ID provided, search for hotels first
    if (!hotelId && config.searchParams) {
      const hotels = await searchForHotels(
        config.searchParams.countryCode,
        config.searchParams.cityName,
        config.searchParams.limit || 5
      );
      
      // Use the first hotel found
      hotelId = hotels[0]?.id || hotels[0]?.hotelId || hotels[0]?.hotel_id || hotels[0]?.code;
      
      if (!hotelId) {
        throw new Error('No valid hotel ID found in search results');
      }
      
      console.log(`🎯 Selected hotel ID: ${hotelId} (${hotels[0]?.name || 'Unknown'})`);
    }
    
    if (!hotelId) {
      throw new Error('No hotel ID provided and no search parameters given');
    }
    
    // Fetch hotel details
    const hotelDetails = await getHotelDetails(hotelId);
    
    // Display summary
    displayHotelSummary(hotelDetails);
    
    const results: any = {
      timestamp: new Date().toISOString(),
      hotelId: hotelId,
      details: hotelDetails
    };
    
    // Fetch reviews if requested
    if (config.includeReviews) {
      console.log('\n💬 Fetching reviews...');
      const reviews = await getHotelReviews(hotelId);
      if (reviews) {
        results.reviews = reviews;
        console.log(`✅ Reviews data included (${JSON.stringify(reviews).length} characters)`);
      }
    }
    
    // Save to file if requested
    if (config.saveToFile) {
      const filename = `hotel_${hotelId}_${timestamp}.json`;
      saveToFile(results, filename);
    }
    
    // Display raw JSON structure info
    console.log('\n📋 JSON STRUCTURE INFO');
    console.log('='.repeat(80));
    console.log(`Total JSON size: ${(JSON.stringify(results).length / 1024).toFixed(2)} KB`);
    console.log(`Main sections:`);
    Object.keys(results).forEach(key => {
      const sectionSize = JSON.stringify(results[key]).length;
      console.log(`  - ${key}: ${(sectionSize / 1024).toFixed(2)} KB`);
    });
    
    console.log('\n✅ Test completed successfully!');
    return results;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// ======================== EXAMPLE USAGE ========================

// Example 1: Test with specific hotel ID
async function testSpecificHotel() {
  console.log('🧪 TEST 1: Specific Hotel ID');
  
  const config: TestConfig = {
    hotelId: 'lp24373', // Example hotel ID - replace with a real one
    saveToFile: true,
    includeReviews: true
  };
  
  try {
    const results = await testHotelDetails(config);
    console.log('\n📄 Full JSON Preview (first 500 characters):');
    console.log(JSON.stringify(results, null, 2).substring(0, 500) + '...');
  } catch (error) {
    console.log('Trying alternative test with hotel search...');
    await testWithSearch();
  }
}

// Example 2: Search for hotels first, then get details
async function testWithSearch() {
  console.log('\n🧪 TEST 2: Search + Details');
  
  const config: TestConfig = {
    searchParams: {
      countryCode: 'US',
      cityName: 'New York',
      limit: 3
    },
    saveToFile: true,
    includeReviews: false
  };
  
  const results = await testHotelDetails(config);
  
  console.log('\n📄 Full JSON Preview (first 1000 characters):');
  console.log(JSON.stringify(results, null, 2).substring(0, 1000) + '...');
}

// ======================== RUN TESTS ========================

async function runAllTests() {
  try {
    console.log('🚀 Hotel Details API Test Suite');
    console.log('='.repeat(80));
    console.log('This script will test the LiteAPI hotel details endpoint');
    console.log('and show you the complete JSON structure available.\n');
    
    // Try specific hotel first, fallback to search
    await testSpecificHotel();
    
  } catch (error) {
    console.error('❌ All tests failed:', error);
    console.log('\n💡 Make sure you have:');
    console.log('1. LITEAPI_KEY in your .env file');
    console.log('2. Internet connection');
    console.log('3. Valid hotel ID or search parameters');
  }
}

// Export functions for use as module
export {
  testHotelDetails,
  getHotelDetails,
  getHotelReviews,
  searchForHotels,
  saveToFile
};

// Run if called directly
if (require.main === module) {
  runAllTests();
}