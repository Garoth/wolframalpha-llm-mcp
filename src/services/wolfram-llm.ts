import axios from 'axios';

interface WolframLLMConfig {
  appId: string;
}

interface LLMQueryResult {
  success: boolean;
  error?: string;
  rawResponse?: unknown;
  result?: {
    query: string;
    interpretation?: string;
    result: string;
    sections: Array<{
      title: string;
      content: string;
    }>;
    url?: string;
    getSectionByTitle(title: string): { title: string; content: string } | undefined;
  };
}

export class WolframLLMService {
  private config: WolframLLMConfig;
  private baseUrl = 'https://www.wolframalpha.com/api/v1/llm-api';

  constructor(config: WolframLLMConfig) {
    this.config = {
      appId: config.appId || process.env.WOLFRAM_LLM_APP_ID || ''
    };
  }

  private parseQueryResponse(text: string): NonNullable<LLMQueryResult['result']> {
    const sections = text.split('\n\n');
    const result: NonNullable<LLMQueryResult['result']> = {
      query: '',
      result: '',
      sections: [],
      getSectionByTitle(title: string) {
        return this.sections.find(s => s.title === title);
      }
    };

    // Find Query section
    const querySection = sections.find(s => s.startsWith('Query:'));
    if (querySection) {
      result.query = JSON.parse(querySection.replace('Query:', '').trim());
    }

    // Get all non-query sections
    const nonQuerySections = sections.filter(s => !s.startsWith('Query:'));
    
    // Simple approach: Just find the second "Assumption:" section and cut everything after it
    let processedSections = nonQuerySections;
    
    // Find the first assumption section
    const firstAssumptionIndex = nonQuerySections.findIndex(s => s.startsWith('Assumption:'));
    
    if (firstAssumptionIndex >= 0) {
      // Find the second assumption section
      const secondAssumptionIndex = nonQuerySections.findIndex((s, i) => 
        i > firstAssumptionIndex && s.startsWith('Assumption:')
      );
      
      // If we found a second assumption section, cut everything after it
      if (secondAssumptionIndex > 0) {
        // Keep only the content up to the second assumption
        processedSections = nonQuerySections.slice(0, secondAssumptionIndex);
        
        // Check if there's a URL section after the duplicate content
        const urlSection = nonQuerySections.find(s => s.startsWith('Wolfram|Alpha website result'));
        if (urlSection && !processedSections.includes(urlSection)) {
          processedSections.push(urlSection);
        }
      }
    }
    
    // Put the processed response (except Query) in result
    result.result = processedSections.join('\n\n').trim();

    // Process sections
    let currentSection = '';
    let currentContent: string[] = [];
    const processedSectionTitles = new Set<string>(); // Track section titles to avoid duplicates

    for (const section of processedSections) {
      if (section.startsWith('Wolfram|Alpha website result')) {
        const match = section.match(/https:\/\/.*?(?=\s|$)/);
        if (match) {
          result.url = match[0];
        }
      } else if (section.trim()) {
        const lines = section.split('\n');
        const firstLine = lines[0];
        
        if (firstLine.includes(':')) {
          // If we have a previous section, save it
          if (currentSection && currentContent.length > 0 && !processedSectionTitles.has(currentSection)) {
            result.sections.push({
              title: currentSection,
              content: currentContent.join('\n').trim()
            });
            processedSectionTitles.add(currentSection);
          }
          // Start new section
          currentSection = firstLine.split(':')[0].trim();
          // Add remaining content after the colon
          currentContent = [firstLine.split(':').slice(1).join(':').trim(), ...lines.slice(1)];
        } else {
          // Continue adding to current section
          currentContent.push(...lines);
        }
      }
    }

    // Add the last section if exists
    if (currentSection && currentContent.length > 0 && !processedSectionTitles.has(currentSection)) {
      result.sections.push({
        title: currentSection,
        content: currentContent.join('\n').trim()
      });
    }

    // Ensure query is present
    if (!result.query) {
      throw new Error('Invalid response format: missing query');
    }

    // If no result could be extracted, use error message
    if (!result.result) {
      throw new Error('Could not extract result from response');
    }

    return result;
  }

  private parseSimplifiedResponse(text: string): NonNullable<LLMQueryResult['result']> {
    const sections = text.split('\n\n');
    const result: NonNullable<LLMQueryResult['result']> = {
      query: '',
      result: '',
      sections: [],
      getSectionByTitle(title: string) {
        return this.sections.find(s => s.title === title);
      }
    };

    // Find Query section
    const querySection = sections.find(s => s.startsWith('Query:'));
    if (querySection) {
      result.query = JSON.parse(querySection.replace('Query:', '').trim());
    }

    const nonQuerySections = sections.filter(s => !s.startsWith('Query:'));
    
    // Simple approach: Just find the second "Assumption:" section and cut everything after it
    let processedSections = nonQuerySections;
    
    // Find the first assumption section
    const firstAssumptionIndex = nonQuerySections.findIndex(s => s.startsWith('Assumption:'));
    
    if (firstAssumptionIndex >= 0) {
      // Find the second assumption section
      const secondAssumptionIndex = nonQuerySections.findIndex((s, i) => 
        i > firstAssumptionIndex && s.startsWith('Assumption:')
      );
      
      // If we found a second assumption section, cut everything after it
      if (secondAssumptionIndex > 0) {
        // Keep only the content up to the second assumption
        processedSections = nonQuerySections.slice(0, secondAssumptionIndex);
        
        // Check if there's a URL section after the duplicate content
        const urlSection = nonQuerySections.find(s => s.startsWith('Wolfram|Alpha website result'));
        if (urlSection && !processedSections.includes(urlSection)) {
          processedSections.push(urlSection);
        }
      }
    }
    
    // Join all remaining sections and clean up
    const cleanText = processedSections.join('\n\n').trim();
    result.result = cleanText;

    // Ensure query is present
    if (!result.query) {
      throw new Error('Invalid response format: missing query');
    }

    // If no result could be extracted, use error message
    if (!result.result) {
      throw new Error('Could not extract result from response');
    }

    return result;
  }

