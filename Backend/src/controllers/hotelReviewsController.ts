// src/controllers/hotelReviewsController.ts - Updated with more reviews and generic content filtering
import { Request, Response } from 'express';
import axios from 'axios';

interface ReviewData {
  averageScore: number;
  country: string;
  type: string;
  name: string;
  date: string;
  headline: string;
  language: string;
  pros: string;
  cons: string;
  source: string;
}

interface ReviewsResponse {
  data: ReviewData[];
  total: number;
  sentiment?: {
    overall: string;
    positiveKeywords: string[];
    negativeKeywords: string[];
    averageRating: number;
  };
}

interface HotelReviewsRequest {
  hotelId: string;
  limit?: number;
  offset?: number;
  getSentiment?: boolean;
}

export const fetchHotelReviewsController = async (req: Request, res: Response) => {
  try {
    const { hotelId, limit = 50, offset = 0, getSentiment = true }: HotelReviewsRequest = req.body;

    // Validate required parameters
    if (!hotelId) {
      return res.status(400).json({
        success: false,
        error: 'Hotel ID is required',
        message: 'Please provide a valid hotel ID to fetch reviews'
      });
    }

    console.log(`🔍 Fetching reviews for hotel: ${hotelId}`);

    // Set up API request to LiteAPI
    const liteApiUrl = 'https://api.liteapi.travel/v3.0/data/reviews';
    const apiKey = process.env.LITEAPI_KEY;

    if (!apiKey) {
      console.error('❌ LITEAPI_KEY environment variable not set');
      return res.status(500).json({
        success: false,
        error: 'API configuration error',
        message: 'Hotel reviews service is temporarily unavailable'
      });
    }

    const params = {
      hotelId,
      limit: Math.min(limit * 4, 300), // Request 4x more reviews (up to 300 max) to account for filtering
      offset,
      getSentiment,
      timeout: 15
    };

    console.log(`📡 Making request to LiteAPI with params:`, params);

    // Make request to LiteAPI
    const response = await axios.get(liteApiUrl, {
      params,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // Increased timeout for larger requests
    });

    const reviewsData: ReviewsResponse = response.data;

    if (!reviewsData.data || reviewsData.data.length === 0) {
      console.log(`ℹ️ No reviews found for hotel ${hotelId}`);
      return res.status(200).json({
        success: true,
        data: {
          reviews: [],
          total: 0,
          message: 'No reviews available for this hotel yet'
        }
      });
    }

    // Filter for English reviews only - check for English language variants
    const englishReviews = reviewsData.data.filter((review: ReviewData) => {
      // Check if language starts with 'en' (covers en-gb, en-us, en, etc.)
      return review.language && review.language.toLowerCase().startsWith('en');
    });

    console.log(`📝 Filtered to ${englishReviews.length} English reviews out of ${reviewsData.data.length} total`);

    if (englishReviews.length === 0) {
      console.log(`ℹ️ No English reviews found for hotel ${hotelId}`);
      return res.status(200).json({
        success: true,
        data: {
          reviews: [],
          total: 0,
          message: 'No English reviews available for this hotel'
        }
      });
    }

    // Process and format English reviews for frontend
    const allFormattedReviews = englishReviews.map((review: ReviewData) => ({
      id: `${review.name}-${review.date}`, // Create unique ID
      author: review.name || 'Anonymous',
      rating: review.averageScore || 0,
      date: formatReviewDate(review.date),
      headline: review.headline || 'Guest Review',
      pros: review.pros || '',
      cons: review.cons || '',
      country: review.country || '',
      travelerType: review.type || 'Guest',
      language: review.language || 'en',
      source: review.source || 'Hotel Partner',
      // Combine pros/cons into content for display
      content: generateReviewContent(review),
      // Add flag to identify generic content
      isGeneric: isGenericContent(review)
    }));

    // Filter out generic reviews and get meaningful ones first
    const meaningfulReviews = allFormattedReviews.filter(review => !review.isGeneric);
    const genericReviews = allFormattedReviews.filter(review => review.isGeneric);

    console.log(`🎯 Found ${meaningfulReviews.length} meaningful reviews and ${genericReviews.length} generic reviews`);

    // Combine meaningful reviews first, then add generic ones if needed to reach the limit
    const prioritizedReviews = [
      ...meaningfulReviews,
      ...genericReviews
    ].slice(0, limit);

    // Calculate summary statistics
    const averageRating = prioritizedReviews.length > 0 
      ? prioritizedReviews.reduce((sum, review) => sum + review.rating, 0) / prioritizedReviews.length 
      : 0;

    const ratingDistribution = calculateRatingDistribution(prioritizedReviews);

    // Extract sentiment keywords if available
    const sentimentData = reviewsData.sentiment ? {
      overall: reviewsData.sentiment.overall,
      positiveKeywords: reviewsData.sentiment.positiveKeywords || [],
      negativeKeywords: reviewsData.sentiment.negativeKeywords || [],
      averageRating: reviewsData.sentiment.averageRating || averageRating
    } : null;

    console.log(`✅ Successfully processed ${prioritizedReviews.length} reviews for hotel ${hotelId} (${meaningfulReviews.length} meaningful, ${Math.min(genericReviews.length, limit - meaningfulReviews.length)} generic)`);

    return res.status(200).json({
      success: true,
      data: {
        reviews: prioritizedReviews,
        total: allFormattedReviews.length,
        averageRating: parseFloat(averageRating.toFixed(1)),
        ratingDistribution,
        sentiment: sentimentData,
        hotelId,
        filtered: {
          originalCount: reviewsData.data.length,
          englishCount: englishReviews.length,
          meaningfulCount: meaningfulReviews.length,
          genericCount: genericReviews.length,
          filteredOut: reviewsData.data.length - englishReviews.length
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching hotel reviews:', error);

    // Handle specific error types
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return res.status(408).json({
        success: false,
        error: 'Request timeout',
        message: 'Reviews are taking longer than usual to load. Please try again.'
      });
    }

    if (error.response?.status === 429) {
      const resetTime = error.response.headers['x-ratelimit-reset'];
      const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
      
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many review requests. Please try again in a few minutes.',
        retryAfter: resetDate ? Math.ceil((resetDate.getTime() - Date.now()) / 1000) : 60
      });
    }

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found',
        message: 'No reviews available for this hotel'
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch hotel reviews at this time. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to check if review content is generic/fallback content
const isGenericContent = (review: ReviewData): boolean => {
  // Check if this review would generate generic fallback content
  const hasNoMeaningfulContent = (
    (!review.pros || review.pros.trim() === '') &&
    (!review.cons || review.cons.trim() === '') &&
    (!review.headline || 
     review.headline === 'Very good' || 
     review.headline === 'Good' ||
     review.headline === 'Guest Review' ||
     review.headline.trim() === '')
  );

  // Check for single word content in any field
  const hasSingleWordContent = () => {
    const prosWords = review.pros ? review.pros.trim().split(/\s+/).length : 0;
    const consWords = review.cons ? review.cons.trim().split(/\s+/).length : 0;
    const headlineWords = review.headline ? review.headline.trim().split(/\s+/).length : 0;
    
    // If any field exists but only has 1 word, and no other meaningful content
    const prosIsSingleWord = prosWords === 1 && !review.cons?.trim() && (!review.headline?.trim() || headlineWords <= 2);
    const consIsSingleWord = consWords === 1 && !review.pros?.trim() && (!review.headline?.trim() || headlineWords <= 2);
    const headlineIsSingleWord = headlineWords === 1 && !review.pros?.trim() && !review.cons?.trim();
    
    return prosIsSingleWord || consIsSingleWord || headlineIsSingleWord;
  };

  // Also check for other generic headlines that don't add value
  const genericHeadlines = [
    'ok',
    'fine',
    'nice',
    'great',
    'excellent',
    'good stay',
    'nice stay',
    'great stay',
    'excellent stay',
    'recommended',
    'would recommend',
    'perfect',
    'amazing',
    'awesome',
    'fantastic',
    'wonderful',
    'terrible',
    'bad',
    'horrible',
    'disappointing'
  ];

  const hasGenericHeadline = review.headline ? 
    genericHeadlines.some(generic => 
      review.headline.toLowerCase().trim() === generic
    ) : false;

  // Check for very short combined content (less than 3 meaningful words total)
  const getTotalMeaningfulWords = () => {
    const pros = review.pros?.trim() || '';
    const cons = review.cons?.trim() || '';
    const headline = review.headline?.trim() || '';
    
    // Combine all content and count words, excluding generic headlines
    const combinedContent = `${pros} ${cons} ${headline}`.trim();
    const words = combinedContent.split(/\s+/).filter(word => word.length > 2); // Filter out very short words
    return words.length;
  };

  const hasInsufficientContent = getTotalMeaningfulWords() < 3;

  return hasNoMeaningfulContent || hasGenericHeadline || hasSingleWordContent() || hasInsufficientContent;
};

// Helper function to format review date
const formatReviewDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
  } catch (error) {
    return 'Recently';
  }
};

// Helper function to generate readable content from pros/cons
const generateReviewContent = (review: ReviewData): string => {
  const parts: string[] = [];
  
  if (review.headline && 
      review.headline !== 'Very good' && 
      review.headline !== 'Good' &&
      review.headline !== 'Guest Review' &&
      review.headline.trim() !== '') {
    parts.push(review.headline);
  }
  
  if (review.pros && review.pros.trim()) {
    parts.push(review.pros);
  }
  
  if (review.cons && review.cons.trim()) {
    parts.push(`However, ${review.cons.toLowerCase()}`);
  }
  
  if (parts.length === 0) {
    // Fallback based on rating - but these will be marked as generic
    if (review.averageScore >= 8) {
      return "Had an excellent stay at this hotel. Would recommend to others.";
    } else if (review.averageScore >= 6) {
      return "Overall a good experience with some room for improvement.";
    } else {
      return "The stay met basic expectations with mixed results.";
    }
  }
  
  return parts.join('. ').replace(/\.\./g, '.');
};

// Helper function to calculate rating distribution
const calculateRatingDistribution = (reviews: any[]): { [key: number]: number } => {
  const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  reviews.forEach(review => {
    const rating = Math.round(review.rating / 2); // Convert 10-scale to 5-scale
    const clampedRating = Math.max(1, Math.min(5, rating));
    distribution[clampedRating]++;
  });
  
  return distribution;
};