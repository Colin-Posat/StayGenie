// endpointDiagnostic.ts - Quick script to find the correct API endpoint
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });
dotenv.config({ path: '.env' });
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3003';

const possibleEndpoints = [
  '/api/hotels/search',
  '/hotels/search',
  '/search',
  '/api/search',
  '/api/hotels/smart-search',
  '/smart-search',
  '/hotel/search',
  '/v1/hotels/search'
];

const testPayload = {
  userInput: "Test hotel search in New York for December 15-18, 2024"
};

const findWorkingEndpoint = async (): Promise<void> => {
  console.log('🔍 ENDPOINT DIAGNOSTIC - Finding correct API path');
  console.log('='.repeat(60));
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`📋 Testing ${possibleEndpoints.length} possible endpoints...\n`);

  for (const endpoint of possibleEndpoints) {
    try {
      console.log(`🧪 Testing: ${BASE_URL}${endpoint}`);
      
      const response = await axios.post(`${BASE_URL}${endpoint}`, testPayload, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      if (response.status === 200) {
        console.log(`✅ FOUND WORKING ENDPOINT: ${endpoint}`);
        console.log(`📊 Response status: ${response.status}`);
        console.log(`📄 Response keys: ${Object.keys(response.data || {}).join(', ')}`);
        console.log(`🎯 Recommendations: ${response.data?.recommendations?.length || response.data?.aiRecommendationsCount || 'unknown'}`);
        console.log('\n🔧 UPDATE YOUR TEST CONFIG:');
        console.log(`ENDPOINT: '${endpoint}'`);
        break;
      } else {
        console.log(`⚠️  Status ${response.status}: ${response.statusText}`);
      }
      
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`❌ 404 Not Found`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ Connection refused - server not running`);
        break;
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    console.log(''); // Add spacing
  }
  
  console.log('\n🔧 If no endpoint worked:');
  console.log('1. Check if your server is running');
  console.log('2. Verify your route configuration');
  console.log('3. Check your Express app routing');
  console.log('4. Look at your actual backend code for the correct path');
};

// Run diagnostic
findWorkingEndpoint().catch(console.error);