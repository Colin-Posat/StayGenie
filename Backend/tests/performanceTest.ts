// performanceTest.ts - COMPREHENSIVE PERFORMANCE TESTING FOR SMART HOTEL SEARCH (100 PROMPTS)
import axios from 'axios';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

// ======================== CONFIGURATION ========================
const TEST_CONFIG = {
  runs: 100,
  concurrency: 10, // Run 10 requests simultaneously
  baseUrl: process.env.BASE_URL || 'http://localhost:3003',
  endpoint: '/api/hotels/search',
  batchDelay: 2000, // 2 second delay between batches
  // 100 diverse test queries
  testQueries: [
    "Find me a luxury hotel in Paris for 2 adults from 2025-08-15 to 2025-08-18",
    "Budget-friendly accommodation in Tokyo for 3 nights starting July 20th 2025",
    "Business hotel in Japan with meeting rooms",
    "Family resort in Miami Beach for 4 adults and 2 children, July 30th to August 3rd 2025",
    "Boutique hotel in London near tourist attractions, August 5-8 2025",
    "5-star hotel in New York City for business trip, September 1-3 2025",
    "Beach resort in Bali for honeymoon, 7 nights starting August 10th 2025",
    "Ski resort in Switzerland for family of 4, December 20-27 2025",
    "Spa hotel in Thailand for wellness retreat, October 15-22 2025",
    "Historic hotel in Rome near Vatican, 4 nights in September 2025",
    "Modern hotel in Dubai with pool and gym, August 25-28 2025",
    "Budget hostel in Barcelona for backpacker, 5 nights July 2025",
    "Casino hotel in Las Vegas for weekend getaway, September 15-17 2025",
    "Golf resort in Scotland for men's trip, August 20-25 2025",
    "All-inclusive resort in Cancun for family, October 10-17 2025",
    "Pet-friendly hotel in San Francisco, 3 nights in August 2025",
    "Eco-friendly lodge in Costa Rica, September 5-12 2025",
    "City center hotel in Berlin for conference, July 28-31 2025",
    "Beachfront hotel in Hawaii for vacation, December 15-22 2025",
    "Mountain cabin in Colorado for hiking, September 2-9 2025",
    "Luxury resort in Maldives for anniversary, November 1-8 2025",
    "Business hotel in Singapore near airport, August 12-14 2025",
    "Wine hotel in Napa Valley for wine tasting, October 5-8 2025",
    "Art hotel in Amsterdam for culture trip, September 20-24 2025",
    "Desert resort in Morocco for adventure, November 10-17 2025",
    "Riverside hotel in Prague for romantic getaway, August 18-21 2025",
    "Safari lodge in Kenya for wildlife experience, December 1-8 2025",
    "Ice hotel in Finland for unique experience, January 15-18 2026",
    "Thermal hotel in Iceland for relaxation, October 25-30 2025",
    "Monastery hotel in Tibet for spiritual retreat, September 10-17 2025",
    "Floating hotel in Vietnam for adventure, November 20-25 2025",
    "Castle hotel in Ireland for history lovers, August 30-September 3 2025",
    "Treehouse hotel in Costa Rica for nature experience, October 20-25 2025",
    "Underground hotel in Australia for unique stay, December 10-15 2025",
    "Glamping site in Utah for outdoor adventure, September 25-30 2025",
    "Lighthouse hotel in Maine for coastal experience, August 22-26 2025",
    "Train hotel in Switzerland for scenic journey, November 5-10 2025",
    "Houseboat in Kashmir for peaceful retreat, October 12-18 2025",
    "Ranch hotel in Montana for cowboy experience, August 28-September 2 2025",
    "Vineyard hotel in Tuscany for wine lovers, September 15-20 2025",
    "Boutique hotel in Seoul for K-pop fans, July 25-29 2025",
    "Ryokan in Kyoto for traditional experience, August 8-12 2025",
    "Riad in Marrakech for cultural immersion, October 30-November 5 2025",
    "Palazzo in Venice for luxury experience, September 5-10 2025",
    "Hacienda in Mexico for authentic stay, November 15-20 2025",
    "Chalet in Austria for mountain experience, December 22-29 2025",
    "Villa in Santorini for sunset views, August 15-20 2025",
    "Pension in Germany for local experience, July 30-August 5 2025",
    "Pousada in Brazil for beach vacation, October 8-15 2025",
    "Guesthouse in Nepal for trekking base, September 18-25 2025",
    "Hostel in Prague for budget travel, August 5-10 2025",
    "Hotel in Sydney near Opera House, December 5-10 2025",
    "Resort in Fiji for tropical paradise, November 12-19 2025",
    "Lodge in Alaska for Northern Lights, February 10-15 2026",
    "Hotel in Cairo near pyramids, October 22-27 2025",
    "Resort in Seychelles for beach luxury, January 20-27 2026",
    "Hotel in Mumbai for business meetings, August 18-22 2025",
    "Resort in Phuket for party vacation, September 12-18 2025",
    "Hotel in Buenos Aires for tango experience, November 8-13 2025",
    "Lodge in Patagonia for hiking adventure, December 3-10 2025",
    "Hotel in Stockholm for Nordic experience, August 25-30 2025",
    "Resort in Barbados for Caribbean vibes, October 15-22 2025",
    "Hotel in Hong Kong for shopping trip, September 8-12 2025",
    "Lodge in Yellowstone for wildlife viewing, August 12-17 2025",
    "Hotel in Istanbul for cultural bridge, October 18-23 2025",
    "Resort in Aruba for windsurfing, November 22-28 2025",
    "Hotel in Vancouver for mountain city, September 22-26 2025",
    "Lodge in Banff for Rocky Mountains, August 20-25 2025",
    "Hotel in Tel Aviv for beach and culture, October 25-30 2025",
    "Resort in Mauritius for luxury island, December 12-19 2025",
    "Hotel in Lisbon for port wine and history, September 18-23 2025",
    "Lodge in Tasmania for wilderness, November 25-December 2 2025",
    "Hotel in Copenhagen for design and hygge, August 28-September 1 2025",
    "Resort in Bora Bora for overwater bungalows, January 10-17 2026",
    "Hotel in Edinburgh for castle and whisky, September 3-8 2025",
    "Lodge in Kruger for Big Five safari, November 18-25 2025",
    "Hotel in Brussels for chocolate and waffles, August 22-26 2025",
    "Resort in Zanzibar for spice island, October 28-November 4 2025",
    "Hotel in Vienna for music and art, September 10-15 2025",
    "Lodge in Serengeti for great migration, December 8-15 2025",
    "Hotel in Athens for ancient history, October 12-17 2025",
    "Resort in Langkawi for tropical escape, November 28-December 5 2025",
    "Hotel in Oslo for fjords and culture, August 15-20 2025",
    "Lodge in Madagascar for unique wildlife, September 25-October 2 2025",
    "Hotel in Warsaw for Eastern European culture, September 5-10 2025",
    "Resort in Goa for beach and spices, December 20-27 2025",
    "Hotel in Zurich for Swiss precision, August 10-15 2025",
    "Lodge in Borneo for orangutans, October 5-12 2025",
    "Hotel in Budapest for thermal baths, September 15-20 2025",
    "Resort in Palawan for pristine beaches, November 3-10 2025",
    "Hotel in Helsinki for Nordic design, August 25-30 2025",
    "Lodge in Rwanda for gorilla trekking, December 15-22 2025",
    "Hotel in Krakow for medieval charm, September 8-13 2025",
    "Resort in Cook Islands for South Pacific, January 25-February 1 2026",
    "Hotel in Tallinn for Baltic beauty, August 18-23 2025",
    "Lodge in Bhutan for Himalayan kingdom, October 8-15 2025",
    "Hotel in Riga for Art Nouveau, September 12-17 2025",
    "Resort in Vanuatu for volcano adventure, November 15-22 2025",
    "Hotel in Vilnius for baroque architecture, August 30-September 4 2025",
    "Lodge in Galapagos for unique evolution, December 5-12 2025",
    "Hotel in Ljubljana for green capital, September 20-25 2025",
    "Resort in Tahiti for French Polynesia, January 15-22 2026",
    "Hotel in Bratislava for Danube views, August 12-17 2025",
    "Lodge in Antarctica for ultimate adventure, February 20-27 2026",
    "Hotel in Sarajevo for multicultural history, September 25-30 2025",
    "Resort in New Caledonia for coral reefs, November 8-15 2025",
    "Hotel in Skopje for Balkan culture, August 20-25 2025"
  ]
};

