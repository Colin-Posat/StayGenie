// FavoritesCache.ts - Updated with addedAt and location support
import AsyncStorage from '@react-native-async-storage/async-storage';

// Updated interface with flexible ID type
export interface FavoritedHotel {
  id: string;
  name: string;
  location?: string;     // Added for location-based sorting
  addedAt: string;       // Added for timestamp-based sorting
  image?: string;
  price?: number;
  rating?: number;
  description?: string;
  amenities?: string[];
  address?: string;
  city?: string;
  country?: string;
  [key: string]: any; // For any additional properties
}

export interface HotelToFavorite {
  id: string | number;   // Accept both string and number IDs
  name: string;
  location?: string;
  // Add other properties that come from your hotel data
  // This interface represents the hotel data before it becomes a favorite
  [key: string]: any;
}

class FavoritesCache {
  private static instance: FavoritesCache;
  private readonly STORAGE_KEY = '@favorites_cache';
  private readonly METADATA_KEY = '@favorites_metadata';
  private cache: Map<string, FavoritedHotel> = new Map();
  private isInitialized = false;
  private lastUpdated: number = 0;

  private constructor() {}

  static getInstance(): FavoritesCache {
    if (!FavoritesCache.instance) {
      FavoritesCache.instance = new FavoritesCache();
    }
    return FavoritesCache.instance;
  }

