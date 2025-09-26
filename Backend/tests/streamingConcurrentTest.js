#!/usr/bin/env node

/**
 * Concurrent Hotel Search Test Script
 * 
 * This script runs 10 concurrent searches against the StayGenie streaming API
 * to test performance, stability, and concurrent handling.
 * 
 * Usage: node concurrent_search_test.js
 */

// Handle different EventSource import patterns
let EventSource;
try {
  // Try destructured import first
  EventSource = require('eventsource').EventSource || require('eventsource');
} catch (error) {
  try {
    // Try direct import
    EventSource = require('eventsource');
  } catch (error2) {
    console.error('❌ Failed to import EventSource. Please install: npm install eventsource');
    process.exit(1);
  }
}

// Configuration
//const BASE_URL = "https://staygenie-wwpa.onrender.com";
const BASE_URL = "http://localhost:3003"; // Uncomment for local testing

const TEST_QUERIES = [
  "luxury hotel in Tokyo with pool and spa",
  "budget friendly hotel in Paris near Eiffel Tower",
  "beachfront resort in Bali for honeymoon",
  "family hotel in New York with kids facilities",
  "business hotel in London near financial district",
  "mountain resort in Switzerland with skiing",
  "boutique hotel in Rome near historic center",
  "eco-friendly lodge in Costa Rica",
  "desert resort in Dubai with private beach",
  "backpacker hostel in Amsterdam with breakfast",
  "luxury hotel in Tokyo with pool and spa",
  "budget friendly hotel in Paris near Eiffel Tower",
  "beachfront resort in Bali for honeymoon",
  "family hotel in New York with kids facilities",
  "business hotel in London near financial district",
  "mountain resort in Switzerland with skiing",
  "boutique hotel in Rome near historic center",
  "eco-friendly lodge in Costa Rica",
  "desert resort in Dubai with private beach",
  "backpacker hostel in Amsterdam with breakfast"
];

// Test metrics
const testMetrics = {
  totalSearches: 10,
  completedSearches: 0,
  failedSearches: 0,
  startTime: null,
  endTime: null,
  searchResults: [],
  errors: []
};

