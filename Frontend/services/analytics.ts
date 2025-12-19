// services/analytics.ts - MINIMAL ESSENTIAL ANALYTICS
import { logEvent as firebaseLogEvent } from '../config/firebaseConfig';
import { getAuth } from 'firebase/auth';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_EMAILS = [
  'c@c.com', // ✅ ADD YOUR EMAIL HERE
  'test@staygenie.com',
];

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SearchMethod = 'text' | 'voice' | 'recent_search' | 'carousel' | 'pill';
export type SearchFailureReason = 'no_results' | 'timeout' | 'api_error';
export type FirstAction = 'ask_ai' | 'book_now' | 'map_view' | 'favorite' | 'share' | 'photo_gallery' | 'review_modal' | 'expand_details';

// ============================================================================
// ANALYTICS SERVICE - ONLY ESSENTIALS
// ============================================================================

export class AnalyticsService {
  private static isInitialized = false;
  private static searchStartTime: number | null = null;
  private static firstActionTracked = false;

  // Check if we should track this user
  private static async shouldTrack(): Promise<boolean> {
    // Never track in dev mode
    if (__DEV__) {
      console.log('🧪 DEV MODE - Analytics disabled');
      return false;
    }
    
    // Never track test users
    try {
      const auth = getAuth();
      const userEmail = auth.currentUser?.email;
      
      if (userEmail && TEST_EMAILS.includes(userEmail.toLowerCase())) {
        console.log('🧪 TEST USER - Analytics disabled');
        return false;
      }
    } catch (e) {
      // If auth check fails, still track (anonymous users are fine)
    }
    
    return true;
  }

  static async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log('✅ Analytics initialized');
  }

  // ========================================================================
  // 1. SEARCH SUCCESS RATE
  // ========================================================================

  static async trackSearchInitiated(query: string, method: SearchMethod) {
    await this.initialize();
    if (!(await this.shouldTrack())) return;

    try {
      this.searchStartTime = Date.now();
      this.firstActionTracked = false; // Reset for new search

      await firebaseLogEvent('search', {
        search_term: query,
        method: method,
      });

      console.log(`📊 Search: "${query}" via ${method}`);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  static async trackSearchSuccess(query: string, resultCount: number) {
    if (!(await this.shouldTrack())) return;

    try {
      const duration = this.searchStartTime ? Date.now() - this.searchStartTime : undefined;

      await firebaseLogEvent('search_success', {
        search_term: query,
        results: resultCount,
        duration_ms: duration,
      });

      console.log(`✅ Search success: ${resultCount} results${duration ? ` (${duration}ms)` : ''}`);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  static async trackSearchFailed(query: string, reason: SearchFailureReason) {
    if (!(await this.shouldTrack())) return;

    try {
      await firebaseLogEvent('search_failed', {
        search_term: query,
        reason: reason,
      });

      console.log(`❌ Search failed: "${query}" - ${reason}`);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  // ========================================================================
  // 2. HOTEL IMPRESSIONS & ENGAGEMENT
  // ========================================================================

  static async trackHotelViewed(hotelId: string, hotelName: string, position: number) {
    if (!(await this.shouldTrack())) return;

    try {
      await firebaseLogEvent('view_item', {
        item_id: hotelId,
        item_name: hotelName,
        index: position,
      });

      console.log(`👁️ Hotel viewed: ${hotelName} at position ${position}`);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  static async trackHotelClick(hotelId: string, hotelName: string, position: number, action: FirstAction) {
    if (!(await this.shouldTrack())) return;

    try {
      await firebaseLogEvent('select_item', {
        item_id: hotelId,
        item_name: hotelName,
        index: position,
        action: action,
      });

      console.log(`🖱️ Hotel click: ${hotelName} - ${action}`);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  // ========================================================================
  // 3. AFFILIATE CLICKS (REVENUE)
  // ========================================================================

  static async trackBookClick(hotelId: string, hotelName: string, position: number, price: number) {
    if (!(await this.shouldTrack())) return;

    try {
      await firebaseLogEvent('begin_checkout', {
        item_id: hotelId,
        item_name: hotelName,
        index: position,
        value: price,
        currency: 'USD',
      });

      console.log(`💰 Book clicked: ${hotelName} - $${price}`);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  // ========================================================================
  // 4. FIRST ACTION AFTER SEARCH (OPTIONAL BUT USEFUL)
  // ========================================================================

  static async trackFirstAction(action: FirstAction, position: number) {
    if (!(await this.shouldTrack())) return;
    
    // Only track the FIRST action
    if (this.firstActionTracked) return;

    try {
      const timeSinceSearch = this.searchStartTime ? Date.now() - this.searchStartTime : 0;
      this.firstActionTracked = true;

      await firebaseLogEvent('first_action', {
        action: action,
        position: position,
        time_ms: timeSinceSearch,
      });

      console.log(`🎯 First action: ${action} at position ${position}`);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  // ========================================================================
  // 5. SCROLL DEPTH
  // ========================================================================

  static async trackScrollDepth(maxPosition: number, totalHotels: number) {
    if (!(await this.shouldTrack())) return;

    try {
      const scrolledPastFirst5 = maxPosition >= 5;

      await firebaseLogEvent('scroll_depth', {
        max_position: maxPosition,
        total_hotels: totalHotels,
        past_first_5: scrolledPastFirst5,
      });

      console.log(`📜 Scroll depth: ${maxPosition}/${totalHotels}`);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  // ========================================================================
  // HELPER: Reset for new search
  // ========================================================================

  static resetSearchContext() {
    this.searchStartTime = null;
    this.firstActionTracked = false;
  }
}

export default AnalyticsService;