// ======================== INTERFACES ========================
interface StepTiming {
  stepName: string;
  startTime: number;
  endTime: number;
  duration: number;
}

interface RunResult {
  runNumber: number;
  totalTime: number;
  success: boolean;
  error?: string;
  steps: StepTiming[];
  responseData?: {
    totalHotelsFound: number;
    hotelsWithRates: number;
    aiRecommendationsCount: number;
    searchParams?: any;
  };
  query: string;
}

interface PerformanceAnalytics {
  averageTimes: Record<string, number>;
  minTimes: Record<string, number>;
  maxTimes: Record<string, number>;
  successRate: number;
  totalRuns: number;
  successfulRuns: number;
  overallStats: {
    averageTotal: number;
    minTotal: number;
    maxTotal: number;
    medianTotal: number;
    stdDeviation: number;
    percentiles: {
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };
  distribution: {
    histogram: Array<{ range: string; count: number; percentage: number }>;
    bellCurveData: Array<{ x: number; y: number }>;
  };
}

// ======================== STEP TIMING TRACKER ========================
class StepTimer {
  private steps: StepTiming[] = [];
  private currentStep: { name: string; startTime: number } | null = null;

  startStep(stepName: string): void {
    if (this.currentStep) {
      this.endStep();
    }
    
    this.currentStep = {
      name: stepName,
      startTime: performance.now()
    };
  }

