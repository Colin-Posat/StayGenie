// hotelAvailabilityController.ts - COMBINED SEARCH + AI RECOMMENDATIONS + IMAGE HANDLING
import { Request, Response } from 'express';
import axios from 'axios';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface ParsedSearchQuery {
  checkin: string;
  checkout: string;
  countryCode: string;
  cityName: string;
  adults: number;
  children: number;
  aiSearch: string;
  minCost?: number | null;  
  maxCost?: number | null; 
}

interface HotelInfo {
  id?: string;
  name?: string;
  address?: string;
  rating?: number;
  starRating?: number;
  description?: string;
  amenities?: string[];
  images?: string[];
  main_photo?: string;
  thumbnail?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface Rate {
  retailRate?: {
    total?: Array<{
      amount: number;
      currency: string;
    }>;
  };
}

interface RoomType {
  rates?: Rate[];
}

interface HotelWithRates {
  hotelId: string;
  roomTypes?: RoomType[];
  hotelInfo?: HotelInfo;
}

interface EnrichedHotel extends HotelWithRates {
  hotelInfo: HotelInfo;
}

interface HotelSummaryForAI {
  index: number;
  hotelId: string;
  name: string;
  location: string;
  description: string;
  pricePerNight: string; 
}

interface AIRecommendation {
  hotelName: string;
  aiMatchPercent: number;
  whyItMatches: string;
  funFacts: string[];
}

// Enhanced createHotelSummaryForAI function with price information
const createHotelSummaryForAI = (hotel: HotelWithRates, index: number, nights: number): HotelSummaryForAI => {
  const hotelInfo = hotel.hotelInfo;
  
  if (!hotelInfo) {
    return {
      index: index + 1,
      hotelId: hotel.hotelId,
      name: hotel.hotelId || 'Unknown Hotel',
      location: 'Location not available',
      description: 'No description available',
      pricePerNight: 'Price not available'
    };
  }

  // Calculate price range using your existing logic
  let priceRange = null;
  if (hotel.roomTypes && hotel.roomTypes.length > 0) {
    const prices = hotel.roomTypes
      .flatMap(room => room.rates || [])
      .map(rate => rate.retailRate?.total?.[0]?.amount)
      .filter(price => price != null);
    
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const currency = hotel.roomTypes[0].rates?.[0]?.retailRate?.total?.[0]?.currency || 'USD';
      priceRange = {
        min: minPrice,
        max: maxPrice,
        currency: currency,
        display: minPrice === maxPrice ? `${minPrice}` : `${minPrice} - ${maxPrice}`
      };
    }
  }

  // Calculate price per night using YOUR exact logic
  let pricePerNightInfo = 'Price not available';
  if (priceRange && nights > 0) {
    const pricePerNight = {
      min: Math.round(priceRange.min / nights),
      max: Math.round(priceRange.max / nights),
      currency: priceRange.currency,
      display: priceRange.min === priceRange.max 
        ? `${Math.round(priceRange.min / nights)}/night`
        : `${Math.round(priceRange.min / nights)} - ${Math.round(priceRange.max / nights)}/night`
    };
    pricePerNightInfo = `${pricePerNight.display}`;
  }

  // Keep description short for AI processing (50 chars max)
  const shortDescription = hotelInfo.description 
    ? hotelInfo.description.substring(0, 50).trim() + '...'
    : 'No description available';

  return {
    index: index + 1,
    hotelId: hotel.hotelId,
    name: hotelInfo.name || 'Unknown Hotel',
    location: hotelInfo.address || 'Location not available',
    description: shortDescription,
    pricePerNight: pricePerNightInfo // NEW: Price information for AI
  };
};


