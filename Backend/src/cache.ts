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

// Helper function to safely serialize data
function safeJsonStringify(obj: any): string {
  const seen = new WeakSet();
  
  return JSON.stringify(obj, (key, value) => {
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    
    // Handle functions
    if (typeof value === 'function') {
      return '[Function]';
    }
    
    // Handle undefined values
    if (value === undefined) {
      return null;
    }
    
    // Handle symbols
    if (typeof value === 'symbol') {
      return value.toString();
    }
    
    // Handle BigInt
    if (typeof value === 'bigint') {
      return value.toString();
    }
    
    return value;
  });
}

// Helper function to clean object for caching
function cleanObjectForCache(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObjectForCache(item));
  }
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'function') {
      // Skip functions
      continue;
    }
    
    if (typeof value === 'object' && value !== null) {
      cleaned[key] = cleanObjectForCache(value);
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
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

    this.client.on('end', () => {
      console.log('Redis client disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('Redis client reconnecting');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    // Check if client is already connected
    if (this.client.isOpen) {
      this.isConnected = true;
      return;
    }

    if (!this.isConnected) {
      try {
        await this.client.connect();
        this.isConnected = true;
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        this.isConnected = false;
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

  async ping(): Promise<string> {
    try {
      // Check if client is ready first
      if (!this.client.isReady) {
        await this.connect();
      }
      return await this.client.ping();
    } catch (error) {
      console.warn('Cache ping error:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client.isReady) {
        await this.connect();
      }
      
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn(`Cache get error for key ${key}:`, error);
      this.isConnected = false;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.client.isReady) {
        await this.connect();
      }

      // Clean the object before serialization
      const cleanedValue = cleanObjectForCache(value);
      
      // Try to serialize - this will throw if there are still issues
      let serialized: string;
      try {
        serialized = safeJsonStringify(cleanedValue);
      } catch (serializationError) {
        console.error(`Failed to serialize value for key ${key}:`, serializationError);
        console.error('Value type:', typeof value);
        console.error('Value preview:', JSON.stringify(value, null, 2).substring(0, 500));
        return false;
      }
      
      // Validate serialized string
      if (typeof serialized !== 'string') {
        console.error(`Serialization returned non-string for key ${key}:`, typeof serialized);
        return false;
      }
      
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      console.warn(`Cache set error for key ${key}:`, error);
      console.error('Error details:', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        valueType: typeof value,
        keyType: typeof key,
        ttlType: typeof ttlSeconds
      });
      this.isConnected = false;
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.client.isReady) {
        await this.connect();
      }
      
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.warn(`Cache delete error for key ${key}:`, error);
      this.isConnected = false;
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client.isReady) {
        await this.connect();
      }
      
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      console.warn(`Cache exists error for key ${key}:`, error);
      this.isConnected = false;
      return false;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (!this.client.isReady) {
        await this.connect();
      }
      
      if (keys.length === 0) return [];
      
      const values = await this.client.mGet(keys);
      return values.map(value => {
        try {
          return value ? JSON.parse(value) : null;
        } catch (parseError) {
          console.warn(`Failed to parse cached value for key in mget:`, parseError);
          return null;
        }
      });
    } catch (error) {
      console.warn(`Cache mget error for keys ${keys.join(', ')}:`, error);
      this.isConnected = false;
      return keys.map(() => null);
    }
  }

  async mset<T>(keyValuePairs: Array<{ key: string; value: T; ttl?: number }>): Promise<boolean> {
    try {
      if (!this.client.isReady) {
        await this.connect();
      }
      
      if (keyValuePairs.length === 0) return true;

      // Clean and serialize all values first
      const cleanedPairs = keyValuePairs.map(item => ({
        ...item,
        value: cleanObjectForCache(item.value)
      }));

      // For items with TTL, we need to set them individually
      const withTtl = cleanedPairs.filter(item => item.ttl);
      const withoutTtl = cleanedPairs.filter(item => !item.ttl);

      // Set items without TTL in batch
      if (withoutTtl.length > 0) {
        const msetArgs: string[] = [];
        for (const item of withoutTtl) {
          try {
            const serialized = safeJsonStringify(item.value);
            msetArgs.push(item.key, serialized);
          } catch (serializationError) {
            console.error(`Failed to serialize value for key ${item.key} in mset:`, serializationError);
            return false;
          }
        }
        await this.client.mSet(msetArgs);
      }

      // Set items with TTL individually
      if (withTtl.length > 0) {
        const ttlPromises = withTtl.map(item => {
          try {
            const serialized = safeJsonStringify(item.value);
            return this.client.setEx(item.key, item.ttl!, serialized);
          } catch (serializationError) {
            console.error(`Failed to serialize value for key ${item.key} in mset with TTL:`, serializationError);
            throw serializationError;
          }
        });
        
        await Promise.all(ttlPromises);
      }

      return true;
    } catch (error) {
      console.warn('Cache mset error:', error);
      this.isConnected = false;
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

  // Method for background enrichment updates
  async getSearchEnrichment(searchId: string): Promise<Record<string, any> | null> {
    return this.get(`enrichment:${searchId}`);
  }

  async setSearchEnrichment(searchId: string, enrichmentData: Record<string, any>): Promise<boolean> {
    // 1 hour TTL for enrichment data
    return this.set(`enrichment:${searchId}`, enrichmentData, 60 * 60);
  }

  async updateSearchEnrichment(searchId: string, enrichmentData: Record<string, any>): Promise<boolean> {
    try {
      // Validate enrichmentData is a plain object
      if (typeof enrichmentData !== 'object' || enrichmentData === null || enrichmentData instanceof Map) {
        console.error(`Invalid enrichment data type for ${searchId}:`, typeof enrichmentData);
        return false;
      }

      console.log(`✅ Updating search enrichment for ${searchId} with ${Object.keys(enrichmentData).length} hotels`);
      return this.setSearchEnrichment(searchId, enrichmentData);
      
    } catch (error) {
      console.error(`Failed to update search enrichment for ${searchId}:`, error);
      return false;
    }
  }

  // Legacy method for backwards compatibility
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