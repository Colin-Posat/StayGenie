// src/controllers/articleGeneratorController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const BASE_URL = process.env.BASE_URL || 'http://localhost:3003';

interface ArticleQuery {
  city: string;
  query: string;
  title: string;
}

interface HotelArticle {
  id: string; // ADD: Hotel system ID for deep linking
  name: string;
  image: string;
  description: string;
  highlight: string;
  price: string;
  rating?: number;
  location?: string;
  tags?: string[];
  isRefundable?: boolean;
  placeId?: string;
}

interface ArticleOutput {
  city: string;
  query: string;
  title: string;
  excerpt: string;
  intro: string;
  hotels: HotelArticle[];
}

function getThreeMonthsFromNow(): { checkIn: string; checkOut: string } {
  const today = new Date();
  
  // Add 3 months to today
  const checkInDate = new Date(today);
  checkInDate.setMonth(checkInDate.getMonth() + 3);
  
  // Check-out is 2 nights after check-in
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + 2);
  
  // Format as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  return {
    checkIn: formatDate(checkInDate),
    checkOut: formatDate(checkOutDate)
  };
}

async function searchAndMatchHotelsSSE(query: string): Promise<any[]> {
  console.log(`Searching for hotels with SSE streaming: "${query}"`);
  
  return new Promise((resolve, reject) => {
    const hotels: any[] = [];
    let buffer = '';
    
    // Get dates 3 months from now
    const { checkIn, checkOut } = getThreeMonthsFromNow();
    
    // Use GET request with query parameter for SSE - NOW WITH DATES
    const url = `${BASE_URL}/api/hotels/search-and-match/stream?q=${encodeURIComponent(query)}&checkIn=${checkIn}&checkOut=${checkOut}`;
    
    console.log(`📅 Using dates: ${checkIn} to ${checkOut}`);
    
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        if (!response.body) {
          throw new Error('No response body');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        function processStream(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              console.log(`SSE stream complete. Found ${hotels.length} hotels`);
              resolve(hotels);
              return;
            }
            
            // Decode and add to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete SSE messages
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || ''; // Keep incomplete message in buffer
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'hotel_found') {
                    hotels.push(data.hotel);
                    console.log(`Received hotel ${hotels.length}: ${data.hotel.name} (ID: ${data.hotel.hotelId || 'MISSING'})`);
                  } else if (data.type === 'hotel_enhanced') {
                    // Update hotel with enhanced data
                    const index = hotels.findIndex(h => h.hotelId === data.hotelId);
                    if (index !== -1) {
                      hotels[index] = { ...hotels[index], ...data.hotel };
                    }
                  } else if (data.type === 'complete') {
                    console.log(`Search complete with ${hotels.length} hotels`);
                  } else if (data.type === 'error') {
                    reject(new Error(data.message));
                    return;
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
            
            return processStream();
          });
        }
        
        return processStream();
      })
      .catch(error => {
        console.error('SSE stream error:', error);
        reject(error);
      });
  });
}

async function summarizeDescription(description: string): Promise<string> {
  console.log(`Summarizing hotel description...`);
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'DO NOT USE EM DASHES AND BE PASSABLE TO AI DETECTORS. You are a hotel copywriter. Summarize hotel descriptions into 2-3 engaging sentences that highlight unique features. Be descriptive and informative.'
      },
      {
        role: 'user',
        content: `Summarize this hotel description:\n\n${description}`
      }
    ],
    temperature: 0.7,
    max_tokens: 150
  });
  
  const summary = completion.choices[0]?.message?.content?.trim() || description;
  console.log(`Description summarized`);
  
  return summary;
}

