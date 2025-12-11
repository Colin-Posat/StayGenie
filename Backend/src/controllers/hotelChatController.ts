// controllers/hotelChatController.ts - Simplified using LiteAPI's Q&A endpoint
import { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Optimized axios instance for LiteAPI
const liteApiInstance = axios.create({
  baseURL: 'https://api.liteapi.travel/v3.0',
  headers: {
    'X-API-Key': process.env.LITEAPI_KEY,
    'Content-Type': 'application/json',
    'Connection': 'keep-alive'
  },
  timeout: 30000,
  maxRedirects: 2,
});

interface ChatMessage {
  id: string;
  type: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

interface HotelChatRequest {
  conversationId: string;
  userMessage: string;
  hotelData: {
    id: string;
    name: string;
    [key: string]: any;
  };
  chatHistory?: ChatMessage[];
}

// MAIN CHAT CONTROLLER - Using LiteAPI's hotel Q&A endpoint
export const hotelChatController = async (req: Request, res: Response) => {
  try {
    const { conversationId, userMessage, hotelData, chatHistory = [] }: HotelChatRequest = req.body;

    if (!conversationId || !userMessage || !hotelData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: conversationId, userMessage, and hotelData are required'
      });
    }

    if (!hotelData.id) {
      return res.status(400).json({
        success: false,
        error: 'Hotel data must include hotel id'
      });
    }

    console.log(`🏨 Hotel chat request for ${hotelData.name} (ID: ${hotelData.id})`);
    console.log(`💬 User message: "${userMessage}"`);

    try {
      // Call LiteAPI's hotel Q&A endpoint with web search enabled
      const response = await liteApiInstance.get('/data/hotel/ask', {
        params: {
          hotelId: hotelData.id,
          query: userMessage,
          allowWebSearch: true, // Enable web search for enhanced answers
        },
        timeout: 15000, // Give it 15 seconds since web search may take longer
      });

      if (response.status !== 200 || !response.data) {
        throw new Error(`LiteAPI Q&A error: ${response.status}`);
      }

      // LiteAPI returns: { data: { answer, citations, latency_ms, search_used } }
      const liteApiData = response.data.data;
      
      if (!liteApiData || !liteApiData.answer) {
        throw new Error('Invalid response format from LiteAPI');
      }

      const aiResponse = liteApiData.answer;
      const citations = liteApiData.citations || [];
      const searchUsed = liteApiData.search_used || false;
      const latencyMs = liteApiData.latency_ms || 0;

      console.log(`✅ Generated AI response from LiteAPI for ${hotelData.name}`);
      console.log(`   Search used: ${searchUsed}, Latency: ${latencyMs}ms, Citations: ${citations.length}`);

      return res.status(200).json({
        success: true,
        aiResponse: aiResponse,
        conversationId: conversationId,
        hotelName: hotelData.name,
        source: 'liteapi',
        metadata: {
          searchUsed: searchUsed,
          latencyMs: latencyMs,
          citations: citations,
        }
      });

    } catch (liteApiError: any) {
      console.error('❌ LiteAPI Q&A error:', liteApiError.response?.data || liteApiError.message);

      // If LiteAPI fails, provide a helpful fallback
      const fallbackResponse = `I'm having trouble accessing detailed information about ${hotelData.name} right now. Please try asking about specific features like amenities, location, or check-in times.`;

      return res.status(200).json({
        success: true,
        aiResponse: fallbackResponse,
        conversationId: conversationId,
        hotelName: hotelData.name,
        fallback: true,
        error: liteApiError.response?.data?.message || liteApiError.message,
      });
    }

  } catch (error: any) {
    console.error('❌ Hotel chat controller error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to process hotel chat request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Optional: Keep the fetch details endpoint if you still need it for other purposes
export const fetchHotelDetailsForChatController = async (req: Request, res: Response) => {
  try {
    const { hotelId, hotelName } = req.body;

    if (!hotelId) {
      return res.status(400).json({
        success: false,
        error: 'hotelId is required'
      });
    }

    console.log(`🏨 Fetching hotel details: ${hotelName || 'Unknown'} (ID: ${hotelId})`);

    const response = await liteApiInstance.get('/data/hotel', {
      params: { hotelId: hotelId },
      timeout: 8000
    });

    if (response.status !== 200) {
      throw new Error(`LiteAPI hotel details error: ${response.status}`);
    }

    const hotelData = response.data;
    console.log(`✅ Successfully fetched hotel details for ${hotelId}`);

    return res.status(200).json({
      success: true,
      hotelId: hotelId,
      hotelName: hotelData.data?.name || hotelName,
      hotelData: hotelData.data,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error fetching hotel details:', error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        return res.status(error.response.status).json({
          success: false,
          error: 'API error while fetching hotel details',
          message: error.response.data?.message || error.response.data?.error?.description || 'Unknown API error',
          details: error.response.data
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch hotel details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};