// routes/hotelSentimentRoutes.ts - Route handler for sentiment polling endpoint
import { Router } from 'express';
import { getSearchSentiment } from '../controllers/smartHotelSearch';

const router = Router();

/**
 * GET /api/hotels/sentiment/:searchId
 * 
 * Endpoint for polling sentiment analysis results for a given search.
 * Used with staged responses to get insights after initial hotel recommendations.
 * 
 * @param searchId - UUID of the search to get sentiment data for
 * @returns JSON with sentiment insights and completion status
 */
router.get('/sentiment/:searchId', getSearchSentiment);

/**
 * GET /api/hotels/sentiment/:searchId/status
 * 
 * Lightweight endpoint to check if sentiment analysis is complete
 * without returning full data (useful for polling status)
 */
router.get('/sentiment/:searchId/status', async (req, res) => {
  try {
    const { searchId } = req.params;
    
    if (!searchId) {
      res.status(400).json({ error: 'searchId is required' });
      return;
    }
    
    const { getCache } = await import('../cache');
    const cache = getCache();
    const searchResults = await cache.getSearchResults(searchId);
    
    if (!searchResults) {
      res.status(404).json({ 
        error: 'Search not found',
        completed: false
      });
      return;
    }
    
    res.json({
      searchId: searchId,
      completed: !searchResults.insightsPending,
      updatedAt: searchResults.updatedAt || null,
      hotelCount: searchResults.recommendations?.length || 0
    });
    
  } catch (error) {
    console.error('Error checking sentiment status:', error);
    res.status(500).json({ 
      error: 'Failed to check status',
      completed: false
    });
  }
});

export default router;