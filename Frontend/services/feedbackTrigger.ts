// services/feedbackTrigger.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  LAST_PROMPTED: 'feedback_last_prompted',
  PROMPT_COUNT: 'feedback_prompt_count',
  USER_DISMISSED: 'feedback_user_dismissed',
  USER_REVIEWED: 'feedback_user_reviewed',
  SESSION_COUNT: 'feedback_session_count',
  SEARCH_COUNT: 'feedback_search_count',
};

interface FeedbackTriggerConfig {
  minSessionsBeforePrompt: number; // Show after X app opens
  minSearchesBeforePrompt: number; // Show after X searches
  daysBetweenPrompts: number; // Don't prompt more than once every X days
  maxPromptCount: number; // Stop prompting after X times
}

const DEFAULT_CONFIG: FeedbackTriggerConfig = {
  minSessionsBeforePrompt: 3, // After 3 app opens
  minSearchesBeforePrompt: 5, // After 5 searches
  daysBetweenPrompts: 30, // Once per month max
  maxPromptCount: 1, // Stop after 3 prompts total
};

class FeedbackTriggerService {
  private config: FeedbackTriggerConfig;

  constructor(config: Partial<FeedbackTriggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Track app session
  async trackSession(): Promise<void> {
    try {
      const count = await this.getSessionCount();
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_COUNT, (count + 1).toString());
      console.log(`📱 Session tracked: ${count + 1}`);
    } catch (error) {
      console.error('Error tracking session:', error);
    }
  }

  // Track search
  async trackSearch(): Promise<void> {
    try {
      const count = await this.getSearchCount();
      await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_COUNT, (count + 1).toString());
      console.log(`🔍 Search tracked: ${count + 1}`);
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  // Check if we should show feedback prompt
  async shouldShowPrompt(): Promise<boolean> {
    try {
      // Check if user already reviewed
      const hasReviewed = await AsyncStorage.getItem(STORAGE_KEYS.USER_REVIEWED);
      if (hasReviewed === 'true') {
        console.log('❌ User already reviewed - never show again');
        return false;
      }

      // Check if user permanently dismissed
      const isDismissed = await AsyncStorage.getItem(STORAGE_KEYS.USER_DISMISSED);
      if (isDismissed === 'true') {
        console.log('❌ User permanently dismissed - never show again');
        return false;
      }

      // Check prompt count
      const promptCount = await this.getPromptCount();
      if (promptCount >= this.config.maxPromptCount) {
        console.log(`❌ Max prompts reached (${promptCount}/${this.config.maxPromptCount})`);
        return false;
      }

      // Check time since last prompt
      const lastPrompted = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PROMPTED);
      if (lastPrompted) {
        const daysSinceLastPrompt = (Date.now() - parseInt(lastPrompted)) / (1000 * 60 * 60 * 24);
        if (daysSinceLastPrompt < this.config.daysBetweenPrompts) {
          console.log(`❌ Too soon (${Math.floor(daysSinceLastPrompt)} days < ${this.config.daysBetweenPrompts})`);
          return false;
        }
      }

      // Check session count
      const sessionCount = await this.getSessionCount();
      if (sessionCount < this.config.minSessionsBeforePrompt) {
        console.log(`❌ Not enough sessions (${sessionCount}/${this.config.minSessionsBeforePrompt})`);
        return false;
      }

      // Check search count
      const searchCount = await this.getSearchCount();
      if (searchCount < this.config.minSearchesBeforePrompt) {
        console.log(`❌ Not enough searches (${searchCount}/${this.config.minSearchesBeforePrompt})`);
        return false;
      }

      console.log('✅ All conditions met! Should show feedback prompt');
      console.log(`  Sessions: ${sessionCount}/${this.config.minSessionsBeforePrompt}`);
      console.log(`  Searches: ${searchCount}/${this.config.minSearchesBeforePrompt}`);
      console.log(`  Prompts: ${promptCount}/${this.config.maxPromptCount}`);
      
      return true;
    } catch (error) {
      console.error('Error checking should show prompt:', error);
      return false;
    }
  }

  // Mark that we showed the prompt
  async markPromptShown(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_PROMPTED, Date.now().toString());
      const count = await this.getPromptCount();
      await AsyncStorage.setItem(STORAGE_KEYS.PROMPT_COUNT, (count + 1).toString());
      console.log(`📋 Prompt shown - count: ${count + 1}`);
    } catch (error) {
      console.error('Error marking prompt shown:', error);
    }
  }

  // User left a review
  async markUserReviewed(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_REVIEWED, 'true');
      console.log('✅ User marked as reviewed - will never show again');
    } catch (error) {
      console.error('Error marking user reviewed:', error);
    }
  }

  // User dismissed (clicked "Maybe Later" multiple times)
  async markUserDismissed(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DISMISSED, 'true');
      console.log('✅ User marked as dismissed - will never show again');
    } catch (error) {
      console.error('Error marking user dismissed:', error);
    }
  }

  // Helper: Get session count
  async getSessionCount(): Promise<number> {
    try {
      const count = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_COUNT);
      return count ? parseInt(count) : 0;
    } catch {
      return 0;
    }
  }

  // Helper: Get search count
  async getSearchCount(): Promise<number> {
    try {
      const count = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_COUNT);
      return count ? parseInt(count) : 0;
    } catch {
      return 0;
    }
  }

  // Helper: Get prompt count
  async getPromptCount(): Promise<number> {
    try {
      const count = await AsyncStorage.getItem(STORAGE_KEYS.PROMPT_COUNT);
      return count ? parseInt(count) : 0;
    } catch {
      return 0;
    }
  }

  // Get current status (for debugging)
  async getStatus(): Promise<{
    sessions: number;
    searches: number;
    prompts: number;
    lastPrompted: string | null;
    hasReviewed: boolean;
    isDismissed: boolean;
  }> {
    const sessions = await this.getSessionCount();
    const searches = await this.getSearchCount();
    const prompts = await this.getPromptCount();
    const lastPrompted = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PROMPTED);
    const hasReviewed = (await AsyncStorage.getItem(STORAGE_KEYS.USER_REVIEWED)) === 'true';
    const isDismissed = (await AsyncStorage.getItem(STORAGE_KEYS.USER_DISMISSED)) === 'true';

    return {
      sessions,
      searches,
      prompts,
      lastPrompted,
      hasReviewed,
      isDismissed,
    };
  }

  // Reset all data (for testing)
  async reset(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      console.log('🔄 Feedback tracking reset');
    } catch (error) {
      console.error('Error resetting feedback data:', error);
    }
  }
}

export const feedbackTrigger = new FeedbackTriggerService();