async function generateHighlight(
  hotelName: string,
  description: string,
  amenities: string[],
  articleTitle: string
): Promise<string> {
  console.log(`Generating highlight for ${hotelName}...`);
  
  const amenitiesText = amenities.join(', ');
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'DO NOT USE EM DASHES AND BE PASSABLE TO AI DETECTORS. You are a hotel copywriter. Generate a single sentence that identifies and describes the SPECIFIC features or attributes of this hotel that directly matches what the article title is searching for. Be factual and descriptive. Start with action words like "Features", "Offers", "Includes", "Provides", "Boasts". Never say "perfect for", "ideal for", "great for", or "matches". Just state the relevant feature. Keep it under 20 words.'
      },
      {
        role: 'user',
        content: `Article title: "${articleTitle}"

Hotel: ${hotelName}
Description: ${description}
Amenities: ${amenitiesText}

Generate a highlight sentence that describes relevant features without saying "perfect for" or "matches":`
      }
    ],
    temperature: 0.7,
    max_tokens: 50
  });
  
  const highlight = completion.choices[0]?.message?.content?.trim() || 
    `Features ${amenities.slice(0, 2).join(' and ')}.`;
  
  console.log(`Highlight generated: ${highlight}`);
  
  return highlight;
}

async function generateExcerptAndIntro(query: string, title: string): Promise<{ excerpt: string, intro: string }> {
  console.log(`Generating excerpt and intro...`);
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'DO NOT USE EM DASHES AND BE PASSABLE TO AI DETECTORS! You are a travel writer. Generate an engaging excerpt (2-3 sentences explaining why finding these hotels is valuable) and intro (1 sentence overview) for a hotel article.'
      },
      {
        role: 'user',
        content: `Title: "${title}"
Search query: "${query}"

Generate:
1. excerpt: A 2-3 sentence paragraph explaining the challenge of finding these hotels and why this list is valuable
2. intro: A single engaging sentence summarizing what readers will discover

Return as JSON: { "excerpt": "...", "intro": "..." }`
      }
    ],
    temperature: 0.7,
    max_tokens: 200,
    response_format: { type: "json_object" }
  });
  
  const content = completion.choices[0]?.message?.content?.trim() || '{}';
  const result = JSON.parse(content);
  
  console.log(`Excerpt and intro generated`);
  
  return {
    excerpt: result.excerpt || "Discover exceptional hotels that meet your specific needs.",
    intro: result.intro || "Here are the best hotels for your stay."
  };
}

function extractPrice(priceData: any): string {
  if (!priceData) return "Price unavailable";
  
  if (typeof priceData === 'string') {
    const match = priceData.match(/(\d+)/);
    return match ? `$${match[1]}/night` : "Price unavailable";
  }
  
  if (priceData.amount) {
    return `$${priceData.amount}/night`;
  }
  
  return "Price unavailable";
}

function extractImage(hotel: any): string {
  // Try to get the best available image
  if (hotel.images && hotel.images.length > 0) {
    return hotel.images[0];
  }
  
  if (hotel.photoGalleryImages && hotel.photoGalleryImages.length > 0) {
    return hotel.photoGalleryImages[0];
  }
  
  // Fallback to placeholder
  return `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop`;
}