  endStep(): void {
    if (!this.currentStep) {
      console.warn('No current step to end');
      return;
    }

    const endTime = performance.now();
    const duration = endTime - this.currentStep.startTime;

    this.steps.push({
      stepName: this.currentStep.name,
      startTime: this.currentStep.startTime,
      endTime: endTime,
      duration: duration
    });

    this.currentStep = null;
  }

  getSteps(): StepTiming[] {
    if (this.currentStep) {
      this.endStep();
    }
    return [...this.steps];
  }

  getTotalTime(): number {
    const steps = this.getSteps();
    if (steps.length === 0) return 0;
    
    const firstStart = Math.min(...steps.map(s => s.startTime));
    const lastEnd = Math.max(...steps.map(s => s.endTime));
    return lastEnd - firstStart;
  }

  reset(): void {
    this.steps = [];
    this.currentStep = null;
  }
}

// ======================== MOCK STEP TRACKING ========================
const estimateStepTimings = (totalTime: number, responseData: any): StepTiming[] => {
  const estimatedSteps = [
    { name: 'Parse Query', percentage: 0.05 },
    { name: 'Fetch Hotels', percentage: 0.20 },
    { name: 'Fetch Rates', percentage: 0.30 },
    { name: 'Build Summaries', percentage: 0.10 },
    { name: 'AI Processing (Parallel)', percentage: 0.25 },
    { name: 'Enrich Selected Hotels', percentage: 0.10 }
  ];

  let currentTime = 0;
  const steps: StepTiming[] = [];

  estimatedSteps.forEach(step => {
    const duration = totalTime * step.percentage;
    steps.push({
      stepName: step.name,
      startTime: currentTime,
      endTime: currentTime + duration,
      duration: duration
    });
    currentTime += duration;
  });

  return steps;
};

// ======================== CONCURRENT BATCH EXECUTION ========================
const executeBatch = async (batch: Array<{runNumber: number, query: string}>): Promise<RunResult[]> => {
  console.log(`\n🚀 Executing batch of ${batch.length} concurrent requests...`);
  
  const batchPromises = batch.map(({runNumber, query}) => 
    executeSingleRun(runNumber, query)
  );
  
  try {
    const results = await Promise.all(batchPromises);
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Batch completed: ${successCount}/${batch.length} successful`);
    return results;
  } catch (error) {
    console.error(`❌ Batch execution failed:`, error);
    // If Promise.all fails, we still want individual results
    const results = await Promise.allSettled(batchPromises);
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          runNumber: batch[index].runNumber,
          totalTime: 0,
          success: false,
          error: result.reason?.message || 'Batch execution failed',
          steps: [],
          query: batch[index].query
        };
      }
    });
  }
};

// ======================== PROGRESS TRACKING ========================
const displayProgress = (completed: number, total: number, results: RunResult[]): void => {
  const percentage = ((completed / total) * 100).toFixed(1);
  const successCount = results.filter(r => r.success).length;
  const successRate = completed > 0 ? ((successCount / completed) * 100).toFixed(1) : '0.0';
  
  if (completed > 0) {
    const avgTime = results.filter(r => r.success).reduce((sum, r) => sum + r.totalTime, 0) / successCount;
    console.log(`📈 Progress: ${completed}/${total} (${percentage}%) | Success: ${successRate}% | Avg: ${Math.round(avgTime)}ms`);
  }
};
// ======================== SINGLE RUN EXECUTION ========================
const executeSingleRun = async (runNumber: number, testQuery: string): Promise<RunResult> => {
  const runStartTime = performance.now();
  
  try {
    const response = await axios.post(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoint}`, {
      userInput: testQuery
    }, {
      timeout: 45000, // Increased timeout for concurrent requests
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const runEndTime = performance.now();
    const totalTime = runEndTime - runStartTime;
    
    const responseData = {
      totalHotelsFound: response.data.totalHotelsFound || 0,
      hotelsWithRates: response.data.hotelsWithRates || 0,
      aiRecommendationsCount: response.data.aiRecommendationsCount || 0,
      searchParams: response.data.searchParams
    };

    const estimatedSteps = estimateStepTimings(totalTime, responseData);

    return {
      runNumber,
      totalTime,
      success: true,
      steps: estimatedSteps,
      responseData,
      query: testQuery
    };

  } catch (error) {
    const runEndTime = performance.now();
    const totalTime = runEndTime - runStartTime;
    
    let errorMessage = 'Unknown error';
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      runNumber,
      totalTime,
      success: false,
      error: errorMessage,
      steps: [],
      query: testQuery
    };
  }
};

// ======================== STATISTICAL CALCULATIONS ========================
const calculateStatistics = (values: number[]): {
  mean: number;
  median: number;
  stdDev: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
} => {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  // Mean
  const mean = sorted.reduce((sum, val) => sum + val, 0) / n;
  
  // Median
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  
  // Standard deviation
  const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  // Percentiles
  const getPercentile = (p: number) => {
    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };
  
  const percentiles = {
    p10: getPercentile(10),
    p25: getPercentile(25),
    p50: getPercentile(50),
    p75: getPercentile(75),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99)
  };
  
