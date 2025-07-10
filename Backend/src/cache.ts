// cache.ts - Redis wrapper utility for hotel search caching
import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

class CacheService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor(config?: CacheConfig) {
    const defaultConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    };

    const finalConfig = { ...defaultConfig, ...config };

    this.client = createClient({
      socket: {
        host: finalConfig.host,
        port: finalConfig.port
      },
      password: finalConfig.password || undefined,
      database: finalConfig.db
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis client connected');
      this.isConnected = true;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
        this.isConnected = true;
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      console.warn(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.warn(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      console.warn(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      if (keys.length === 0) return [];
      
      const values = await this.client.mGet(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.warn(`Cache mget error for keys ${keys.join(', ')}:`, error);
      return keys.map(() => null);
    }
  }

  async mset<T>(keyValuePairs: Array<{ key: string; value: T; ttl?: number }>): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      if (keyValuePairs.length === 0) return true;

      // For items with TTL, we need to set them individually
      const withTtl = keyValuePairs.filter(item => item.ttl);
      const withoutTtl = keyValuePairs.filter(item => !item.ttl);

      // Set items without TTL in batch
      if (withoutTtl.length > 0) {
        const msetArgs: string[] = [];
        withoutTtl.forEach(item => {
          msetArgs.push(item.key, JSON.stringify(item.value));
        });
        await this.client.mSet(msetArgs);
      }

      // Set items with TTL individually
      if (withTtl.length > 0) {
        await Promise.all(
          withTtl.map(item => 
            this.client.setEx(item.key, item.ttl!, JSON.stringify(item.value))
          )
        );
      }

      return true;
    } catch (error) {
      console.warn('Cache mset error:', error);
      return false;
    }
  }

  // Hotel-specific cache methods
  async getHotelDetails(hotelId: string): Promise<any | null> {
    return this.get(`hotel:${hotelId}`);
  }

  async setHotelDetails(hotelId: string, details: any): Promise<boolean> {
    // 24 hour TTL for hotel details
    return this.set(`hotel:${hotelId}`, details, 24 * 60 * 60);
  }

  async getHotelSentiment(hotelId: string): Promise<any | null> {
    return this.get(`sentiment:${hotelId}`);
  }

  async setHotelSentiment(hotelId: string, sentiment: any): Promise<boolean> {
    // 12 hour TTL for sentiment data
    return this.set(`sentiment:${hotelId}`, sentiment, 12 * 60 * 60);
  }

  async getBatchHotelDetails(hotelIds: string[]): Promise<(any | null)[]> {
    const keys = hotelIds.map(id => `hotel:${id}`);
    return this.mget(keys);
  }

  async setBatchHotelDetails(hotels: Array<{ hotelId: string; details: any }>): Promise<boolean> {
    const keyValuePairs = hotels.map(hotel => ({
      key: `hotel:${hotel.hotelId}`,
      value: hotel.details,
      ttl: 24 * 60 * 60 // 24 hours
    }));
    return this.mset(keyValuePairs);
  }

  async getBatchHotelSentiment(hotelIds: string[]): Promise<(any | null)[]> {
    const keys = hotelIds.map(id => `sentiment:${id}`);
    return this.mget(keys);
  }

  async setBatchHotelSentiment(sentiments: Array<{ hotelId: string; sentiment: any }>): Promise<boolean> {
    const keyValuePairs = sentiments.map(item => ({
      key: `sentiment:${item.hotelId}`,
      value: item.sentiment,
      ttl: 12 * 60 * 60 // 12 hours
    }));
    return this.mset(keyValuePairs);
  }

  // Search-specific cache for staged responses
  async getSearchResults(searchId: string): Promise<any | null> {
    return this.get(`search:${searchId}`);
  }

  async setSearchResults(searchId: string, results: any): Promise<boolean> {
    // 1 hour TTL for search results
    return this.set(`search:${searchId}`, results, 60 * 60);
  }

  async updateSearchInsights(searchId: string, insights: Record<string, any>): Promise<boolean> {
    try {
      const existingResults = await this.getSearchResults(searchId);
      if (!existingResults) {
        console.warn(`No existing search results found for ${searchId}`);
        return false;
      }
  
      // Validate insights is a plain object
      if (typeof insights !== 'object' || insights === null || insights instanceof Map) {
        console.error(`Invalid insights type for ${searchId}:`, typeof insights);
        return false;
      }
  
      // Update the recommendations with new insights
      const updatedRecommendations = existingResults.recommendations?.map((hotel: any) => {
        const hotelInsights = insights[hotel.hotelId];
        if (hotelInsights) {
          return {
            ...hotel,
            guestInsights: hotelInsights.guestInsights,
            sentimentData: hotelInsights.sentimentData
          };
        }
        return hotel;
      }) || [];
  
      const updatedResults = {
        ...existingResults,
        recommendations: updatedRecommendations,
        insights,
        insightsPending: false,
        updatedAt: new Date().toISOString()
      };
  
      console.log(`✅ Updating search insights for ${searchId} with ${Object.keys(insights).length} hotels`);
      return this.setSearchResults(searchId, updatedResults);
      
    } catch (error) {
      console.error(`Failed to update search insights for ${searchId}:`, error);
      return false;
    }
  }
}

// Singleton instance
let cacheInstance: CacheService | null = null;

export const getCache = (): CacheService => {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
};

export { CacheService };
export default getCache;