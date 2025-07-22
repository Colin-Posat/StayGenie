// hotelDataExtractor.ts - Extract hotel data for any city/country to CSV
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pLimit from 'p-limit';

// Load environment file from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// ======================== CONFIGURATION ========================
const BATCH_SIZE = 100; // Hotels per batch request
const MAX_HOTELS = 1000; // Maximum hotels to fetch
const MAX_IMAGES_PER_HOTEL = 40; // Maximum images to extract per hotel
const DETAIL_CONCURRENCY = 10; // Concurrent detail requests
const OUTPUT_DIR = './hotel_exports'; // Output directory
const DETAIL_TIMEOUT = 15000; // 15 second timeout for details

// ======================== INTERFACES ========================
interface HotelBasicInfo {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  latitude?: number;
  longitude?: number;
  starRating?: number;
  description?: string;
}

interface HotelDetailedInfo extends HotelBasicInfo {
  images: string[];
  amenities: string[];
  main_photo?: string;
  thumbnail?: string;
}

interface ExportConfig {
  cityName: string;
  countryCode: string;
  includeDetails: boolean;
  outputFormat: 'csv' | 'json';
}

// ======================== AXIOS INSTANCE ========================
const liteApiInstance = axios.create({
  baseURL: 'https://api.liteapi.travel/v3.0',
  headers: {
    'X-API-Key': process.env.LITEAPI_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ======================== CONCURRENCY LIMITER ========================
const detailLimit = pLimit(DETAIL_CONCURRENCY);

// ======================== HELPER FUNCTIONS ========================

// Extract images from hotel data
const extractImages = (hotelData: any): string[] => {
  const images: string[] = [];
  
  // Check for hotelImages array (preferred)
  const hotelImages = hotelData?.hotelImages || hotelData?.data?.hotelImages;
  if (hotelImages && Array.isArray(hotelImages)) {
    const imageUrls = hotelImages
      .slice(0, MAX_IMAGES_PER_HOTEL) // Use configurable max images
      .map((img: any) => img.urlHd || img.url)
      .filter(Boolean);
    images.push(...imageUrls);
  }
  
  // Fallback to other image fields
  if (images.length === 0) {
    if (hotelData?.main_photo) images.push(hotelData.main_photo);
    if (hotelData?.thumbnail && !images.includes(hotelData.thumbnail)) {
      images.push(hotelData.thumbnail);
    }
    if (hotelData?.images && Array.isArray(hotelData.images)) {
      images.push(...hotelData.images.slice(0, Math.min(5, MAX_IMAGES_PER_HOTEL)));
    }
  }
  
  // Ensure we don't exceed the max limit
  return [...new Set(images)].slice(0, MAX_IMAGES_PER_HOTEL);
};

// Extract amenities from hotel data
const extractAmenities = (hotelData: any): string[] => {
  const amenities = hotelData?.amenities || hotelData?.data?.amenities || [];
  if (!Array.isArray(amenities)) return [];
  
  return amenities
    .map((amenity: any) => {
      if (typeof amenity === 'string') return amenity;
      if (amenity?.name) return amenity.name;
      return null;
    })
    .filter(Boolean)
    .slice(0, 20); // Limit to 20 amenities
};

// Create safe filename
const createSafeFilename = (cityName: string, countryCode: string): string => {
  const safeName = `${cityName}_${countryCode}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  return `hotels_${safeName}_${timestamp}`;
};

// Convert to CSV format with SEPARATE IMAGE COLUMNS
const convertToCSV = (hotels: HotelDetailedInfo[]): string => {
  // Find the maximum number of images across all hotels
  const maxImages = Math.max(...hotels.map(hotel => hotel.images.length), 0);
  console.log(`🔧 Creating CSV with ${maxImages} separate image columns`);
  
  // Build headers with separate image columns
  const headers = ['city', 'country', 'address', 'name'];
  
  // Add individual image columns
  for (let i = 1; i <= maxImages; i++) {
    headers.push(`image_${i}`);
  }
  
  console.log(`📋 CSV Headers: ${headers.join(', ')}`);
  
  const csvRows = [headers.join(',')];
  
  hotels.forEach(hotel => {
    const row = [
      `"${hotel.city}"`,
      `"${hotel.country}"`,
      `"${hotel.address.replace(/"/g, '""')}"`,
      `"${hotel.name.replace(/"/g, '""')}"`,
    ];
    
    // Add each image URL as a separate column
    for (let i = 0; i < maxImages; i++) {
      const imageUrl = hotel.images[i] || '';
      row.push(`"${imageUrl}"`);
    }
    
    csvRows.push(row.join(','));
  });
  
  console.log(`✅ Created CSV with ${csvRows.length - 1} hotel rows and ${headers.length} columns`);
  return csvRows.join('\n');
};

// ======================== MAIN FUNCTIONS ========================

