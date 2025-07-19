const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_ENDPOINT = 'http://localhost:3003/api/hotels/smart';
const TOTAL_REQUESTS = 50;
const REQUEST_TIMEOUT = 60000; // 60 seconds
const DELAY_BETWEEN_REQUESTS = 500; // 500ms pause between requests

const TEST_QUERIES = [
  "Business hotel near downtown Chicago with meeting rooms for 1 night",
  "Luxury resort in Miami Beach with spa for 2 nights", 
  "Budget-friendly hotel in New York with free WiFi for 3 nights",
  "Family hotel in Orlando near theme parks for 4 nights",
  "Boutique hotel in San Francisco with rooftop bar for 1 night",
  "Airport hotel in Los Angeles with shuttle service for 1 night",
  "Historic hotel in Boston with elegant rooms for 2 nights",
  "Modern hotel in Seattle with fitness center for 3 nights",
  "Beachfront hotel in San Diego with ocean view for 2 nights",
  "Pet-friendly hotel in Austin with outdoor space for 1 night"
];

class SequentialTester {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.progressInterval = null;
  }

  async runSingleRequest(requestId) {
    const query = TEST_QUERIES[(requestId - 1) % TEST_QUERIES.length];
    const requestStart = Date.now();
    
    try {
      console.log(`🚀 Request ${requestId}/${TOTAL_REQUESTS}: "${query.substring(0, 40)}..."`);
      
      const response = await axios.post(API_ENDPOINT, 
        { userInput: query },
        { 
          timeout: REQUEST_TIMEOUT,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const requestEnd = Date.now();
      const duration = requestEnd - requestStart;
      
      const result = {
        requestId,
        query,
        status: 'success',
        statusCode: response.status,
        duration,
        timestamp: new Date().toISOString(),
        responseSize: JSON.stringify(response.data).length,
        hotelsFound: response.data?.totalHotelsFound || 0,
        hotelsWithRates: response.data?.hotelsWithRates || 0,
        aiRecommendations: response.data?.aiRecommendationsCount || 0,
        performanceData: response.data?.performance || null,
        stepBreakdown: response.data?.performance?.stepBreakdown || [],
        bottlenecks: response.data?.performance?.bottlenecks || [],
        searchParams: response.data?.searchParams || null
      };
      
      console.log(`✅ Request ${requestId}: Success in ${duration}ms (${result.aiRecommendations} recommendations, ${result.hotelsFound} hotels found)`);
      return result;
      
    } catch (error) {
      const requestEnd = Date.now();
      const duration = requestEnd - requestStart;
      
      const errorResult = {
        requestId,
        query,
        status: 'error',
        statusCode: error.response?.status || 0,
        duration,
        timestamp: new Date().toISOString(),
        error: error.message,
        errorType: error.code || 'UNKNOWN',
        responseSize: 0,
        hotelsFound: 0,
        hotelsWithRates: 0,
        aiRecommendations: 0,
        performanceData: null,
        stepBreakdown: [],
        bottlenecks: [],
        searchParams: null
      };
      
      console.log(`❌ Request ${requestId}: Failed in ${duration}ms - ${error.message}`);
      return errorResult;
    }
  }

  startProgressReporting() {
    this.progressInterval = setInterval(() => {
      const completed = this.results.length;
      const remaining = TOTAL_REQUESTS - completed;
      const elapsed = Date.now() - this.startTime;
      const avgTimePerRequest = completed > 0 ? elapsed / completed : 0;
      const estimatedTimeRemaining = avgTimePerRequest * remaining;
      
      console.log(`\n📊 Progress: ${completed}/${TOTAL_REQUESTS} completed (${((completed/TOTAL_REQUESTS)*100).toFixed(1)}%)`);
      console.log(`⏱️  Avg time per request: ${Math.round(avgTimePerRequest)}ms`);
      console.log(`🕐 Estimated time remaining: ${Math.round(estimatedTimeRemaining/1000)}s\n`);
    }, 10000); // Report every 10 seconds
  }

  stopProgressReporting() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  async runSequentialTest() {
    console.log(`🧪 Sequential Load Test Starting...`);
    console.log(`📍 Target: ${API_ENDPOINT}`);
    console.log(`📊 Plan: ${TOTAL_REQUESTS} requests, one after another`);
    console.log(`⏱️  Timeout: ${REQUEST_TIMEOUT}ms per request`);
    console.log(`⏸️  Delay: ${DELAY_BETWEEN_REQUESTS}ms between requests\n`);
    
    this.startProgressReporting();
    
    for (let i = 1; i <= TOTAL_REQUESTS; i++) {
      const result = await this.runSingleRequest(i);
      this.results.push(result);
      
      // Show real-time stats every 10 requests
      if (i % 10 === 0) {
        this.showIntermediateStats(i);
      }
      
      // Pause between requests (except for the last one)
      if (i < TOTAL_REQUESTS) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
    }
    
    this.stopProgressReporting();
    
    const totalDuration = Date.now() - this.startTime;
    console.log(`\n🏁 Sequential Test Complete in ${Math.round(totalDuration / 1000)}s`);
    
    return this.generateReport();
  }

  showIntermediateStats(completedRequests) {
    const recentResults = this.results.slice(-10);
    const successfulRecent = recentResults.filter(r => r.status === 'success');
    const avgRecentTime = successfulRecent.length > 0 ? 
      Math.round(successfulRecent.reduce((sum, r) => sum + r.duration, 0) / successfulRecent.length) : 0;
    
    console.log(`\n📈 ${completedRequests} requests completed - Recent 10 avg: ${avgRecentTime}ms, Success: ${successfulRecent.length}/10`);
  }

  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  createDistribution(durations) {
    const buckets = {
      '0-2s': 0,
      '2-5s': 0,
      '5-10s': 0,
      '10-20s': 0,
      '20-30s': 0,
      '30s+': 0
    };

    durations.forEach(duration => {
      const seconds = duration / 1000;
      if (seconds <= 2) buckets['0-2s']++;
      else if (seconds <= 5) buckets['2-5s']++;
      else if (seconds <= 10) buckets['5-10s']++;
      else if (seconds <= 20) buckets['10-20s']++;
      else if (seconds <= 30) buckets['20-30s']++;
      else buckets['30s+']++;
    });

    return buckets;
  }

  analyzeStepPerformance(successfulResults) {
    const stepStats = {};
    
    successfulResults.forEach(result => {
      if (result.stepBreakdown && Array.isArray(result.stepBreakdown)) {
        result.stepBreakdown.forEach(step => {
          if (!stepStats[step.step]) {
            stepStats[step.step] = {
              count: 0,
              totalDuration: 0,
              durations: []
            };
          }
          
          if (step.duration) {
            stepStats[step.step].count++;
            stepStats[step.step].totalDuration += step.duration;
            stepStats[step.step].durations.push(step.duration);
          }
        });
      }
    });

    const stepAnalysis = {};
    Object.keys(stepStats).forEach(stepName => {
      const stat = stepStats[stepName];
      if (stat.durations.length > 0) {
        stepAnalysis[stepName] = {
          count: stat.count,
          avgDuration: Math.round(stat.totalDuration / stat.count),
          minDuration: Math.min(...stat.durations),
          maxDuration: Math.max(...stat.durations),
          medianDuration: this.calculatePercentile(stat.durations, 50),
          p95Duration: this.calculatePercentile(stat.durations, 95)
        };
      }
    });

    return stepAnalysis;
  }

  analyzePerformanceOverTime(results) {
    const timeBlocks = [];
    const blockSize = 10; // Group into blocks of 10 requests
    
    for (let i = 0; i < results.length; i += blockSize) {
      const block = results.slice(i, i + blockSize);
      const successfulInBlock = block.filter(r => r.status === 'success');
      
      if (successfulInBlock.length > 0) {
        const avgDuration = successfulInBlock.reduce((sum, r) => sum + r.duration, 0) / successfulInBlock.length;
        const minDuration = Math.min(...successfulInBlock.map(r => r.duration));
        const maxDuration = Math.max(...successfulInBlock.map(r => r.duration));
        
        timeBlocks.push({
          blockNumber: Math.floor(i / blockSize) + 1,
          requestRange: `${i + 1}-${Math.min(i + blockSize, results.length)}`,
          successCount: successfulInBlock.length,
          totalCount: block.length,
          avgDuration: Math.round(avgDuration),
          minDuration,
          maxDuration,
          successRate: (successfulInBlock.length / block.length * 100).toFixed(1)
        });
      }
    }
    
    return timeBlocks;
  }

  generateReport() {
    const successfulResults = this.results.filter(r => r.status === 'success');
    const errorResults = this.results.filter(r => r.status === 'error');
    
    const durations = successfulResults.map(r => r.duration);
    
    const stats = {
      overview: {
        totalRequests: this.results.length,
        successfulRequests: successfulResults.length,
        failedRequests: errorResults.length,
        successRate: `${((successfulResults.length / this.results.length) * 100).toFixed(2)}%`,
        totalTestDuration: Date.now() - this.startTime,
        avgRequestInterval: DELAY_BETWEEN_REQUESTS
      },
      timing: durations.length > 0 ? {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        median: this.calculatePercentile(durations, 50),
        p90: this.calculatePercentile(durations, 90),
        p95: this.calculatePercentile(durations, 95),
        p99: this.calculatePercentile(durations, 99),
        standardDeviation: this.calculateStandardDeviation(durations)
      } : null,
      distribution: this.createDistribution(durations),
      performanceOverTime: this.analyzePerformanceOverTime(this.results),
      stepPerformance: this.analyzeStepPerformance(successfulResults),
      hotelDataAnalysis: this.analyzeHotelData(successfulResults),
      errorAnalysis: this.analyzeErrors(errorResults),
      consistency: this.analyzeConsistency(successfulResults),
      rawResults: this.results
    };

    return stats;
  }

  calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.round(Math.sqrt(avgSquareDiff));
  }

  analyzeConsistency(successfulResults) {
    if (successfulResults.length === 0) return null;
    
    const durations = successfulResults.map(r => r.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const stdDev = this.calculateStandardDeviation(durations);
    const coefficientOfVariation = (stdDev / avg * 100).toFixed(1);
    
    // Find outliers (more than 2 standard deviations from mean)
    const outliers = successfulResults.filter(r => 
      Math.abs(r.duration - avg) > 2 * stdDev
    );
    
    return {
      averageResponseTime: Math.round(avg),
      standardDeviation: stdDev,
      coefficientOfVariation: `${coefficientOfVariation}%`,
      outlierCount: outliers.length,
      consistencyRating: coefficientOfVariation < 20 ? 'Excellent' :
                        coefficientOfVariation < 40 ? 'Good' :
                        coefficientOfVariation < 60 ? 'Fair' : 'Poor',
      outliers: outliers.slice(0, 5).map(r => ({
        requestId: r.requestId,
        duration: r.duration,
        deviationFromAvg: Math.round(r.duration - avg)
      }))
    };
  }

  analyzeHotelData(successfulResults) {
    if (successfulResults.length === 0) {
      return { noSuccessfulRequests: true };
    }

    const hotelCounts = successfulResults.map(r => r.hotelsFound);
    const rateCounts = successfulResults.map(r => r.hotelsWithRates);
    const recCounts = successfulResults.map(r => r.aiRecommendations);

    return {
      totalHotelsFound: successfulResults.reduce((sum, r) => sum + r.hotelsFound, 0),
      totalHotelsWithRates: successfulResults.reduce((sum, r) => sum + r.hotelsWithRates, 0),
      totalRecommendations: successfulResults.reduce((sum, r) => sum + r.aiRecommendations, 0),
      avgHotelsFound: Math.round(hotelCounts.reduce((a, b) => a + b, 0) / hotelCounts.length),
      avgHotelsWithRates: Math.round(rateCounts.reduce((a, b) => a + b, 0) / rateCounts.length),
      avgRecommendations: Math.round(recCounts.reduce((a, b) => a + b, 0) / recCounts.length),
      hotelCountRange: `${Math.min(...hotelCounts)} - ${Math.max(...hotelCounts)}`,
      rateCountRange: `${Math.min(...rateCounts)} - ${Math.max(...rateCounts)}`,
      recommendationCountRange: `${Math.min(...recCounts)} - ${Math.max(...recCounts)}`
    };
  }

  analyzeErrors(errorResults) {
    const errorTypes = {};
    const statusCodes = {};

    errorResults.forEach(error => {
      const errorType = error.errorType || 'UNKNOWN';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;

      const statusCode = error.statusCode || 0;
      statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;
    });

    return {
      totalErrors: errorResults.length,
      errorTypes,
      statusCodes,
      sampleErrors: errorResults.slice(0, 5).map(e => ({
        requestId: e.requestId,
        error: e.error,
        statusCode: e.statusCode,
        duration: e.duration
      }))
    };
  }

  async saveResults(stats) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `sequential_hotel_test_${timestamp}.json`;
    const filePath = path.join(process.cwd(), fileName);
    
    const reportData = {
      testConfig: {
        totalRequests: TOTAL_REQUESTS,
        endpoint: API_ENDPOINT,
        timeout: REQUEST_TIMEOUT,
        delayBetweenRequests: DELAY_BETWEEN_REQUESTS,
        testType: 'sequential'
      },
      testMetadata: {
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform
      },
      results: stats
    };

    try {
      await fs.promises.writeFile(filePath, JSON.stringify(reportData, null, 2));
      console.log(`\n📄 Results saved to: ${fileName}`);
      return fileName;
    } catch (error) {
      console.error('❌ Failed to save results:', error.message);
      return null;
    }
  }

  printSummary(stats) {
    console.log('\n' + '='.repeat(70));
    console.log('📊 SEQUENTIAL LOAD TEST SUMMARY');
    console.log('='.repeat(70));
    
    console.log('\n📈 OVERVIEW:');
    console.log(`Total Requests: ${stats.overview.totalRequests}`);
    console.log(`Success Rate: ${stats.overview.successRate}`);
    console.log(`Test Duration: ${Math.round(stats.overview.totalTestDuration / 1000)}s`);
    
    if (stats.timing) {
      console.log('\n⏱️  RESPONSE TIMES:');
      console.log(`Average: ${stats.timing.avg}ms`);
      console.log(`Median: ${stats.timing.median}ms`);
      console.log(`95th percentile: ${stats.timing.p95}ms`);
      console.log(`99th percentile: ${stats.timing.p99}ms`);
      console.log(`Range: ${stats.timing.min}ms - ${stats.timing.max}ms`);
      console.log(`Std Deviation: ${stats.timing.standardDeviation}ms`);
    }
    
    console.log('\n📊 RESPONSE TIME DISTRIBUTION:');
    Object.entries(stats.distribution).forEach(([bucket, count]) => {
      const percentage = ((count / stats.overview.totalRequests) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(percentage / 2));
      console.log(`${bucket.padEnd(8)}: ${count.toString().padStart(3)} (${percentage}%) ${bar}`);
    });
    
    if (stats.consistency) {
      console.log('\n🎯 CONSISTENCY ANALYSIS:');
      console.log(`Rating: ${stats.consistency.consistencyRating}`);
      console.log(`Coefficient of Variation: ${stats.consistency.coefficientOfVariation}`);
      console.log(`Outliers: ${stats.consistency.outlierCount}/${stats.overview.successfulRequests}`);
    }
    
    if (stats.hotelDataAnalysis && !stats.hotelDataAnalysis.noSuccessfulRequests) {
      console.log('\n🏨 HOTEL DATA:');
      console.log(`Avg Hotels Found: ${stats.hotelDataAnalysis.avgHotelsFound} (range: ${stats.hotelDataAnalysis.hotelCountRange})`);
      console.log(`Avg Hotels with Rates: ${stats.hotelDataAnalysis.avgHotelsWithRates} (range: ${stats.hotelDataAnalysis.rateCountRange})`);
      console.log(`Avg AI Recommendations: ${stats.hotelDataAnalysis.avgRecommendations} (range: ${stats.hotelDataAnalysis.recommendationCountRange})`);
    }
    
    console.log('\n🏃‍♂️ TOP STEP PERFORMANCE:');
    const stepEntries = Object.entries(stats.stepPerformance);
    stepEntries
      .sort(([,a], [,b]) => b.avgDuration - a.avgDuration)
      .slice(0, 5)
      .forEach(([stepName, stepData]) => {
        console.log(`${stepName}: avg ${stepData.avgDuration}ms, p95 ${stepData.p95Duration}ms (${stepData.minDuration}-${stepData.maxDuration}ms)`);
      });
    
    console.log('\n📈 PERFORMANCE OVER TIME:');
    stats.performanceOverTime.slice(0, 5).forEach(block => {
      console.log(`Requests ${block.requestRange}: ${block.avgDuration}ms avg, ${block.successRate}% success`);
    });
    
    if (stats.errorAnalysis.totalErrors > 0) {
      console.log('\n❌ ERRORS:');
      console.log(`Total Errors: ${stats.errorAnalysis.totalErrors}`);
      if (Object.keys(stats.errorAnalysis.errorTypes).length > 0) {
        console.log('Error Types:', Object.entries(stats.errorAnalysis.errorTypes).map(([type, count]) => `${type}: ${count}`).join(', '));
      }
    }
    
    console.log('\n='.repeat(70));
  }
}

// Main execution
async function main() {
  console.log('🧪 Sequential Hotel Search Test Starting...\n');
  
  const tester = new SequentialTester();
  
  try {
    const stats = await tester.runSequentialTest();
    await tester.saveResults(stats);
    tester.printSummary(stats);
    
    console.log('\n✅ Sequential test completed successfully!');
    console.log('💡 This baseline data will help you optimize your API and understand its true performance characteristics.');
    
  } catch (error) {
    console.error('\n❌ Sequential test failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  main();
}

module.exports = SequentialTester;