  // Initialize cache from AsyncStorage
  async initialize(): Promise<void> {
    try {
      console.log('Initializing FavoritesCache...');
      
      const [favoritesData, metadataData] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEY),
        AsyncStorage.getItem(this.METADATA_KEY)
      ]);

      // Load favorites
      if (favoritesData) {
        const favorites: FavoritedHotel[] = JSON.parse(favoritesData);
        this.cache.clear();
        
        // Migrate old favorites without addedAt
        favorites.forEach(hotel => {
          const hotelWithTimestamp: FavoritedHotel = {
            ...hotel,
            addedAt: hotel.addedAt || new Date().toISOString(),
            location: hotel.location || this.extractLocation(hotel),
          };
          this.cache.set(hotel.id, hotelWithTimestamp);
        });
        
        console.log(`✅ Loaded ${favorites.length} favorites from storage`);
      }

      // Load metadata
      if (metadataData) {
        const metadata = JSON.parse(metadataData);
        this.lastUpdated = metadata.lastUpdated || 0;
      }

      this.isInitialized = true;
      console.log('✅ FavoritesCache initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing FavoritesCache:', error);
      this.cache.clear();
      this.isInitialized = true; // Still mark as initialized to prevent blocking
      throw new Error('Failed to initialize favorites cache');
    }
  }

  // Helper method to normalize ID to string
  private normalizeId(id: string | number): string {
    return typeof id === 'number' ? id.toString() : id;
  }

  // Helper method to extract location from hotel data
  private extractLocation(hotel: any): string {
    return hotel.location || 
           hotel.city || 
           hotel.address || 
           hotel.country || 
           '';
  }

  // Add hotel to favorites with timestamp
  async addToFavorites(hotel: HotelToFavorite): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const normalizedId = this.normalizeId(hotel.id);
      const timestamp = new Date().toISOString();
      const favoritedHotel: FavoritedHotel = {
        ...hotel,
        id: normalizedId, // Always store as string
        addedAt: timestamp,
        location: hotel.location || this.extractLocation(hotel),
      };

      this.cache.set(normalizedId, favoritedHotel);
      await this.persistToStorage();
      
      console.log(`✅ Added ${hotel.name} to favorites at ${timestamp}`);
    } catch (error) {
      console.error('❌ Error adding to favorites:', error);
      throw new Error(`Failed to add ${hotel.name} to favorites`);
    }
  }

  // Remove hotel from favorites
  async removeFromFavorites(hotelId: string | number): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const normalizedId = this.normalizeId(hotelId);
      const hotel = this.cache.get(normalizedId);
      if (hotel) {
        this.cache.delete(normalizedId);
        await this.persistToStorage();
        console.log(`✅ Removed ${hotel.name} from favorites`);
      } else {
        console.warn(`⚠️ Hotel ${normalizedId} not found in favorites`);
      }
    } catch (error) {
      console.error('❌ Error removing from favorites:', error);
      throw new Error('Failed to remove hotel from favorites');
    }
  }

  // Toggle favorite status (add if not favorited, remove if favorited)
  async toggleFavorite(hotel: HotelToFavorite): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const normalizedId = this.normalizeId(hotel.id);
      const isCurrentlyFavorited = this.cache.has(normalizedId);
      
      if (isCurrentlyFavorited) {
        await this.removeFromFavorites(normalizedId);
        console.log(`Toggled OFF: ${hotel.name}`);
        return false; // Now not favorited
      } else {
        await this.addToFavorites(hotel);
        console.log(`Toggled ON: ${hotel.name}`);
        return true; // Now favorited
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      throw new Error(`Failed to toggle favorite status for ${hotel.name}`);
    }
  }

  // Check if hotel is favorited
  async isFavorited(hotelId: string | number): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      const normalizedId = this.normalizeId(hotelId);
      return this.cache.has(normalizedId);
    } catch (error) {
      console.error('❌ Error checking if favorited:', error);
      return false;
    }
  }

  // Get all favorites with enhanced sorting options
  async getAllFavorites(): Promise<FavoritedHotel[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const favorites = Array.from(this.cache.values());
      
      // Sort by addedAt descending (most recent first) as default
      return favorites.sort((a, b) => 
        new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      );
    } catch (error) {
      console.error('❌ Error getting all favorites:', error);
      throw new Error('Failed to load favorites');
    }
  }

  // Get favorites sorted by specific criteria
  async getFavoritesSorted(sortBy: 'recent' | 'name' | 'location' = 'recent'): Promise<FavoritedHotel[]> {
    try {
      const favorites = await this.getAllFavorites();
      
      return favorites.sort((a, b) => {
        switch (sortBy) {
          case 'recent':
            return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
          case 'name':
            return a.name.localeCompare(b.name);
          case 'location':
            return (a.location || '').localeCompare(b.location || '');
          default:
            return 0;
        }
      });
    } catch (error) {
      console.error('❌ Error getting sorted favorites:', error);
      throw new Error('Failed to load sorted favorites');
    }
  }

  // Get specific favorite by ID
  async getFavoriteById(hotelId: string | number): Promise<FavoritedHotel | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      const normalizedId = this.normalizeId(hotelId);
      return this.cache.get(normalizedId) || null;
    } catch (error) {
      console.error('❌ Error getting favorite by ID:', error);
      return null;
    }
  }

  // Get favorites count
  async getFavoritesCount(): Promise<number> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      return this.cache.size;
    } catch (error) {
      console.error('❌ Error getting favorites count:', error);
      return 0;
    }
  }

  // Get recent favorites (last N favorites)
  async getRecentFavorites(limit: number = 5): Promise<FavoritedHotel[]> {
    try {
      const allFavorites = await this.getFavoritesSorted('recent');
      return allFavorites.slice(0, limit);
    } catch (error) {
      console.error('❌ Error getting recent favorites:', error);
      return [];
    }
  }

  // Search favorites by name or location
  async searchFavorites(query: string): Promise<FavoritedHotel[]> {
    try {
      const allFavorites = await this.getAllFavorites();
      const searchTerm = query.toLowerCase().trim();
      
      if (!searchTerm) return allFavorites;
      
      return allFavorites.filter(hotel => 
        hotel.name.toLowerCase().includes(searchTerm) ||
        (hotel.location || '').toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('❌ Error searching favorites:', error);
      return [];
    }
  }

  // Clear all favorites
  async clearAllFavorites(): Promise<void> {
    try {
      this.cache.clear();
      await Promise.all([
        AsyncStorage.removeItem(this.STORAGE_KEY),
        AsyncStorage.removeItem(this.METADATA_KEY)
      ]);
      this.lastUpdated = Date.now();
      console.log('✅ Cleared all favorites');
    } catch (error) {
      console.error('❌ Error clearing favorites:', error);
      throw new Error('Failed to clear favorites');
    }
  }

  // Export favorites (for backup/sharing)
  async exportFavorites(): Promise<string> {
    try {
      const favorites = await this.getAllFavorites();
      return JSON.stringify({
        favorites,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      }, null, 2);
    } catch (error) {
      console.error('❌ Error exporting favorites:', error);
      throw new Error('Failed to export favorites');
    }
  }

  // Import favorites (from backup)
  async importFavorites(jsonData: string, merge: boolean = false): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      const importedFavorites: FavoritedHotel[] = data.favorites || [];
      
      if (!merge) {
        this.cache.clear();
      }
      
      importedFavorites.forEach(hotel => {
        const hotelWithDefaults: FavoritedHotel = {
          ...hotel,
          addedAt: hotel.addedAt || new Date().toISOString(),
          location: hotel.location || this.extractLocation(hotel),
        };
        this.cache.set(hotel.id, hotelWithDefaults);
      });
      
      await this.persistToStorage();
      console.log(`✅ Imported ${importedFavorites.length} favorites`);
    } catch (error) {
      console.error('❌ Error importing favorites:', error);
      throw new Error('Failed to import favorites');
    }
  }

  // Get cache statistics
  async getStats(): Promise<{
    totalFavorites: number;
    oldestFavorite?: string;
    newestFavorite?: string;
    favoritesByLocation: Record<string, number>;
  }> {
    try {
      const favorites = await this.getAllFavorites();
      
      if (favorites.length === 0) {
        return {
          totalFavorites: 0,
          favoritesByLocation: {},
        };
      }

      const sortedByDate = [...favorites].sort((a, b) => 
        new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
      );

      const favoritesByLocation = favorites.reduce((acc, hotel) => {
        const location = hotel.location || 'Unknown';
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalFavorites: favorites.length,
        oldestFavorite: sortedByDate[0]?.addedAt,
        newestFavorite: sortedByDate[sortedByDate.length - 1]?.addedAt,
        favoritesByLocation,
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return {
        totalFavorites: 0,
        favoritesByLocation: {},
      };
    }
  }

  // Private method to persist cache to storage
  private async persistToStorage(): Promise<void> {
    try {
      const favorites = Array.from(this.cache.values());
      const metadata = {
        lastUpdated: Date.now(),
        count: favorites.length,
      };

      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites)),
        AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata))
      ]);

      this.lastUpdated = metadata.lastUpdated;
      console.log(`💾 Persisted ${favorites.length} favorites to storage`);
    } catch (error) {
      console.error('❌ Error persisting to storage:', error);
      throw new Error('Failed to save favorites');
    }
  }

  // Get cache info for debugging
  getCacheInfo(): {
    isInitialized: boolean;
    cacheSize: number;
    lastUpdated: number;
  } {
    return {
      isInitialized: this.isInitialized,
      cacheSize: this.cache.size,
      lastUpdated: this.lastUpdated,
    };
  }
}

export default FavoritesCache;