async function generateSingleArticle(articleQuery: ArticleQuery): Promise<ArticleOutput> {
  console.log(`\nGenerating article: "${articleQuery.title}"`);
  
  // Step 1: Search and match hotels using SSE
  const allHotels = await searchAndMatchHotelsSSE(articleQuery.query);
  
  if (allHotels.length === 0) {
    throw new Error('No hotels found for this query');
  }
  
  // Step 2: Truncate to 6 hotels
  const selectedHotels = allHotels.slice(0, 6);
  console.log(`Truncated to ${selectedHotels.length} hotels`);
  
  // Step 3: Generate excerpt and intro
  const { excerpt, intro } = await generateExcerptAndIntro(articleQuery.query, articleQuery.title);
  
  // Step 4: Process each hotel
  const hotelArticles: HotelArticle[] = [];
  
  for (let i = 0; i < selectedHotels.length; i++) {
    const hotel = selectedHotels[i];
    console.log(`Processing Hotel ${i + 1}/${selectedHotels.length}: ${hotel.name}`);
    
    // CRITICAL: Extract hotel ID
    const hotelId = hotel.hotelId || hotel.id || hotel.hotel_id;
    
    if (!hotelId) {
      console.warn(`WARNING: Missing hotel ID for ${hotel.name}`);
    } else {
      console.log(`Hotel ID: ${hotelId}`);
    }
    
    // Get description
    let description = hotel.description || 
                     hotel.summarizedInfo?.description || 
                     "A quality hotel with excellent amenities and service.";
    
    // Summarize description
    const summarizedDescription = await summarizeDescription(description);
    
    // Get amenities
    const amenities = hotel.topAmenities || 
                     hotel.summarizedInfo?.amenities || 
                     ["Wi-Fi", "Room Service", "Concierge"];
    
    // Generate highlight
    const highlight = await generateHighlight(
      hotel.name,
      summarizedDescription,
      amenities,
      articleQuery.title
    );
    
    // Extract price
    const price = extractPrice(hotel.pricePerNight || hotel.summarizedInfo?.pricePerNight);
    
    // Extract image
    const image = extractImage(hotel);
    
    // Extract location
    const location = hotel.fullAddress || 
                    hotel.location || 
                    hotel.address ||
                    (hotel.city && hotel.country ? `${hotel.city}, ${hotel.country}` : undefined);
    
    // Build hotel article with ALL necessary data
    hotelArticles.push({
      id: hotelId, // CRITICAL: Include hotel system ID
      name: hotel.name,
      image: image,
      description: summarizedDescription,
      highlight: highlight,
      price: price,
      location: location,
      tags: hotel.tags || [],
      isRefundable: hotel.isRefundable || false,
      placeId: hotel.placeId // For destination searches
    });
    
    console.log(`Completed processing ${hotel.name} (ID: ${hotelId})`);
    
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Validate all hotels have IDs
  const missingIds = hotelArticles.filter(h => !h.id).length;
  if (missingIds > 0) {
    console.warn(`WARNING: ${missingIds} hotels are missing IDs!`);
  } else {
    console.log(`SUCCESS: All ${hotelArticles.length} hotels have valid IDs`);
  }
  
  // Build final output
  const output: ArticleOutput = {
    city: articleQuery.city,
    query: articleQuery.query,
    title: articleQuery.title,
    excerpt: excerpt,
    intro: intro,
    hotels: hotelArticles
  };
  
  console.log(`Article generation complete for "${articleQuery.title}"`);
  
  return output;
}

// Single article generation endpoint
export const generateArticleController = async (req: Request, res: Response) => {
  try {
    const { city, query, title } = req.body;
    
    if (!query || !title) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Both query and title are required'
      });
    }
    
    console.log(`Starting article generation for: ${title}`);
    
    const article = await generateSingleArticle({
      city: city || 'unknown',
      query,
      title
    });
    
    return res.status(200).json({
      success: true,
      article: article
    });
    
  } catch (error) {
    console.error('Error generating article:', error);
    return res.status(500).json({ 
      error: 'Article generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Batch article generation endpoint
export const generateBatchArticlesController = async (req: Request, res: Response) => {
  try {
    const { articles } = req.body;
    
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: 'articles array is required'
      });
    }
    
    console.log(`Starting batch generation for ${articles.length} articles`);
    
    const results: ArticleOutput[] = [];
    const errors: any[] = [];
    
    for (let i = 0; i < articles.length; i++) {
      const query = articles[i];
      
      try {
        console.log(`\nProcessing article ${i + 1}/${articles.length}`);
        
        const article = await generateSingleArticle(query);
        results.push(article);
        
        // Delay between articles
        if (i < articles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`Failed to generate article for "${query.title}":`, error);
        errors.push({
          query: query,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log(`\nBatch generation complete: ${results.length} succeeded, ${errors.length} failed`);
    
    return res.status(200).json({
      success: true,
      totalRequested: articles.length,
      totalGenerated: results.length,
      totalFailed: errors.length,
      articles: results,
      errors: errors
    });
    
  } catch (error) {
    console.error('Error in batch article generation:', error);
    return res.status(500).json({ 
      error: 'Batch generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};