// Individual search function
async function runSingleSearch(searchQuery, searchIndex) {
  return new Promise((resolve, reject) => {
    const searchStartTime = Date.now();
    const searchMetrics = {
      index: searchIndex,
      query: searchQuery,
      startTime: searchStartTime,
      endTime: null,
      duration: null,
      hotelCount: 0,
      enhancedHotels: 0,
      steps: [],
      errors: [],
      success: false,
      searchId: null
    };

    console.log(`[${searchIndex}] Starting search: "${searchQuery}"`);

    try {
      const searchParams = new URLSearchParams({
        userInput: searchQuery,
        q: searchQuery
      });

      const sseUrl = `${BASE_URL}/api/hotels/search-and-match/stream?${searchParams.toString()}`;
      
      // Create EventSource connection
      const eventSource = new EventSource(sseUrl, {
        headers: {
          'Cache-Control': 'no-cache',
        }
      });

      // Connection timeout (30 seconds)
      const timeout = setTimeout(() => {
        console.log(`[${searchIndex}] ⏰ Search timeout after 30 seconds`);
        searchMetrics.errors.push('Timeout after 30 seconds');
        eventSource.close();
        reject(new Error('Search timeout'));
      }, 30000);

      // Handle SSE messages
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventType = data.type || 'message';

          switch (eventType) {
            case 'connected':
              console.log(`[${searchIndex}] 🔌 Connected: ${data.message}`);
              break;

            case 'progress':
              searchMetrics.steps.push({
                step: data.step,
                totalSteps: data.totalSteps,
                message: data.message,
                timestamp: Date.now()
              });
              console.log(`[${searchIndex}] 📈 Progress: Step ${data.step}/${data.totalSteps} - ${data.message}`);
              break;

            case 'hotel_found':
              searchMetrics.hotelCount++;
              console.log(`[${searchIndex}] 🏨 Hotel found: ${data.hotel?.name || 'Unknown'} (${data.hotelIndex}/${data.totalExpected})`);
              break;

            case 'hotel_enhanced':
              searchMetrics.enhancedHotels++;
              console.log(`[${searchIndex}] ✨ Hotel enhanced: ${data.hotel?.name || 'Unknown'}`);
              break;

            case 'complete':
              searchMetrics.endTime = Date.now();
              searchMetrics.duration = searchMetrics.endTime - searchMetrics.startTime;
              searchMetrics.success = true;
              searchMetrics.searchId = data.searchId;

              console.log(`[${searchIndex}] ✅ Search completed in ${searchMetrics.duration}ms`);
              console.log(`[${searchIndex}] 📊 Results: ${searchMetrics.hotelCount} hotels, ${searchMetrics.enhancedHotels} enhanced`);

              clearTimeout(timeout);
              eventSource.close();
              resolve(searchMetrics);
              break;

            case 'error':
              console.error(`[${searchIndex}] ❌ Server error: ${data.message}`);
              searchMetrics.errors.push(data.message);
              clearTimeout(timeout);
              eventSource.close();
              reject(new Error(data.message));
              break;

            default:
              console.log(`[${searchIndex}] 📝 Unknown event: ${eventType}`);
              break;
          }

        } catch (parseError) {
          console.warn(`[${searchIndex}] ⚠️ Failed to parse SSE data:`, parseError.message);
          searchMetrics.errors.push(`Parse error: ${parseError.message}`);
        }
      };

      // Handle connection errors
      eventSource.onerror = (error) => {
        console.error(`[${searchIndex}] ❌ SSE Connection error:`, error);
        searchMetrics.errors.push('SSE connection error');
        clearTimeout(timeout);
        eventSource.close();
        reject(new Error('SSE connection failed'));
      };

    } catch (error) {
      console.error(`[${searchIndex}] 💥 Search setup failed:`, error.message);
      searchMetrics.errors.push(`Setup error: ${error.message}`);
      reject(error);
    }
  });
}