// Fetch basic hotel list
const fetchHotelList = async (cityName: string, countryCode: string): Promise<HotelBasicInfo[]> => {
  console.log(`🏨 Fetching hotel list for ${cityName}, ${countryCode}...`);
  
  const allHotels: HotelBasicInfo[] = [];
  let offset = 0;
  
  while (allHotels.length < MAX_HOTELS) {
    try {
      console.log(`📄 Fetching batch ${Math.floor(offset / BATCH_SIZE) + 1} (offset: ${offset})...`);
      
      const response = await liteApiInstance.get('/data/hotels', {
        params: {
          countryCode: countryCode,
          cityName: cityName,
          language: 'en',
          limit: BATCH_SIZE,
          offset: offset
        }
      });
      
      const hotels = response.data?.data || response.data || [];
      
      if (!Array.isArray(hotels) || hotels.length === 0) {
        console.log(`✅ No more hotels found. Total collected: ${allHotels.length}`);
        break;
      }
      
      const processedHotels: HotelBasicInfo[] = hotels.map(hotel => ({
        id: hotel.id || hotel.hotelId || hotel.code || 'unknown',
        name: hotel.name || 'Unknown Hotel',
        city: hotel.city || cityName,
        country: hotel.country || countryCode,
        address: hotel.address || 'Address not available',
        latitude: hotel.location?.latitude || hotel.coordinates?.latitude,
        longitude: hotel.location?.longitude || hotel.coordinates?.longitude,
        starRating: hotel.starRating || hotel.rating,
        description: hotel.description
      }));
      
      allHotels.push(...processedHotels);
      console.log(`📊 Collected ${allHotels.length} hotels so far...`);
      
      offset += BATCH_SIZE;
      
      // If we got fewer hotels than requested, we've reached the end
      if (hotels.length < BATCH_SIZE) {
        console.log(`✅ Reached end of results. Total: ${allHotels.length} hotels`);
        break;
      }
      
      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Error fetching batch at offset ${offset}:`, error);
      break;
    }
  }
  
  return allHotels.slice(0, MAX_HOTELS);
};

// Fetch detailed info for a hotel
const fetchHotelDetails = async (hotelId: string): Promise<any> => {
  try {
    const response = await detailLimit(() =>
      liteApiInstance.get('/data/hotel', {
        params: { hotelId },
        timeout: DETAIL_TIMEOUT
      })
    );
    
    return response.data?.data || response.data;
  } catch (error) {
    console.warn(`⚠️  Failed to get details for hotel ${hotelId}`);
    return null;
  }
};

// Enrich hotels with detailed information
const enrichHotelsWithDetails = async (basicHotels: HotelBasicInfo[]): Promise<HotelDetailedInfo[]> => {
  console.log(`🔍 Fetching detailed information for ${basicHotels.length} hotels...`);
  
  const enrichedHotels: HotelDetailedInfo[] = [];
  const batchSize = 50;
  
  for (let i = 0; i < basicHotels.length; i += batchSize) {
    const batch = basicHotels.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(basicHotels.length / batchSize)} (${batch.length} hotels)...`);
    
    const detailPromises = batch.map(hotel => fetchHotelDetails(hotel.id));
    const details = await Promise.all(detailPromises);
    
    batch.forEach((hotel, index) => {
      const detail = details[index];
      
      const enrichedHotel: HotelDetailedInfo = {
        ...hotel,
        images: detail ? extractImages(detail) : [],
        amenities: detail ? extractAmenities(detail) : [],
        main_photo: detail?.main_photo || detail?.hotelInfo?.main_photo,
        thumbnail: detail?.thumbnail || detail?.hotelInfo?.thumbnail,
        description: detail?.description || detail?.hotelInfo?.description || hotel.description
      };
      
      enrichedHotels.push(enrichedHotel);
    });
    
    console.log(`✅ Processed ${enrichedHotels.length}/${basicHotels.length} hotels`);
    
    // Progress update every 100 hotels
    if (enrichedHotels.length % 100 === 0) {
      const withImages = enrichedHotels.filter(h => h.images.length > 0).length;
      console.log(`📊 Progress: ${enrichedHotels.length} hotels processed, ${withImages} have images`);
    }
  }
  
  // Log max images for CSV structure
  const maxImages = Math.max(...enrichedHotels.map(h => h.images.length), 0);
  console.log(`📸 Maximum images per hotel: ${maxImages} (will create ${maxImages} separate image columns)`);
  
  return enrichedHotels;
};

