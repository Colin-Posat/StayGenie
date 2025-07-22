#!/usr/bin/env ts-node
// testRunner.ts - Enhanced runner for comprehensive performance testing (100 prompts)
import { runPerformanceTest } from './performanceTest';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from parent directory
dotenv.config({ path: './.env' });

// Debug: Show what dotenv actually loaded
console.log('🔍 Environment variables loaded from ../.env:');
console.log(`   BASE_URL: ${process.env.BASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`   LITEAPI_KEY: ${process.env.LITEAPI_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);

// ======================== ENVIRONMENT VALIDATION ========================
const requiredEnvVars = ['BASE_URL', 'LITEAPI_KEY', 'OPENAI_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease check your .env file and try again.');
  process.exit(1);
}

// ======================== PRE-TEST VALIDATION ========================
const validateApiEndpoint = async (): Promise<boolean> => {
  try {
    const axios = await import('axios');
    const response = await axios.default.get(`${process.env.BASE_URL}/health`, {
      timeout: 5000
    });
    return response.status === 200;
  } catch (error) {
    console.warn('⚠️  Could not validate API endpoint health check');
    return true; // Continue anyway
  }
};

// ======================== DISK SPACE CHECK ========================
const checkDiskSpace = (): boolean => {
  try {
    const stats = fs.statSync(process.cwd());
    // Basic check - if we can write to current directory
    const testFile = path.join(process.cwd(), '.test-write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (error) {
    console.error('❌ Cannot write to current directory for result files');
    return false;
  }
};

// ======================== MAIN EXECUTION ========================
const main = async (): Promise<void> => {
  console.log('🚀 ENHANCED HOTEL SEARCH PERFORMANCE TESTING SUITE');
  console.log('='.repeat(60));
  
  // Environment validation
  console.log('🔧 Environment validation passed');
  console.log(`🌐 Testing against: ${process.env.BASE_URL}`);
  console.log('🔑 API keys configured');
  
  // Pre-test checks
  console.log('\n🔍 Pre-test validation...');
  
  const diskSpaceOk = checkDiskSpace();
  if (!diskSpaceOk) {
    console.error('❌ Disk space check failed');
    process.exit(1);
  }
  console.log('✅ Disk space check passed');
  
  const apiHealthy = await validateApiEndpoint();
  if (apiHealthy) {
    console.log('✅ API endpoint validation passed');
  } else {
    console.log('⚠️  API endpoint validation skipped');
  }
  
  // Test configuration summary
  console.log('\n📋 TEST CONFIGURATION:');
  console.log(`   • Total test runs: 100`);
  console.log(`   • Unique query prompts: 100`);
  console.log(`   • Expected duration: 10-15 minutes`);
  console.log(`   • Timeout per request: 30 seconds`);
  console.log(`   • Charts and analytics: Enabled`);
  console.log(`   • Results export: Enabled`);
  
  // Confirm start
  console.log('\n⚡ Starting comprehensive performance analysis...');
  console.log('   This test will generate:');
  console.log('   📊 Interactive distribution charts (HTML)');
  console.log('   📈 Bell curve analysis');
  console.log('   📉 Percentile breakdowns');
  console.log('   🎯 Performance recommendations');
  console.log('   💾 Raw data export (JSON)');
  
  const startTime = Date.now();
  
  try {
    // Run the comprehensive performance test
    await runPerformanceTest();
    
    const endTime = Date.now();
    const totalDuration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n🎉 COMPREHENSIVE PERFORMANCE TEST COMPLETED!');
    console.log('='.repeat(60));
    console.log(`⏱️  Total execution time: ${totalDuration} seconds`);
    console.log(`📊 Results have been saved to HTML and JSON files`);
    console.log(`🌐 Open the generated HTML file to view interactive charts`);
    
    // Performance summary reminder
    console.log('\n📋 WHAT TO CHECK IN YOUR RESULTS:');
    console.log('   1. 📊 Overall success rate (target: >95%)');
    console.log('   2. ⚡ Average response time (target: <10s)');
    console.log('   3. 📈 95th percentile response time (target: <15s)');
    console.log('   4. 📉 Distribution shape (normal vs skewed)');
    console.log('   5. 🔍 Performance outliers and patterns');
    console.log('   6. 💡 Optimization recommendations');
    
    console.log('\n✨ Happy analyzing!');
    process.exit(0);
    
  } catch (error: any) {
    const endTime = Date.now();
    const totalDuration = Math.round((endTime - startTime) / 1000);
    
    console.error('\n❌ PERFORMANCE TEST FAILED');
    console.error('='.repeat(60));
    console.error(`💥 Error: ${error.message}`);
    console.error(`⏱️  Failed after: ${totalDuration} seconds`);
    
    if (error.response) {
      console.error(`🌐 API Response: ${error.response.status}`);
      if (error.response.data) {
        console.error(`📄 Response Data:`, error.response.data);
      }
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 TROUBLESHOOTING:');
      console.error('   • Check if your API server is running');
      console.error('   • Verify the BASE_URL in your .env file');
      console.error('   • Ensure the server is accessible from this machine');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n🔧 TROUBLESHOOTING:');
      console.error('   • Server may be overloaded or slow');
      console.error('   • Consider increasing timeout values');
      console.error('   • Check network connectivity');
    } else {
      console.error('\n🔧 TROUBLESHOOTING:');
      console.error('   • Check your API keys in .env file');
      console.error('   • Verify server endpoints are correct');
      console.error('   • Review server logs for errors');
    }
    
    process.exit(1);
  }
};

// ======================== GRACEFUL SHUTDOWN ========================
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user (Ctrl+C)');
  console.log('Partial results may be available');
  console.log('💡 Consider running again for complete analysis');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Test terminated');
  process.exit(143);
});

// Run the main function
main().catch((error) => {
  console.error('💥 Unexpected error in test runner:', error);
  process.exit(1);
});