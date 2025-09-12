// src/utils/searchCostTracker.ts
import fs from 'fs';
import path from 'path';

interface SearchCostRecord {
  timestamp: string;
  searchId: string;
  userQuery: string;
  destination: string;
  hotelCount: number;
  totalTokensUsed: number;
  totalCost: number;
  searchDurationMs: number;
  operations: {
    hotelMatching: { tokens: number; cost: number };
    aiInsights: { tokens: number; cost: number };
  };
}

// GPT-4o Mini pricing
const GPT_PRICING = {
  input: 0.00015 / 1000,  // $0.15 per 1M input tokens
  output: 0.0006 / 1000   // $0.60 per 1M output tokens
};

class SearchCostTracker {
  private logFile: string;
  private searchCosts: Map<string, { 
    startTime: number; 
    userQuery: string; 
    destination: string; 
    hotelCount: number; 
    totalTokens: number; 
    totalCost: number;
    operations: { hotelMatching: { tokens: number; cost: number }; aiInsights: { tokens: number; cost: number } };
  }> = new Map();

  constructor() {
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const today = new Date().toISOString().slice(0, 10);
    this.logFile = path.join(logsDir, `search-costs-${today}.json`);
  }

  // Start tracking a search
  startSearch(searchId: string, userQuery: string, destination: string, hotelCount: number) {
    this.searchCosts.set(searchId, {
      startTime: Date.now(),
      userQuery,
      destination,
      hotelCount,
      totalTokens: 0,
      totalCost: 0,
      operations: {
        hotelMatching: { tokens: 0, cost: 0 },
        aiInsights: { tokens: 0, cost: 0 }
      }
    });
    
    console.log(`💰 Started cost tracking for search: ${searchId}`);
  }

  // Add GPT usage to a search (call this after each GPT operation)
  addGptUsage(
    searchId: string, 
    operation: 'hotelMatching' | 'aiInsights',
    promptTokens: number, 
    completionTokens: number
  ) {
    const search = this.searchCosts.get(searchId);
    if (!search) {
      console.warn(`Search ${searchId} not found for cost tracking`);
      return;
    }

    const cost = (promptTokens * GPT_PRICING.input) + (completionTokens * GPT_PRICING.output);
    const tokens = promptTokens + completionTokens;

    search.operations[operation].tokens += tokens;
    search.operations[operation].cost += cost;
    search.totalTokens += tokens;
    search.totalCost += cost;

    console.log(`💰 Added ${operation}: $${cost.toFixed(4)} (${tokens} tokens) to search ${searchId}`);
  }

  // Finish tracking and save to file
  finishSearch(searchId: string): number {
    const search = this.searchCosts.get(searchId);
    if (!search) {
      console.warn(`Search ${searchId} not found for cost tracking`);
      return 0;
    }

    const searchDuration = Date.now() - search.startTime;
    
    const record: SearchCostRecord = {
      timestamp: new Date().toISOString(),
      searchId,
      userQuery: search.userQuery,
      destination: search.destination,
      hotelCount: search.hotelCount,
      totalTokensUsed: search.totalTokens,
      totalCost: search.totalCost,
      searchDurationMs: searchDuration,
      operations: search.operations
    };

    this.saveRecord(record);
    this.searchCosts.delete(searchId);

    console.log(`💰 SEARCH COMPLETE: ${searchId} cost $${search.totalCost.toFixed(4)} (${search.totalTokens} tokens)`);
    
    return search.totalCost;
  }

  private saveRecord(record: SearchCostRecord) {
    try {
      let existingRecords: SearchCostRecord[] = [];
      
      if (fs.existsSync(this.logFile)) {
        const fileContent = fs.readFileSync(this.logFile, 'utf8');
        existingRecords = JSON.parse(fileContent);
      }
      
      existingRecords.push(record);
      fs.writeFileSync(this.logFile, JSON.stringify(existingRecords, null, 2));
      
      console.log(`💾 Search cost saved to: ${this.logFile}`);
      
    } catch (error) {
      console.error('Failed to save search cost record:', error);
    }
  }

  // Get today's total costs
  getTodaysTotalCost(): number {
    try {
      if (!fs.existsSync(this.logFile)) return 0;
      
      const records: SearchCostRecord[] = JSON.parse(fs.readFileSync(this.logFile, 'utf8'));
      return records.reduce((total, record) => total + record.totalCost, 0);
    } catch (error) {
      console.error('Failed to get today\'s total cost:', error);
      return 0;
    }
  }

  // Generate simple daily report
  generateDailyReport(): string {
    try {
      if (!fs.existsSync(this.logFile)) {
        return `No searches recorded today (${new Date().toISOString().slice(0, 10)})`;
      }
      
      const records: SearchCostRecord[] = JSON.parse(fs.readFileSync(this.logFile, 'utf8'));
      const totalCost = records.reduce((sum, r) => sum + r.totalCost, 0);
      const totalTokens = records.reduce((sum, r) => sum + r.totalTokensUsed, 0);
      const avgCostPerSearch = totalCost / records.length;

      let report = `Hotel Search Costs - ${new Date().toISOString().slice(0, 10)}\n`;
      report += `${'='.repeat(50)}\n\n`;
      report += `Total Searches: ${records.length}\n`;
      report += `Total Cost: $${totalCost.toFixed(4)}\n`;
      report += `Total Tokens: ${totalTokens.toLocaleString()}\n`;
      report += `Average per Search: $${avgCostPerSearch.toFixed(4)}\n\n`;
      
      report += `Individual Searches:\n`;
      report += `${'-'.repeat(30)}\n`;
      
      records.forEach((record, index) => {
        report += `${index + 1}. ${record.destination} - $${record.totalCost.toFixed(4)}\n`;
        report += `   Query: "${record.userQuery.substring(0, 50)}${record.userQuery.length > 50 ? '...' : ''}"\n`;
        report += `   Hotels: ${record.hotelCount}, Duration: ${(record.searchDurationMs / 1000).toFixed(1)}s\n`;
        report += `   Matching: $${record.operations.hotelMatching.cost.toFixed(4)}, Insights: $${record.operations.aiInsights.cost.toFixed(4)}\n\n`;
      });

      return report;
    } catch (error) {
      console.error('Failed to generate daily report:', error);
      return 'Error generating report';
    }
  }
}

export const searchCostTracker = new SearchCostTracker();

// Helper to extract token usage from OpenAI response
export const extractTokens = (response: any): { prompt: number; completion: number } => {
  const usage = response?.usage || {};
  return {
    prompt: usage.prompt_tokens || 0,
    completion: usage.completion_tokens || 0
  };
};