// Helper function to get detailed hotel information including images
const getHotelDetails = async (hotelId: string): Promise<EnrichedHotel | null> => {
  try {
    console.log(`🏨 Fetching detailed info for hotel ID: ${hotelId}`);
    
    const response = await axios.get(`https://api.liteapi.travel/v3.0/hotels/${hotelId}`, {
      headers: {
        'X-API-Key': process.env.LITEAPI_KEY,
      },
      timeout: 10000
    });

    if (response.status !== 200) {
      throw new Error(`LiteAPI hotel details error: ${response.status}`);
    }

    const hotelDetails = response.data?.data;
    console.log(`✅ Got detailed info for hotel ${hotelId}`);
    
    return hotelDetails;
  } catch (error) {
    console.warn(`Failed to get hotel details for ${hotelId}:`, error);
    return null;
  }
};

// Helper function to format hotel images
const formatHotelImages = (hotelInfo: HotelInfo): string[] => {
  const images: string[] = [];
  
  // Priority order: main_photo > thumbnail > images array
  if (hotelInfo?.main_photo) {
    images.push(hotelInfo.main_photo);
  }
  
  if (hotelInfo?.thumbnail && !images.includes(hotelInfo.thumbnail)) {
    images.push(hotelInfo.thumbnail);
  }
  
  if (hotelInfo?.images && Array.isArray(hotelInfo.images)) {
    hotelInfo.images.forEach((img: string): void => {
      if (img && !images.includes(img)) {
        images.push(img);
      }
    });
  }
  
  return images;
};

