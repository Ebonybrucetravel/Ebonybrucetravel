import { Injectable } from '@nestjs/common';

/**
 * Cache service for flight search results
 *
 * Strategy:
 * - Cache offer requests by search parameters (origin, destination, date, etc.)
 * - Cache offers by offer_request_id
 * - TTL (Time To Live) based on offer expiry times
 * - In-memory cache (can be upgraded to Redis for production)
 *
 * Cache Keys:
 * - `flight_search:{hash}` - Cached offer request ID
 * - `offers:{offer_request_id}` - Cached offers for a request
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number; // Unix timestamp in milliseconds
  createdAt: number;
}

@Injectable()
export class CacheService {
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes default
  private readonly maxCacheSize = 1000; // Maximum number of cache entries

  /**
   * Generate cache key from search parameters
   */
  private generateSearchKey(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    cabinClass?: string;
    maxConnections?: number;
  }): string {
    const keyParts = [
      params.origin.toUpperCase(),
      params.destination.toUpperCase(),
      params.departureDate,
      params.returnDate || '',
      params.passengers.toString(),
      params.cabinClass || 'economy',
      params.maxConnections?.toString() || '1',
    ];
    return `flight_search:${keyParts.join(':')}`;
  }

  /**
   * Generate cache key for offers by offer request ID
   */
  private generateOffersKey(offerRequestId: string): string {
    return `offers:${offerRequestId}`;
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache data with TTL
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    const ttl = ttlMs || this.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    };

    this.cache.set(key, entry);
  }

  /**
   * Cache flight search result (offer request ID)
   */
  cacheSearchResult(
    params: {
      origin: string;
      destination: string;
      departureDate: string;
      returnDate?: string;
      passengers: number;
      cabinClass?: string;
      maxConnections?: number;
    },
    offerRequestId: string,
    ttlMs?: number,
  ): void {
    const key = this.generateSearchKey(params);
    this.set(key, offerRequestId, ttlMs);
  }

  /**
   * Get cached offer request ID for search
   */
  getCachedSearchResult(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    cabinClass?: string;
    maxConnections?: number;
  }): string | null {
    const key = this.generateSearchKey(params);
    return this.get<string>(key);
  }

  /**
   * Cache offers for an offer request
   */
  cacheOffers(offerRequestId: string, offers: any[], ttlMs?: number): void {
    const key = this.generateOffersKey(offerRequestId);
    this.set(key, offers, ttlMs);
  }

  /**
   * Get cached offers for an offer request
   */
  getCachedOffers(offerRequestId: string): any[] | null {
    const key = this.generateOffersKey(offerRequestId);
    return this.get<any[]>(key);
  }

  /**
   * Delete cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    entries: Array<{ key: string; age: number; expiresIn: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.createdAt,
      expiresIn: entry.expiresAt - now,
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      entries,
    };
  }

  /**
   * Evict oldest cache entries (FIFO)
   */
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);

    // Remove 10% of oldest entries
    const toRemove = Math.max(1, Math.floor(this.maxCacheSize * 0.1));
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Clean expired entries (can be called periodically)
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}