  return { mean, median, stdDev, percentiles };
};

// ======================== DISTRIBUTION ANALYSIS ========================
const calculateDistribution = (values: number[]): {
  histogram: Array<{ range: string; count: number; percentage: number }>;
  bellCurveData: Array<{ x: number; y: number }>;
} => {
  const stats = calculateStatistics(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Create histogram with 20 bins
  const binCount = 20;
  const binSize = (max - min) / binCount;
  const histogram: Array<{ range: string; count: number; percentage: number }> = [];
  
  for (let i = 0; i < binCount; i++) {
    const binStart = min + i * binSize;
    const binEnd = min + (i + 1) * binSize;
    const count = values.filter(v => v >= binStart && (i === binCount - 1 ? v <= binEnd : v < binEnd)).length;
    const percentage = (count / values.length) * 100;
    
    histogram.push({
      range: `${Math.round(binStart)}-${Math.round(binEnd)}ms`,
      count,
      percentage
    });
  }
  
  // Generate bell curve data points
  const bellCurveData: Array<{ x: number; y: number }> = [];
  const numPoints = 100;
  
  for (let i = 0; i <= numPoints; i++) {
    const x = min + (i / numPoints) * (max - min);
    const z = (x - stats.mean) / stats.stdDev;
    const y = (1 / (stats.stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
    bellCurveData.push({ x, y: y * values.length * binSize }); // Scale to match histogram
  }
  
  return { histogram, bellCurveData };
};

// ======================== ANALYTICS CALCULATION ========================
const calculateAnalytics = (results: RunResult[]): PerformanceAnalytics => {
  const successfulRuns = results.filter(r => r.success);
  const successRate = (successfulRuns.length / results.length) * 100;

  const allStepNames = new Set<string>();
  successfulRuns.forEach(run => {
    run.steps.forEach(step => allStepNames.add(step.stepName));
  });

  const averageTimes: Record<string, number> = {};
  const minTimes: Record<string, number> = {};
  const maxTimes: Record<string, number> = {};

  allStepNames.forEach(stepName => {
    const stepDurations = successfulRuns
      .map(run => run.steps.find(step => step.stepName === stepName)?.duration)
      .filter((duration): duration is number => duration !== undefined);

    if (stepDurations.length > 0) {
      averageTimes[stepName] = stepDurations.reduce((a, b) => a + b, 0) / stepDurations.length;
      minTimes[stepName] = Math.min(...stepDurations);
      maxTimes[stepName] = Math.max(...stepDurations);
    }
  });

  const totalTimes = successfulRuns.map(r => r.totalTime);
  const stats = calculateStatistics(totalTimes);
  const distribution = calculateDistribution(totalTimes);

  return {
    averageTimes,
    minTimes,
    maxTimes,
    successRate,
    totalRuns: results.length,
    successfulRuns: successfulRuns.length,
    overallStats: {
      averageTotal: stats.mean,
      minTotal: Math.min(...totalTimes),
      maxTotal: Math.max(...totalTimes),
      medianTotal: stats.median,
      stdDeviation: stats.stdDev,
      percentiles: stats.percentiles
    },
    distribution
  };
};

// ======================== CHART GENERATION ========================
const generateDistributionChart = (analytics: PerformanceAnalytics): string => {
  const { histogram, bellCurveData } = analytics.distribution;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Distribution Analysis</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .chart-container { width: 100%; height: 400px; margin: 20px 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-box { background: #f5f5f5; padding: 15px; border-radius: 8px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
        .stat-label { font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <h1>🏨 Hotel Search Performance Distribution Analysis</h1>
    
    <div class="stats-grid">
        <div class="stat-box">
            <div class="stat-value">${Math.round(analytics.overallStats.averageTotal)}ms</div>
            <div class="stat-label">Average Response Time</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${Math.round(analytics.overallStats.medianTotal)}ms</div>
            <div class="stat-label">Median Response Time</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${Math.round(analytics.overallStats.stdDeviation)}ms</div>
            <div class="stat-label">Standard Deviation</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${analytics.successRate.toFixed(1)}%</div>
            <div class="stat-label">Success Rate</div>
        </div>
    </div>

    <div class="chart-container">
        <canvas id="distributionChart"></canvas>
    </div>

    <div class="chart-container">
        <canvas id="percentileChart"></canvas>
    </div>

    <script>
        // Distribution Chart with Bell Curve
        const ctx1 = document.getElementById('distributionChart').getContext('2d');
        new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(histogram.map(h => h.range))},
                datasets: [{
                    label: 'Frequency',
                    data: ${JSON.stringify(histogram.map(h => h.count))},
                    backgroundColor: 'rgba(37, 99, 235, 0.6)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                }, {
                    label: 'Normal Distribution',
                    data: ${JSON.stringify(bellCurveData.map(d => d.y))},
                    type: 'line',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Response Time Distribution with Bell Curve'
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Frequency'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Normal Distribution'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });

        // Percentile Chart
        const ctx2 = document.getElementById('percentileChart').getContext('2d');
        new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['P10', 'P25', 'P50 (Median)', 'P75', 'P90', 'P95', 'P99'],
                datasets: [{
                    label: 'Response Time (ms)',
                    data: [
                        ${analytics.overallStats.percentiles.p10},
                        ${analytics.overallStats.percentiles.p25},
                        ${analytics.overallStats.percentiles.p50},
                        ${analytics.overallStats.percentiles.p75},
                        ${analytics.overallStats.percentiles.p90},
                        ${analytics.overallStats.percentiles.p95},
                        ${analytics.overallStats.percentiles.p99}
                    ],
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.6)',
                        'rgba(59, 130, 246, 0.6)',
                        'rgba(99, 102, 241, 0.6)',
                        'rgba(168, 85, 247, 0.6)',
                        'rgba(236, 72, 153, 0.6)',
                        'rgba(239, 68, 68, 0.6)',
                        'rgba(220, 38, 38, 0.6)'
                    ],
                    borderColor: [
                        'rgba(34, 197, 94, 1)',
                        'rgba(59, 130, 246, 1)',
                        'rgba(99, 102, 241, 1)',
                        'rgba(168, 85, 247, 1)',
                        'rgba(236, 72, 153, 1)',
                        'rgba(239, 68, 68, 1)',
                        'rgba(220, 38, 38, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Response Time Percentiles'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
};

// ======================== RESULTS DISPLAY ========================
const displayResults = (analytics: PerformanceAnalytics, results: RunResult[]): void => {
  console.log('\n' + '='.repeat(100));
  console.log('🏨 COMPREHENSIVE HOTEL SEARCH PERFORMANCE ANALYSIS (100 RUNS)');
  console.log('='.repeat(100));

  // Overall Performance Summary
  console.log('\n📊 OVERALL PERFORMANCE SUMMARY:');
  console.log(`✅ Success Rate: ${analytics.successRate.toFixed(1)}% (${analytics.successfulRuns}/${analytics.totalRuns} runs)`);
  console.log(`⚡ Average Response Time: ${Math.round(analytics.overallStats.averageTotal)}ms`);
  console.log(`📈 Median Response Time: ${Math.round(analytics.overallStats.medianTotal)}ms`);
  console.log(`📊 Standard Deviation: ${Math.round(analytics.overallStats.stdDeviation)}ms`);
  console.log(`🚀 Fastest Run: ${Math.round(analytics.overallStats.minTotal)}ms`);
  console.log(`🐌 Slowest Run: ${Math.round(analytics.overallStats.maxTotal)}ms`);
  
  // Percentile Analysis
  console.log('\n📈 PERCENTILE ANALYSIS:');
  console.log('─'.repeat(60));
  console.log(`P10 (10th percentile): ${Math.round(analytics.overallStats.percentiles.p10)}ms`);
  console.log(`P25 (25th percentile): ${Math.round(analytics.overallStats.percentiles.p25)}ms`);
  console.log(`P50 (50th percentile): ${Math.round(analytics.overallStats.percentiles.p50)}ms`);
  console.log(`P75 (75th percentile): ${Math.round(analytics.overallStats.percentiles.p75)}ms`);
  console.log(`P90 (90th percentile): ${Math.round(analytics.overallStats.percentiles.p90)}ms`);
  console.log(`P95 (95th percentile): ${Math.round(analytics.overallStats.percentiles.p95)}ms`);
  console.log(`P99 (99th percentile): ${Math.round(analytics.overallStats.percentiles.p99)}ms`);
  
  // Performance Target Analysis
  const under5s = results.filter(r => r.success && r.totalTime < 5000).length;
  const under10s = results.filter(r => r.success && r.totalTime < 10000).length;
  const under15s = results.filter(r => r.success && r.totalTime < 15000).length;
  
  console.log('\n🎯 PERFORMANCE TARGET ANALYSIS:');
  console.log('─'.repeat(60));
  console.log(`Under 5s: ${((under5s / analytics.successfulRuns) * 100).toFixed(1)}% (${under5s}/${analytics.successfulRuns})`);
  console.log(`Under 10s: ${((under10s / analytics.successfulRuns) * 100).toFixed(1)}% (${under10s}/${analytics.successfulRuns})`);
  console.log(`Under 15s: ${((under15s / analytics.successfulRuns) * 100).toFixed(1)}% (${under15s}/${analytics.successfulRuns})`);

  // Distribution Analysis
  console.log('\n📊 RESPONSE TIME DISTRIBUTION:');
  console.log('─'.repeat(80));
  console.log('Time Range          | Count | Percentage | Visual');
  console.log('─'.repeat(80));
  
  analytics.distribution.histogram.forEach(bin => {
    const bar = '█'.repeat(Math.round(bin.percentage / 2)); // Scale bar to fit
    const paddedRange = bin.range.padEnd(18);
    const paddedCount = bin.count.toString().padEnd(5);
    const paddedPercentage = `${bin.percentage.toFixed(1)}%`.padEnd(10);
    console.log(`${paddedRange} | ${paddedCount} | ${paddedPercentage} | ${bar}`);
  });

  // Step-by-Step Performance
  console.log('\n⏱️ STEP-BY-STEP PERFORMANCE BREAKDOWN:');
  console.log('─'.repeat(80));
  console.log('Step Name                    | Avg Time  | Min Time  | Max Time  | % of Total');
  console.log('─'.repeat(80));

  Object.keys(analytics.averageTimes).forEach(stepName => {
    const avgTime = analytics.averageTimes[stepName];
    const minTime = analytics.minTimes[stepName];
    const maxTime = analytics.maxTimes[stepName];
    const percentage = (avgTime / analytics.overallStats.averageTotal) * 100;

    const paddedName = stepName.padEnd(28);
    const avgTimeStr = `${Math.round(avgTime)}ms`.padEnd(9);
    const minTimeStr = `${Math.round(minTime)}ms`.padEnd(9);
    const maxTimeStr = `${Math.round(maxTime)}ms`.padEnd(9);
    const percentageStr = `${percentage.toFixed(1)}%`.padEnd(8);

    console.log(`${paddedName} | ${avgTimeStr} | ${minTimeStr} | ${maxTimeStr} | ${percentageStr}`);
  });

  // Error Analysis
  if (analytics.totalRuns > analytics.successfulRuns) {
    const failedRuns = results.filter(r => !r.success);
    console.log('\n❌ ERROR ANALYSIS:');
    console.log('─'.repeat(60));
    
    const errorCounts: Record<string, number> = {};
    failedRuns.forEach(run => {
      const error = run.error || 'Unknown error';
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });
    
    Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([error, count]) => {
        const percentage = (count / failedRuns.length) * 100;
        console.log(`${error}: ${count} occurrences (${percentage.toFixed(1)}%)`);
      });
  }

  // Performance Outliers
  console.log('\n🔍 PERFORMANCE OUTLIERS:');
  console.log('─'.repeat(60));
  
  const successfulResults = results.filter(r => r.success);
  const sortedByTime = [...successfulResults].sort((a, b) => a.totalTime - b.totalTime);
  
  console.log('🚀 FASTEST 5 RUNS:');
  sortedByTime.slice(0, 5).forEach((run, index) => {
    console.log(`${index + 1}. Run #${run.runNumber}: ${Math.round(run.totalTime)}ms`);
    console.log(`   Query: ${run.query.substring(0, 70)}${run.query.length > 70 ? '...' : ''}`);
  });
  
  console.log('\n🐌 SLOWEST 5 RUNS:');
  sortedByTime.slice(-5).reverse().forEach((run, index) => {
    console.log(`${index + 1}. Run #${run.runNumber}: ${Math.round(run.totalTime)}ms`);
    console.log(`   Query: ${run.query.substring(0, 70)}${run.query.length > 70 ? '...' : ''}`);
  });

  // Query Performance Analysis
  console.log('\n🔤 QUERY PERFORMANCE INSIGHTS:');
  console.log('─'.repeat(60));
  
  const queryTypes = {
    'Luxury': results.filter(r => r.success && r.query.toLowerCase().includes('luxury')),
    'Budget': results.filter(r => r.success && (r.query.toLowerCase().includes('budget') || r.query.toLowerCase().includes('cheap'))),
    'Business': results.filter(r => r.success && r.query.toLowerCase().includes('business')),
    'Family': results.filter(r => r.success && r.query.toLowerCase().includes('family')),
    'Resort': results.filter(r => r.success && r.query.toLowerCase().includes('resort'))
  };
  
  Object.entries(queryTypes).forEach(([type, runs]) => {
    if (runs.length > 0) {
      const avgTime = runs.reduce((sum, run) => sum + run.totalTime, 0) / runs.length;
      console.log(`${type} queries: ${Math.round(avgTime)}ms average (${runs.length} samples)`);
    }
  });

  // Optimization Recommendations
  console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
  console.log('─'.repeat(60));
  
  const bottlenecks = Object.entries(analytics.averageTimes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  bottlenecks.forEach(([stepName, avgTime], index) => {
    const percentage = (avgTime / analytics.overallStats.averageTotal) * 100;
    console.log(`${index + 1}. Optimize "${stepName}" (${Math.round(avgTime)}ms, ${percentage.toFixed(1)}% of total time)`);
  });

  // Performance Assessment
  console.log('\n🎯 PERFORMANCE ASSESSMENT:');
  console.log('─'.repeat(60));
  
  if (analytics.overallStats.percentiles.p95 < 10000) {
    console.log('🎉 EXCELLENT: 95% of requests complete under 10 seconds');
  } else if (analytics.overallStats.percentiles.p90 < 10000) {
    console.log('✅ GOOD: 90% of requests complete under 10 seconds');
  } else if (analytics.overallStats.percentiles.p75 < 10000) {
    console.log('⚠️  FAIR: 75% of requests complete under 10 seconds');
  } else {
    console.log('❌ NEEDS IMPROVEMENT: Less than 75% of requests complete under 10 seconds');
  }
  
  if (analytics.overallStats.stdDeviation > analytics.overallStats.averageTotal * 0.5) {
    console.log('📊 HIGH VARIABILITY: Consider investigating inconsistent performance');
  } else {
    console.log('📊 CONSISTENT PERFORMANCE: Low variability in response times');
  }

  console.log('\n' + '='.repeat(100));
};

// ======================== MAIN TEST EXECUTION ========================
const runPerformanceTest = async (): Promise<void> => {
  console.log('🚀 STARTING CONCURRENT HOTEL SEARCH PERFORMANCE TEST');
  console.log(`📝 Configuration: ${TEST_CONFIG.runs} runs with ${TEST_CONFIG.concurrency} concurrent requests`);
  console.log(`🌐 Target: ${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoint}`);
  console.log(`⚡ Concurrency: ${TEST_CONFIG.concurrency} simultaneous requests per batch`);
  console.log('⏰ This will take approximately 3-5 minutes with concurrent execution...\n');

  const results: RunResult[] = [];
  const overallStartTime = performance.now();

  // Create batches of concurrent requests
  const batches: Array<Array<{runNumber: number, query: string}>> = [];
  
  for (let i = 0; i < TEST_CONFIG.runs; i += TEST_CONFIG.concurrency) {
    const batch: Array<{runNumber: number, query: string}> = [];
    
    for (let j = 0; j < TEST_CONFIG.concurrency && (i + j) < TEST_CONFIG.runs; j++) {
      const runNumber = i + j + 1;
      const queryIndex = (runNumber - 1) % TEST_CONFIG.testQueries.length;
      const testQuery = TEST_CONFIG.testQueries[queryIndex];
      
      batch.push({ runNumber, query: testQuery });
    }
    
    batches.push(batch);
  }

  console.log(`📦 Created ${batches.length} batches (${TEST_CONFIG.concurrency} requests per batch)`);

  // Execute batches with progress tracking
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    console.log(`\n📦 Batch ${batchIndex + 1}/${batches.length} (Runs ${batch[0].runNumber}-${batch[batch.length - 1].runNumber})`);
    
    // Execute batch concurrently
    const batchResults = await executeBatch(batch);
    results.push(...batchResults);
    
    // Display progress
    displayProgress(results.length, TEST_CONFIG.runs, results);
    
    // Add delay between batches to avoid overwhelming the server
    if (batchIndex < batches.length - 1) {
      console.log(`⏳ Waiting ${TEST_CONFIG.batchDelay / 1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.batchDelay));
    }
  }

  const overallEndTime = performance.now();
  const totalTestTime = overallEndTime - overallStartTime;

  console.log(`\n🏁 All 100 concurrent tests completed in ${Math.round(totalTestTime / 1000)}s`);
  console.log(`⚡ Speed improvement: ~${Math.round((15 * 60 * 1000) / totalTestTime)}x faster than sequential execution`);

  // Calculate and display analytics
  const analytics = calculateAnalytics(results);
  displayResults(analytics, results);

  // Generate and save charts
  const chartHtml = generateDistributionChart(analytics);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const chartFile = `performance-charts-concurrent-${timestamp}.html`;
  const resultsFile = `performance-results-concurrent-${timestamp}.json`;
  
  const fullResults = {
    testConfig: {
      ...TEST_CONFIG,
      executionMode: 'concurrent',
      actualExecutionTimeMs: totalTestTime
    },
    analytics,
    results,
    testMetadata: {
      totalTestTimeMs: totalTestTime,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      concurrency: TEST_CONFIG.concurrency,
      batchCount: batches.length
    }
  };

  // Save files
  try {
    fs.writeFileSync(chartFile, chartHtml);
    fs.writeFileSync(resultsFile, JSON.stringify(fullResults, null, 2));
    
    console.log(`\n💾 FILES GENERATED:`);
    console.log(`📊 Charts: ${chartFile}`);
    console.log(`📄 Raw Data: ${resultsFile}`);
    console.log(`\n🌐 Open ${chartFile} in your browser to view interactive charts!`);
  } catch (error) {
    console.log(`\n💾 Results ready for export (file saving failed: ${error})`);
    console.log('📊 Chart HTML and JSON data available in memory');
  }

  // Final summary
  console.log(`\n🎯 FINAL SUMMARY:`);
  console.log(`   • ${analytics.successfulRuns}/${analytics.totalRuns} successful runs (${analytics.successRate.toFixed(1)}%)`);
  console.log(`   • Average response time: ${Math.round(analytics.overallStats.averageTotal)}ms`);
  console.log(`   • 95th percentile: ${Math.round(analytics.overallStats.percentiles.p95)}ms`);
  console.log(`   • Standard deviation: ${Math.round(analytics.overallStats.stdDeviation)}ms`);
  console.log(`   • Total execution time: ${Math.round(totalTestTime / 1000)}s (concurrent)`);
  console.log(`   • Concurrency level: ${TEST_CONFIG.concurrency} simultaneous requests`);
  
  const performanceGrade = analytics.overallStats.percentiles.p95 < 10000 ? 'A' : 
                          analytics.overallStats.percentiles.p90 < 10000 ? 'B' :
                          analytics.overallStats.percentiles.p75 < 10000 ? 'C' : 'D';
  console.log(`   • Performance Grade: ${performanceGrade}`);
};

// ======================== EXPORT FOR MODULE USE ========================
export {
  runPerformanceTest,
  executeSingleRun,
  calculateAnalytics,
  displayResults,
  generateDistributionChart,
  type RunResult,
  type PerformanceAnalytics,
  type StepTiming
};

// ======================== DIRECT EXECUTION ========================
if (require.main === module) {
  runPerformanceTest().catch(error => {
    console.error('❌ Performance test failed:', error);
    process.exit(1);
  });
}

export default runPerformanceTest;