// 🚀 NEW: Combined endpoint that does EVERYTHING in one place with enhanced image handling
export const smartHotelSearch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userInput } = req.body;
  
      if (!userInput) {
        res.status(400).json({ error: 'userInput is required' });
        return;
      }
  
      console.log('🚀 Smart Search: Starting combined flow for:', userInput);
  
      // Step 1: Parse user input
      console.log('Step 1: Parsing user input...');
      const parseResponse = await axios.post(
        `${process.env.BASE_URL || 'http://localhost:3003'}/api/query/parse`,
        { userInput },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );
  
      const parsedQuery: ParsedSearchQuery = parseResponse.data;
      console.log('Step 1 ✅: Parsed query:', parsedQuery);
  
      // Step 2: Validate parsed data
      if (!parsedQuery.checkin || !parsedQuery.checkout || !parsedQuery.countryCode || !parsedQuery.cityName) {
        res.status(400).json({ 
          error: 'Incomplete search parameters',
          message: 'Could not extract all required search parameters from your input',
          parsed: parsedQuery
        });
        return;
      }
  
      // Step 3: Get hotel IDs
      console.log('Step 2: Getting hotel IDs for', parsedQuery.cityName, parsedQuery.countryCode);
      const hotelsSearchResponse = await axios.get('https://api.liteapi.travel/v3.0/data/hotels', {
        params: {
          countryCode: parsedQuery.countryCode,
          cityName: parsedQuery.cityName,
          language: 'en',
          limit: 20
        },
        headers: {
          'X-API-Key': process.env.LITEAPI_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
  
      const hotels = hotelsSearchResponse.data?.data || hotelsSearchResponse.data;
      
      if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
        res.status(404).json({
          error: 'No hotels found',
          message: `No hotels found in ${parsedQuery.cityName}, ${parsedQuery.countryCode}`,
          searchParams: parsedQuery
        });
        return;
      }
  
      // Step 4: Get rates
      const hotelIds = hotels.map((hotel: any) => 
        hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code
      ).filter(Boolean);
      
      console.log(`Step 3: Found ${hotelIds.length} hotels, searching rates...`);
  
      const ratesRequestBody = {
        checkin: parsedQuery.checkin,
        checkout: parsedQuery.checkout,
        currency: 'USD',
        guestNationality: 'US',
        hotelIds: hotelIds,
        occupancies: [
          {
            adults: parsedQuery.adults || 2,
            children: parsedQuery.children ? Array(parsedQuery.children).fill(10) : []
          }
        ],
        timeout: 12
      };
  
      const ratesResponse = await axios.post('https://api.liteapi.travel/v3.0/hotels/rates', ratesRequestBody, {
        headers: {
          'X-API-Key': process.env.LITEAPI_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 25000
      });
  
      // Step 5: Combine data and enrich with detailed hotel information
      const hotelsWithRates = ratesResponse.data?.data || ratesResponse.data || [];
      const hotelMetadataMap = new Map<string, any>();
      hotels.forEach((hotel: any) => {
        const id = hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code;
        if (id) {
          hotelMetadataMap.set(id, hotel);
        }
      });

      // Step 6: Enrich hotels with additional data (images, etc.)
      console.log('🔄 Enriching hotel data with detailed information...');
      const enrichedHotels: EnrichedHotel[] = await Promise.all(
        hotelsWithRates.map(async (rateHotel: any): Promise<EnrichedHotel> => {
          try {
            const metadata = hotelMetadataMap.get(rateHotel.hotelId);
            
            // Get detailed hotel info including images
            const hotelDetails: EnrichedHotel | null = await getHotelDetails(rateHotel.hotelId);
            
            return {
              ...rateHotel,
              hotelInfo: {
                ...metadata,
                ...hotelDetails?.hotelInfo,
                // Ensure we have image data with proper priority
                main_photo: hotelDetails?.hotelInfo?.main_photo || metadata?.main_photo,
                thumbnail: hotelDetails?.hotelInfo?.thumbnail || metadata?.thumbnail,
                images: hotelDetails?.hotelInfo?.images || metadata?.images || []
              }
            };
          } catch (error) {
            console.warn(`Failed to enrich hotel ${rateHotel.hotelId}:`, error);
            const metadata = hotelMetadataMap.get(rateHotel.hotelId);
            return {
              ...rateHotel,
              hotelInfo: metadata || {}
            };
          }
        })
      );
  
      console.log(`Step 4 ✅: Found rates for ${enrichedHotels.length} hotels with enriched data`);
  
      if (enrichedHotels.length === 0) {
        res.status(404).json({
          error: 'No available hotels',
          message: 'Hotels found but no availability for your dates',
          searchParams: parsedQuery
        });
        return;
      }
  
      // Step 7: Calculate nights (needed for price per night calculation)
      const nights = Math.ceil((new Date(parsedQuery.checkout).getTime() - new Date(parsedQuery.checkin).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`Step 5: Calculated ${nights} nights for stay`);
  
      // Step 8: Create lightweight summaries for AI
      console.log('Step 6: Creating lightweight summaries for AI...');
      const hotelSummariesForAI: HotelSummaryForAI[] = enrichedHotels.map((hotel, index) => 
        createHotelSummaryForAI(hotel, index, nights)
      );
  
      // Step 9: Get AI recommendations (ALWAYS provide recommendations)
let aiRecommendations: any[] = [];
console.log('Step 7: Getting AI recommendations...');

try {
  const hotelSummaries = hotelSummariesForAI.map((hotel) => {
    return `${hotel.index}. ${hotel.name}
  Location: ${hotel.location}
  Price: ${hotel.pricePerNight}
  Description: ${hotel.description}`;
  }).join('\n\n');

  let priceContext = '';
if (parsedQuery.minCost || parsedQuery.maxCost) {
  const minText = parsedQuery.minCost ? `minimum $${parsedQuery.minCost}/night` : '';
  const maxText = parsedQuery.maxCost ? `maximum $${parsedQuery.maxCost}/night` : '';
  
  if (minText && maxText) {
    priceContext = `\nBUDGET REQUIREMENT: User wants hotels between ${minText} and ${maxText}.`;
  } else if (minText) {
    priceContext = `\nBUDGET REQUIREMENT: User wants hotels with ${minText} or higher.`;
  } else if (maxText) {
    priceContext = `\nBUDGET REQUIREMENT: User wants hotels under ${maxText}.`;
  }
  
  priceContext += `\nIMPORTANT: Prioritize hotels that match the user's budget! Consider price-to-value ratio.`;
}

  const destination = `${parsedQuery.cityName}, ${parsedQuery.countryCode}`;
  
  // Create different prompts based on whether specific preferences were provided
  const hasSpecificPreferences = parsedQuery.aiSearch && parsedQuery.aiSearch.trim() !== '';
  
  const prompt = hasSpecificPreferences 
    ? `Analyze these ${hotelSummariesForAI.length} hotels for: "${parsedQuery.aiSearch}"

Hotels:
${hotelSummaries}${priceContext}

Create ${Math.min(5, hotelSummariesForAI.length)} hotel recommendations with personality!

Return JSON array:
[{"hotelName":"exact name","aiMatchPercent":85,"whyItMatches":"exciting reason why it's perfect","funFacts":["unique detail","cool feature"],"potentialDownsides":["minor drawback if any"]}]

Guidelines:
✨ Use EXACT hotel names from the numbered list
🎯 Match percentages: 75-95% (higher = better fit based on original search criteria)
🎉 "whyItMatches": Write like an enthusiastic friend explaining why this hotel perfectly matches the original search (15-25 words)
🏆 "funFacts": 2-3 genuinely interesting/unique details about the hotel

The "whyItMatches" should always reference back to the original search criteria and explain the connection in an exciting, friend-like way.

Return pure JSON only. Make it sound like recommendations from a travel-obsessed best friend!`
    : `Analyze these ${hotelSummariesForAI.length} hotels in ${destination} and create exciting highlights for each!

Hotels:
${hotelSummaries}${priceContext}

Create ${Math.min(5, hotelSummariesForAI.length)} hotel recommendations with personality!

Return JSON array:
[{"hotelName":"exact name","aiMatchPercent":80,"whyItMatches":"exciting highlight about what makes this hotel special","funFacts":["unique detail","cool feature"]}]

Guidelines:
✨ Use EXACT hotel names from the numbered list
🎯 Match percentages: 70-90% (based on general appeal and quality indicators)
🎉 "whyItMatches": Write like an enthusiastic friend highlighting what makes this hotel awesome (15-25 words)
🏆 "funFacts": 2-3 genuinely interesting/unique details about the hotel

Examples of great "whyItMatches" for general highlights:
- "This place radiates luxury vibes with stunning architecture and world-class service that'll spoil you rotten!"
- "Perfect location puts you in the heart of everything - walk to attractions, restaurants, and nightlife!"
- "Family-friendly paradise with activities for everyone plus parents can actually relax and unwind!"
- "Business travelers love the seamless WiFi, meeting spaces, and proximity to key locations!"
- "Boutique charm meets modern comfort - Instagram-worthy spaces with authentic local character!"

Focus on what makes each hotel special, exciting, and worth choosing. Make it sound like recommendations from a travel-obsessed best friend who knows great hotels!

Return pure JSON only.`;

  // 🚀 OPTIMIZED: Use faster model and reduced tokens
  const startTime = Date.now();
  console.log('⏱️  Calling OpenAI API...');
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // 🚀 Much faster and cheaper than gpt-4
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5, // Lower temperature for faster, more focused responses
    max_tokens: 1000, // Reduced from 2000
  });
  
  const aiTime = Date.now() - startTime;
  console.log(`⏱️  OpenAI API took ${aiTime}ms`);

  const aiResponse = completion.choices[0]?.message?.content || '[]';
  console.log(`📝 Raw AI Response (first 200 chars): ${aiResponse.substring(0, 200)}...`);
  console.log(`📊 AI Response length: ${aiResponse.length} characters`);
  
  // Parse AI response
  try {
    const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
    const rawRecommendations: AIRecommendation[] = JSON.parse(cleanResponse);
    
    console.log(`🎯 AI returned ${rawRecommendations.length} recommendations out of ${hotelSummariesForAI.length} available hotels`);
    
    if (rawRecommendations.length < Math.min(5, hotelSummariesForAI.length)) {
      console.log(`⚠️  WARNING: Expected ${Math.min(5, hotelSummariesForAI.length)} hotels but got ${rawRecommendations.length}`);
    }
    
    // Match AI recommendations with full hotel data
    aiRecommendations = rawRecommendations.map(aiRec => {
      const matchingHotel = enrichedHotels.find(hotel => 
        hotel.hotelInfo && hotel.hotelInfo.name === aiRec.hotelName
      );

      if (!matchingHotel) {
        console.warn(`Warning: Could not find hotel "${aiRec.hotelName}" in original data`);
        return null;
      }

      // Calculate price range
      let priceRange = null;
      if (matchingHotel.roomTypes && matchingHotel.roomTypes.length > 0) {
        const prices = matchingHotel.roomTypes
          .flatMap(room => room.rates || [])
          .map(rate => rate.retailRate?.total?.[0]?.amount)
          .filter(price => price != null);
        
        if (prices.length > 0) {
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const currency = matchingHotel.roomTypes[0].rates?.[0]?.retailRate?.total?.[0]?.currency || 'USD';
          priceRange = {
            min: minPrice,
            max: maxPrice,
            currency: currency,
            display: minPrice === maxPrice ? `$${minPrice}` : `$${minPrice} - $${maxPrice}`
          };
        }
      }

      // Calculate price per night
      let pricePerNight = null;
      if (priceRange && nights > 0) {
        pricePerNight = {
          min: Math.round(priceRange.min / nights),
          max: Math.round(priceRange.max / nights),
          currency: priceRange.currency,
          display: priceRange.min === priceRange.max 
            ? `${Math.round(priceRange.min / nights)}/night`
            : `${Math.round(priceRange.min / nights)} - ${Math.round(priceRange.max / nights)}/night`
        };
      }

      // FIXED: Properly map images from LiteAPI structure
      const images = (() => {
        const images: string[] = [];
        
        // Add main_photo if it exists
        if (matchingHotel.hotelInfo?.main_photo) {
          images.push(matchingHotel.hotelInfo.main_photo);
        }
        
        // Add thumbnail as backup if main_photo doesn't exist
        if (!matchingHotel.hotelInfo?.main_photo && matchingHotel.hotelInfo?.thumbnail) {
          images.push(matchingHotel.hotelInfo.thumbnail);
        }
        
        // Add any other images if they exist in an array
        if (matchingHotel.hotelInfo?.images && Array.isArray(matchingHotel.hotelInfo.images)) {
          images.push(...matchingHotel.hotelInfo.images);
        }
        
        console.log(`🖼️ Backend: Mapped ${images.length} images for ${matchingHotel.hotelInfo?.name}`);
        if (images.length > 0) {
          console.log(`First image: ${images[0]}`);
        } else {
          console.warn(`No images found for ${matchingHotel.hotelInfo?.name}`);
        }
        
        return images;
      })();

      return {
        // Core hotel identification
        hotelId: matchingHotel.hotelId,
        name: matchingHotel.hotelInfo?.name || 'Unknown Hotel',
        
        // Required frontend fields
        aiMatchPercent: aiRec.aiMatchPercent,
        whyItMatches: aiRec.whyItMatches,
        starRating: matchingHotel.hotelInfo?.starRating || matchingHotel.hotelInfo?.rating || 0,
        images: images, // Enhanced image mapping
        pricePerNight: pricePerNight,
        
        // Additional useful data
        funFacts: aiRec.funFacts,
        address: matchingHotel.hotelInfo?.address || 'Address not available',
        amenities: matchingHotel.hotelInfo?.amenities || [],
        description: matchingHotel.hotelInfo?.description || 'No description available',
        coordinates: matchingHotel.hotelInfo?.coordinates || null,
        
        // Booking data
        priceRange: priceRange, // Total stay price
        totalRooms: matchingHotel.roomTypes ? matchingHotel.roomTypes.length : 0,
        hasAvailability: matchingHotel.roomTypes && matchingHotel.roomTypes.length > 0,
        roomTypes: matchingHotel.roomTypes, // Full room data for booking
        
        // Original hotel data for reference
        originalHotelData: matchingHotel
      };
    }).filter(Boolean);

    console.log(`Step 7 ✅: AI selected ${aiRecommendations.length} hotels`);
    
  } catch (parseError) {
    console.error('Failed to parse AI response, continuing without recommendations:', parseError);
  }
  
} catch (aiError) {
  console.error('AI recommendation failed, continuing without recommendations:', aiError);
}
  
      // Step 10: Calculate final response
      // (nights already calculated above)
  
      // Final response
      res.json({
        searchParams: {
          ...parsedQuery,
          nights: nights,
          currency: 'USD'
        },
        totalHotelsFound: hotels.length,
        hotelsWithRates: enrichedHotels.length,
        aiRecommendationsCount: aiRecommendations.length,
        
        // If AI recommendations available, return those first
        ...(aiRecommendations.length > 0 ? {
          recommendations: aiRecommendations,
          allHotels: enrichedHotels, // Fallback data
          aiRecommendationsAvailable: true
        } : {
          hotels: enrichedHotels, // All hotels if no AI
          aiRecommendationsAvailable: false
        }),
        
        generatedAt: new Date().toISOString(),
        searchId: ratesResponse.data?.searchId || null
      });
  
      // Step 11: Log AI recommendations summary
      if (aiRecommendations.length > 0) {
        console.log('\n🤖 AI RECOMMENDATIONS SUMMARY:');
        console.log('='.repeat(50));
        aiRecommendations.forEach((hotel, index) => {
          console.log(`${index + 1}. ${hotel.name}`);
          console.log(`   📊 AI Match: ${hotel.aiMatchPercent}%`);
          console.log(`   ⭐ Star Rating: ${hotel.starRating}/5`);
          console.log(`   💡 Why it matches: ${hotel.whyItMatches}`);
          console.log(`   🎯 Fun facts: ${hotel.funFacts.join(' | ')}`);
          if (hotel.pricePerNight) {
            console.log(`   💰 Price per night: ${hotel.pricePerNight.display}`);
          }
          if (hotel.images && hotel.images.length > 0) {
            console.log(`   🖼️  Images: ${hotel.images.length} available`);
            console.log(`   📸 First image: ${hotel.images[0]}`);
          }
          console.log('');
        });
        console.log('='.repeat(50));
      }
  
      console.log('🚀 Smart Search Complete ✅');
  
    } catch (error) {
      console.error('Error in smart hotel search:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          res.status(error.response.status).json({
            error: 'API error',
            message: error.response.data?.message || error.response.data?.error?.description || 'Unknown API error',
            details: error.response.data,
            step: error.config?.url?.includes('/parse') ? 'parsing' : 
                  error.config?.url?.includes('/data/hotels') ? 'hotel_search' : 'rates_search'
          });
          return;
        }
      }
  
      res.status(500).json({ 
        error: 'Smart search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
  
// Main availability search with two-step process
export const searchHotelAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsedQuery: ParsedSearchQuery = req.body;
  
      // Validate required fields
      if (!parsedQuery.checkin || !parsedQuery.checkout || !parsedQuery.countryCode || !parsedQuery.cityName) {
        res.status(400).json({ 
          error: 'Missing required fields: checkin, checkout, countryCode, and cityName are required' 
        });
        return;
      }
  
      // Validate dates
      const checkinDate = new Date(parsedQuery.checkin);
      const checkoutDate = new Date(parsedQuery.checkout);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      if (checkinDate < today) {
        res.status(400).json({ 
          error: 'Check-in date cannot be in the past' 
        });
        return;
      }
  
      if (checkoutDate <= checkinDate) {
        res.status(400).json({ 
          error: 'Check-out date must be after check-in date' 
        });
        return;
      }
  
      console.log('Step 1: Getting hotel IDs for', parsedQuery.cityName, parsedQuery.countryCode);
  
      // Step 1: Get hotel IDs from the hotels search endpoint
      const hotelsSearchResponse = await axios.get('https://api.liteapi.travel/v3.0/data/hotels', {
        params: {
          countryCode: parsedQuery.countryCode,
          cityName: parsedQuery.cityName,
          language: 'en',
          limit: 20 // Limit to 100 hotels for faster rates search
        },
        headers: {
          'X-API-Key': process.env.LITEAPI_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
  
      const hotels = hotelsSearchResponse.data?.data || hotelsSearchResponse.data;
      
      if (!hotels || !Array.isArray(hotels) || hotels.length === 0) {
        res.status(404).json({
          error: 'No hotels found',
          message: `No hotels found in ${parsedQuery.cityName}, ${parsedQuery.countryCode}`,
          searchParams: {
            countryCode: parsedQuery.countryCode,
            cityName: parsedQuery.cityName
          }
        });
        return;
      }
  
      // Extract hotel IDs - try multiple possible field names
      const hotelIds = hotels.map((hotel: any) => 
        hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code
      ).filter(Boolean);
      
      if (hotelIds.length === 0) {
        res.status(404).json({
          error: 'No valid hotel IDs found',
          message: 'Hotels were found but no valid IDs could be extracted',
          hotelsFound: hotels.length,
          sampleHotel: hotels[0] // Include sample for debugging
        });
        return;
      }
  
      console.log(`Step 2: Found ${hotelIds.length} hotels, searching rates for: ${hotelIds.slice(0, 5).join(', ')}...`);
  
      // Step 2: Search for rates using the hotel IDs
      const ratesRequestBody = {
        checkin: parsedQuery.checkin,
        checkout: parsedQuery.checkout,
        currency: 'USD',
        guestNationality: 'US',
        hotelIds: hotelIds,
        occupancies: [
          {
            adults: parsedQuery.adults || 2,
            children: parsedQuery.children ? Array(parsedQuery.children).fill(10) : []
          }
        ],
        timeout: 12
      };
  
      console.log('Step 3: Searching rates with request:', { 
        ...ratesRequestBody, 
        hotelIds: `Array of ${hotelIds.length} hotels: [${hotelIds.slice(0, 3).join(', ')}...]` 
      });
  
      const ratesResponse = await axios.post('https://api.liteapi.travel/v3.0/hotels/rates', ratesRequestBody, {
        headers: {
          'X-API-Key': process.env.LITEAPI_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 25000
      });
  
      // Calculate number of nights
      const nights = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
  
      // Combine hotel metadata with rate data
      const hotelsWithRates = ratesResponse.data?.data || ratesResponse.data || [];
      
      // Create a map of hotel metadata for quick lookup
      const hotelMetadataMap = new Map<string, any>();
      hotels.forEach((hotel: any) => {
        const id = hotel.id || hotel.hotelId || hotel.hotel_id || hotel.code;
        if (id) {
          hotelMetadataMap.set(id, hotel);
        }
      });
  
      // Enhance rate data with hotel metadata (FULL DATA for frontend)
      const enrichedHotels: HotelWithRates[] = hotelsWithRates.map((rateHotel: any) => {
        const metadata = hotelMetadataMap.get(rateHotel.hotelId);
        return {
          ...rateHotel,
          hotelInfo: metadata || null
        };
      });
  
      // 🚀 NEW: Create lightweight summaries for AI processing
      const hotelSummariesForAI: HotelSummaryForAI[] = enrichedHotels.map((hotel, index) => 
        createHotelSummaryForAI(hotel, index, nights)
      );
  
      console.log(`Step 4: Successfully found rates for ${enrichedHotels.length} hotels`);
      console.log(`Created ${hotelSummariesForAI.length} lightweight summaries for AI processing`);
  
      res.json({
        searchParams: {
          checkin: parsedQuery.checkin,
          checkout: parsedQuery.checkout,
          nights: nights,
          adults: parsedQuery.adults,
          children: parsedQuery.children,
          countryCode: parsedQuery.countryCode,
          cityName: parsedQuery.cityName,
          language: "en",
          currency: 'USD',
          aiSearch: parsedQuery.aiSearch
        },
        totalHotelsFound: hotels.length,
        hotelsWithRates: enrichedHotels.length,
        hotels: enrichedHotels, // Full data for frontend
        hotelSummariesForAI: hotelSummariesForAI, // 🚀 Lightweight summaries for AI
        searchId: ratesResponse.data?.searchId || null
      });
  
    } catch (error) {
      console.error('Error searching hotel availability:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('API Error Response:', error.response.data);
          res.status(error.response.status).json({
            error: 'LiteAPI error',
            message: error.response.data?.message || error.response.data?.error?.description || 'Unknown API error',
            details: error.response.data,
            step: error.config?.url?.includes('/data/hotels') ? 'hotel_search' : 'rates_search'
          });
          return;
        } else if (error.request) {
          res.status(408).json({
            error: 'Request timeout',
            message: 'No response received from LiteAPI'
          });
          return;
        }
      }
  
      res.status(500).json({ 
        error: 'Failed to search hotel availability',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

// Get specific hotel availability by hotel ID
export const getHotelAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { hotelId, checkin, checkout, adults = 2, children = 0 } = req.body;
  
      if (!hotelId || !checkin || !checkout) {
        res.status(400).json({ 
          error: 'Missing required fields: hotelId, checkin, and checkout are required' 
        });
        return;
      }
  
      const requestBody = {
        checkin,
        checkout,
        currency: 'USD',
        guestNationality: 'US',
        hotelIds: [hotelId],
        occupancies: [
          {
            adults,
            children: children ? Array(children).fill(10) : []
          }
        ],
        timeout: 12
      };
  
      console.log('Getting availability for hotel:', hotelId);
  
      const response = await axios.post('https://api.liteapi.travel/v3.0/hotels/rates', requestBody, {
        headers: {
          'X-API-Key': process.env.LITEAPI_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });
  
      res.json({
        hotelId,
        searchParams: { checkin, checkout, adults, children },
        availability: response.data
      });
  
    } catch (error) {
      console.error('Error getting hotel availability:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        res.status(error.response.status).json({
          error: 'Failed to get hotel availability',
          message: error.response.data?.message || error.response.data?.error?.description || error.message,
          details: error.response.data
        });
        return;
      }
  
      res.status(500).json({ 
        error: 'Failed to get hotel availability',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

// Combined endpoint: parse user input AND search availability
export const parseAndSearchAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userInput } = req.body;
  
      if (!userInput) {
        res.status(400).json({ error: 'userInput is required' });
        return;
      }
  
      console.log('Combined search: Parsing input:', userInput);
  
      // First, parse the user input
      const parseResponse = await axios.post(
        `${process.env.BASE_URL || 'http://localhost:3003'}/api/query/parse`,
        { userInput },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );
  
      const parsedQuery = parseResponse.data;
      console.log('Combined search: Parsed query:', parsedQuery);
  
      // Then search hotel availability with the parsed data
      const availabilityResponse = await axios.post(
        `${process.env.BASE_URL || 'http://localhost:3003'}/api/hotels/availability`,
        parsedQuery,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000
        }
      );
  
      res.json(availabilityResponse.data);
  
    } catch (error) {
      console.error('Error in combined parse and availability search:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        res.status(error.response.status).json({
          error: 'Combined availability search failed',
          message: error.response.data?.message || error.response.data?.error?.description || error.message,
          step: error.config?.url?.includes('/parse') ? 'parsing' : 'availability_search',
          details: error.response.data
        });
        return;
      }
  
      res.status(500).json({ 
        error: 'Failed to parse and search availability',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

export const validateDates = (checkin: string, checkout: string) => {
  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkinDate < today) {
    return { valid: false, error: 'Check-in date cannot be in the past' };
  }

  if (checkoutDate <= checkinDate) {
    return { valid: false, error: 'Check-out date must be after check-in date' };
  }

  const nights = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
  return { valid: true, nights };
};