// Export hotels to file
const exportHotels = async (config: ExportConfig): Promise<void> => {
  const startTime = Date.now();
  
  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    console.log(`🚀 Starting hotel data extraction for ${config.cityName}, ${config.countryCode}`);
    console.log(`📋 Configuration:`, config);
    
    // Step 1: Fetch basic hotel list
    const basicHotels = await fetchHotelList(config.cityName, config.countryCode);
    
    if (basicHotels.length === 0) {
      console.log(`❌ No hotels found for ${config.cityName}, ${config.countryCode}`);
      return;
    }
    
    console.log(`✅ Found ${basicHotels.length} hotels`);
    
    // Step 2: Enrich with details if requested
    let finalHotels: HotelDetailedInfo[];
    
    if (config.includeDetails) {
      finalHotels = await enrichHotelsWithDetails(basicHotels);
    } else {
      // Convert basic hotels to detailed format without fetching details
      finalHotels = basicHotels.map(hotel => ({
        ...hotel,
        images: [],
        amenities: [],
        main_photo: undefined,
        thumbnail: undefined
      }));
    }
    
    // Step 3: Export to file
    const filename = createSafeFilename(config.cityName, config.countryCode);
    
    if (config.outputFormat === 'csv') {
      console.log(`🔧 Converting ${finalHotels.length} hotels to CSV with separate image columns...`);
      const csvContent = convertToCSV(finalHotels);
      const csvPath = path.join(OUTPUT_DIR, `${filename}.csv`);
      fs.writeFileSync(csvPath, csvContent, 'utf8');
      console.log(`💾 CSV exported to: ${csvPath}`);
      
      // Show first few lines to verify format
      const lines = csvContent.split('\n').slice(0, 3);
      console.log(`📋 CSV Preview (first 3 lines):`);
      lines.forEach((line, i) => console.log(`   ${i + 1}: ${line.substring(0, 100)}...`));
    }
    
    // Always create JSON backup
    const jsonPath = path.join(OUTPUT_DIR, `${filename}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(finalHotels, null, 2), 'utf8');
    console.log(`💾 JSON backup exported to: ${jsonPath}`);
    
    // Statistics
    const totalTime = Date.now() - startTime;
    const hotelsWithImages = finalHotels.filter(h => h.images.length > 0).length;
    const hotelsWithAmenities = finalHotels.filter(h => h.amenities.length > 0).length;
    const maxImages = Math.max(...finalHotels.map(h => h.images.length), 0);
    
    console.log('\n🎉 EXPORT COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📍 Location: ${config.cityName}, ${config.countryCode}`);
    console.log(`🏨 Total hotels: ${finalHotels.length}`);
    console.log(`📸 Hotels with images: ${hotelsWithImages} (${Math.round(hotelsWithImages / finalHotels.length * 100)}%)`);
    console.log(`🖼️  Maximum images per hotel: ${maxImages}`);
    console.log(`📋 CSV columns: city, country, address, name, image_1 through image_${maxImages}`);
    console.log(`🏷️  Hotels with amenities: ${hotelsWithAmenities} (${Math.round(hotelsWithAmenities / finalHotels.length * 100)}%)`);
    console.log(`⏱️  Total time: ${Math.round(totalTime / 1000)}s`);
    console.log(`📁 Files created:`);
    if (config.outputFormat === 'csv') {
      console.log(`   - ${filename}.csv (spreadsheet ready with separate image columns)`);
    }
    console.log(`   - ${filename}.json (backup)`);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
};

// ======================== MAIN EXECUTION ========================

const main = async () => {
  // 🔧 CONFIGURE YOUR SEARCH HERE
  const config: ExportConfig = {
    cityName: 'New York',           // Change this to your desired city
    countryCode: 'US',           // Change this to your desired country code (ISO 2-letter)
    includeDetails: true,        // Set to false for faster export without images/amenities
    outputFormat: 'csv'          // 'csv' for spreadsheet, 'json' for JSON
  };
  
  // Validate environment
  if (!process.env.LITEAPI_KEY) {
    console.error('❌ LITEAPI_KEY environment variable is required');
    process.exit(1);
  }
  
  try {
    await exportHotels(config);
  } catch (error) {
    console.error('❌ Failed to export hotels:', error);
    process.exit(1);
  }
};

// Export function for use as module
export { exportHotels, ExportConfig };

// Run if called directly
if (require.main === module) {
  main();
}

// ======================== USAGE EXAMPLES ========================
/*

EXPECTED CSV OUTPUT FORMAT:
city,country,address,name,image_1,image_2,image_3,image_4,image_5,image_6,image_7,image_8,image_9,image_10
"New York","US","790 7th Ave","The Manhattan at Times Square","https://static.cupid.travel/hotels/524489007.jpg","https://static.cupid.travel/hotels/40322069.jpg","https://static.cupid.travel/hotels/524489033.jpg","https://static.cupid.travel/hotels/524489012.jpg","","","","","",""

1. QUICK SETUP:
   - Change cityName and countryCode in the config above
   - Run: npx ts-node hotelDataExtractor.ts

2. PROGRAMMATIC USAGE:
   import { exportHotels } from './hotelDataExtractor';
   
   await exportHotels({
     cityName: 'London',
     countryCode: 'GB',
     includeDetails: true,
     outputFormat: 'csv'
   });

*/