  /**
   * Query WolframAlpha's LLM API with a natural language query
   * Returns structured data optimized for LLM consumption
   */
  async query(input: string): Promise<LLMQueryResult> {
    try {
      // Build query URL with parameters
      const params = new URLSearchParams({
        appid: this.config.appId,
        input
      });

      // Make request to LLM API
      const response = await axios.get(`${this.baseUrl}?${params.toString()}`);
      
      // Store raw response for error reporting
      const rawResponse = response.data;

      // Log raw response for debugging
      console.log('Raw API Response:', JSON.stringify(rawResponse, null, 2));

      if (typeof rawResponse !== 'string') {
        console.error('Unexpected response format:', rawResponse);
        return {
          success: false,
          error: 'Invalid response format from WolframAlpha API',
          rawResponse
        };
      }

      const result = this.parseQueryResponse(rawResponse);

      return {
        success: true,
        result
      };

    } catch (error) {
      console.error('WolframAlpha LLM API Error:', error);
      
      // Get raw response if available
      let rawResponse: unknown;
      if (axios.isAxiosError(error) && error.response?.data) {
        rawResponse = error.response.data;
        console.error('Raw API Response:', rawResponse);
      }

      if (axios.isAxiosError(error) && error.response?.status === 501) {
        return {
          success: false,
          error: 'Input cannot be interpreted. Try rephrasing your query.',
          rawResponse
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query WolframAlpha LLM API',
        rawResponse
      };
    }
  }

  /**
   * Get a simplified answer optimized for LLM context
   * Focuses on the most relevant information
   */
  async getSimplifiedAnswer(input: string): Promise<LLMQueryResult> {
    try {
      const params = new URLSearchParams({
        appid: this.config.appId,
        input,
        maxchars: '500' // Limit response length for simpler answers
      });

      const response = await axios.get(`${this.baseUrl}?${params.toString()}`);
      
      // Store raw response for error reporting
      const rawResponse = response.data;
      console.log("Simplified Raw Response:", rawResponse);

      if (typeof rawResponse !== 'string') {
        console.error('Unexpected response format:', rawResponse);
        return {
          success: false,
          error: 'Invalid response format from WolframAlpha API',
          rawResponse
        };
      }

      // Parse the simplified response
      const result = this.parseSimplifiedResponse(rawResponse);
      
      // We already have processed sections from parseSimplifiedResponse
      // No need to process them again, just use the sections from the result
      const processedSections = result.result.split('\n\n');
      
      // Clear existing sections before processing
      result.sections = [];
      
      // Process sections
      let currentSection = '';
      let currentContent: string[] = [];
      const processedSectionTitles = new Set<string>(); // Track section titles to avoid duplicates

      for (const section of processedSections) {
        if (section.startsWith('Wolfram|Alpha website result')) {
          const match = section.match(/https:\/\/.*?(?=\s|$)/);
          if (match) {
            result.url = match[0];
          }
        } else if (section.trim()) {
          const lines = section.split('\n');
          const firstLine = lines[0];
          
          if (firstLine.includes(':')) {
            // If we have a previous section, save it
            if (currentSection && currentContent.length > 0 && !processedSectionTitles.has(currentSection)) {
              result.sections.push({
                title: currentSection,
                content: currentContent.join('\n').trim()
              });
              processedSectionTitles.add(currentSection);
            }
            // Start new section, preserving the full title
            currentSection = firstLine.split(':')[0].trim();
            // Add remaining content after the colon
            currentContent = [firstLine.split(':').slice(1).join(':').trim(), ...lines.slice(1)];
          } else {
            // Continue adding to current section
            currentContent.push(...lines);
          }
        }
      }

      // Add the last section if exists
      if (currentSection && currentContent.length > 0 && !processedSectionTitles.has(currentSection)) {
        result.sections.push({
          title: currentSection,
          content: currentContent.join('\n').trim()
        });
      }

      return {
        success: true,
        result
      };

    } catch (error) {
      console.error('WolframAlpha LLM API Error:', error);

      // Get raw response if available
      let rawResponse: unknown;
      if (axios.isAxiosError(error) && error.response?.data) {
        rawResponse = error.response.data;
        console.error('Raw API Response:', rawResponse);
      }

      // Return the raw response in error cases
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get simplified answer',
        rawResponse: error instanceof Error && axios.isAxiosError(error) ? error.response?.data : undefined
      };
    }
  }

  /**
   * Validate API key by making a test query
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        appid: this.config.appId,
        input: '2+2'
      });

      const response = await axios.get(`${this.baseUrl}?${params.toString()}`);
      return typeof response.data === 'string' && response.data.includes('Result:');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        console.error('API Key Validation Error Response:', error.response.data);
      }
      return false;
    }
  }
}