// Main test function
async function runConcurrentSearchTest() {
  console.log('🚀 Starting Concurrent Hotel Search Test');
  console.log(`📊 Running ${testMetrics.totalSearches} concurrent searches`);
  console.log(`🎯 Target API: ${BASE_URL}`);
  console.log('=' * 60);

  testMetrics.startTime = Date.now();

  // Create array of search promises
  const searchPromises = TEST_QUERIES.map((query, index) => {
    return runSingleSearch(query, index + 1)
      .then(result => {
        testMetrics.completedSearches++;
        testMetrics.searchResults.push(result);
        return result;
      })
      .catch(error => {
        testMetrics.failedSearches++;
        testMetrics.errors.push({
          index: index + 1,
          query: query,
          error: error.message,
          timestamp: Date.now()
        });
        return null;
      });
  });

  // Wait for all searches to complete or fail
  console.log('⏳ Waiting for all searches to complete...\n');

  try {
    const results = await Promise.allSettled(searchPromises);
    testMetrics.endTime = Date.now();

    // Generate final report
    generateTestReport();

  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Generate comprehensive test report
function generateTestReport() {
  const totalDuration = testMetrics.endTime - testMetrics.startTime;
  const successfulResults = testMetrics.searchResults.filter(r => r !== null);
  
  console.log('\n' + '=' * 60);
  console.log('📋 CONCURRENT SEARCH TEST REPORT');
  console.log('=' * 60);

  // Overall Statistics
  console.log('\n📊 OVERALL STATISTICS:');
  console.log(`Total Searches: ${testMetrics.totalSearches}`);
  console.log(`Completed Successfully: ${testMetrics.completedSearches}`);
  console.log(`Failed: ${testMetrics.failedSearches}`);
  console.log(`Success Rate: ${((testMetrics.completedSearches / testMetrics.totalSearches) * 100).toFixed(1)}%`);
  console.log(`Total Test Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);

  if (successfulResults.length > 0) {
    // Performance Metrics
    const durations = successfulResults.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    console.log('\n⚡ PERFORMANCE METRICS:');
    console.log(`Average Search Duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`Fastest Search: ${minDuration}ms`);
    console.log(`Slowest Search: ${maxDuration}ms`);

    // Hotel Discovery Metrics
    const totalHotels = successfulResults.reduce((sum, r) => sum + r.hotelCount, 0);
    const totalEnhanced = successfulResults.reduce((sum, r) => sum + r.enhancedHotels, 0);
    const avgHotels = totalHotels / successfulResults.length;
    const avgEnhanced = totalEnhanced / successfulResults.length;

    console.log('\n🏨 HOTEL DISCOVERY METRICS:');
    console.log(`Total Hotels Found: ${totalHotels}`);
    console.log(`Total Enhanced Hotels: ${totalEnhanced}`);
    console.log(`Average Hotels per Search: ${avgHotels.toFixed(1)}`);
    console.log(`Average Enhanced per Search: ${avgEnhanced.toFixed(1)}`);
    console.log(`Enhancement Rate: ${totalHotels > 0 ? ((totalEnhanced / totalHotels) * 100).toFixed(1) : 0}%`);

    // Individual Search Results
    console.log('\n📋 INDIVIDUAL SEARCH RESULTS:');
    successfulResults.forEach(result => {
      console.log(`[${result.index}] "${result.query}"`);
      console.log(`    Duration: ${result.duration}ms | Hotels: ${result.hotelCount} | Enhanced: ${result.enhancedHotels} | Steps: ${result.steps.length}`);
      if (result.searchId) {
        console.log(`    Search ID: ${result.searchId}`);
      }
    });
  }

  // Error Analysis
  if (testMetrics.errors.length > 0) {
    console.log('\n❌ ERROR ANALYSIS:');
    testMetrics.errors.forEach(error => {
      console.log(`[${error.index}] "${error.query}"`);
      console.log(`    Error: ${error.error}`);
      console.log(`    Time: ${new Date(error.timestamp).toISOString()}`);
    });
  }

  // Concurrent Load Analysis
  console.log('\n🔄 CONCURRENT LOAD ANALYSIS:');
  console.log(`Peak Concurrent Connections: ${testMetrics.totalSearches}`);
  console.log(`Server Handled Concurrent Load: ${testMetrics.failedSearches === 0 ? 'YES ✅' : 'PARTIAL ⚠️'}`);
  
  if (successfulResults.length > 0) {
    const concurrentEfficiency = (testMetrics.completedSearches / testMetrics.totalSearches) * 100;
    console.log(`Concurrent Efficiency: ${concurrentEfficiency.toFixed(1)}%`);
    
    if (concurrentEfficiency >= 90) {
      console.log('🎉 Excellent concurrent performance!');
    } else if (concurrentEfficiency >= 75) {
      console.log('👍 Good concurrent performance');
    } else if (concurrentEfficiency >= 50) {
      console.log('⚠️  Moderate concurrent performance - may need optimization');
    } else {
      console.log('🚨 Poor concurrent performance - needs investigation');
    }
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (testMetrics.failedSearches > 0) {
    console.log('• Investigate failed searches and error handling');
    console.log('• Consider implementing retry logic for failed connections');
  }
  if (successfulResults.length > 0) {
    const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
    if (avgDuration > 15000) {
      console.log('• Search duration is high - consider performance optimization');
    }
    const totalEnhancedForRecommendation = successfulResults.reduce((sum, r) => sum + r.enhancedHotels, 0);
    const totalHotelsForRecommendation = successfulResults.reduce((sum, r) => sum + r.hotelCount, 0);
    if (totalHotelsForRecommendation > 0 && totalEnhancedForRecommendation / totalHotelsForRecommendation < 0.8) {
      console.log('• Enhancement rate could be improved');
    }
  }
  console.log('• Monitor server resources during peak concurrent load');
  console.log('• Consider implementing request queuing for high load scenarios');

  console.log('\n' + '=' * 60);
  console.log('✅ Test completed successfully!');
}

// Error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  runConcurrentSearchTest()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runConcurrentSearchTest,
  runSingleSearch,
  TEST_QUERIES
};