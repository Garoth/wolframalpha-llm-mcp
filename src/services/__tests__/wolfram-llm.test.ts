import { jest } from '@jest/globals';
import { WolframLLMService } from '../wolfram-llm.js';

// These tests use real API calls and may take longer to complete
describe('WolframLLMService Integration Tests', () => {
  let service: WolframLLMService;
  
  beforeEach(() => {
    service = new WolframLLMService({ appId: process.env.WOLFRAM_LLM_APP_ID! });
  });

  // Increase timeout for API calls
  jest.setTimeout(30000);

  describe('ask_llm query', () => {
    it('should correctly solve a basic integral and provide section access', async () => {
      const result = await service.query('integrate x^2 from 0 to 1');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('integrate x^2 from 0 to 1');
      expect(result.result?.result).toMatch(/integral.*x\^2.*dx.*=.*1\/3/);
      expect(result.result?.sections.length).toBeGreaterThan(0);
      
      // Check for mathematical sections
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Definite integral');
      expect(sectionTitles).toContain('Visual representation of the integral');
      expect(sectionTitles).toContain('Riemann sums');
      expect(sectionTitles).toContain('Indefinite integral');

      // Test getSectionByTitle helper
      const definiteIntegralSection = result.result?.getSectionByTitle('Definite integral');
      expect(definiteIntegralSection).toBeDefined();
      expect(definiteIntegralSection?.content).toBe("integral_0^1 x^2 dx = 1/3≈0.33333");

      const riemannSection = result.result?.getSectionByTitle('Riemann sums');
      expect(riemannSection).toBeDefined();
      expect(riemannSection?.content).toMatch(/sum|partition|limit/i);

      // Test non-existent section
      const nonExistentSection = result.result?.getSectionByTitle('Not a real section');
      expect(nonExistentSection).toBeUndefined();
    });

    it('should correctly compute a complex derivative', async () => {
      const result = await service.query('derivative of x^4 sin x');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('derivative of x^4 sin x');
      expect(result.result?.result).toMatch(/x\^3.*\(4 sin\(x\).*\+ x cos\(x\)\)/);
      expect(result.result?.sections.length).toBeGreaterThan(0);
      
      // Check for mathematical sections
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Derivative');
      expect(sectionTitles).toContain('Alternate form');
    });

    it('should correctly solve a complex indefinite integral', async () => {
      const result = await service.query('integrate x^2 sin^3 x dx');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('integrate x^2 sin^3 x dx');
      expect(result.result?.result).toMatch(/1\/108.*\(-81.*\(x\^2.*-.*2\).*cos\(x\)/);
      expect(result.result?.sections.length).toBeGreaterThan(0);
      
      // Check for mathematical sections
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Indefinite integral');
      expect(sectionTitles).toContain('Plots of the integral');
    });

    it('should successfully query and parse a response', async () => {
      const result = await service.query('what is 2+2?');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('what is 2+2?');
      expect(result.result?.result).toMatch(/Input:.*2.*\+.*2.*Result:.*4/s);
      expect(result.result?.sections.length).toBeGreaterThan(0);
      expect(result.result?.url).toMatch(/^https:\/\/.*wolframalpha\.com/);
    });

    it('should return detailed population data with sections and section access', async () => {
      const result = await service.query('what is the population of hawaii in 2023');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('what is the population of hawaii in 2023');
      
      // Check main result contains population number
      expect(result.result?.result).toMatch(/1\.435 million people/);
      
      // Verify sections contain relevant demographic data
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Population history');
      expect(sectionTitles).toContain('Population');
      expect(sectionTitles).toContain('Comparisons');
      
      // Test getSectionByTitle helper for demographic data
      const populationSection = result.result?.getSectionByTitle('Population');
      expect(populationSection).toBeDefined();
      expect(populationSection?.content).toMatch(/million/); // Contains population in millions
      expect(populationSection?.content).toMatch(/population density.*people\/mi\^2/); // Contains density info
      expect(populationSection?.content).toMatch(/annual births.*people\/yr/); // Contains birth rate

      const historySection = result.result?.getSectionByTitle('Population history');
      expect(historySection).toBeDefined();
      expect(historySection?.content).toMatch(/www6b3.wolframalpha.com/); // Contains image

      const comparisonsSection = result.result?.getSectionByTitle('Comparisons');
      expect(comparisonsSection).toBeDefined();
      expect(comparisonsSection?.content).toMatch(/total enrollment in the California/i); // Contains ranking or comparison info
    });

    it('should handle uninterpretable input', async () => {
      // Using a nonsensical query that WolframAlpha cannot interpret
      const result = await service.query('xyzabc123 qwerty asdfgh');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Input cannot be interpreted. Try rephrasing your query.');
    });

    it('should provide detailed astronomical data about Mars', async () => {
      const result = await service.query('Mars facts');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('Mars facts');
      expect(result.result?.result).toMatch(/planet|solar system/i);
      expect(result.result?.sections.length).toBeGreaterThan(0);
      
      // Check for astronomical sections
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Physical properties');
      expect(sectionTitles).toContain('Orbital properties');
      expect(sectionTitles).toContain('Atmosphere');
      
      // Test section content
      const physicalSection = result.result?.getSectionByTitle('Physical properties');
      expect(physicalSection).toBeDefined();
      expect(physicalSection?.content).toMatch(/mass|radius|volume/i);

      const atmosphereSection = result.result?.getSectionByTitle('Atmosphere');
      expect(atmosphereSection).toBeDefined();
      expect(atmosphereSection?.content).toMatch(/carbon dioxide|pressure/i);
    });

    it('should analyze a 3-state 3-color Turing machine evolution', async () => {
      const result = await service.query('evolve TM 120597441632 on random tape, width = 5');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('evolve TM 120597441632 on random tape, width = 5');
      expect(result.result?.result).toMatch(/machine.*rule.*120597441632/);
      
      // Check for Turing machine sections
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Evolution on finite random tape');
      expect(sectionTitles).toContain('Rule space information');
      
      // Test rule space information
      const ruleSpaceSection = result.result?.getSectionByTitle('Rule space information');
      expect(ruleSpaceSection).toBeDefined();
      expect(ruleSpaceSection?.content).toMatch(/3-state, 3-color/);
      expect(ruleSpaceSection?.content).toMatch(/9\^18/);
      expect(ruleSpaceSection?.content).toMatch(/198\.4 billion/);
    });

    it('should analyze a 2-state 4-color Turing machine evolution', async () => {
      const result = await service.query('evolve TM 987654321 on random tape, width = 5');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('evolve TM 987654321 on random tape, width = 5');
      expect(result.result?.result).toMatch(/machine.*rule.*987654321/);
      
      // Check for Turing machine sections
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Evolution on finite random tape');
      expect(sectionTitles).toContain('Rule space information');
      
      // Test rule space information
      const ruleSpaceSection = result.result?.getSectionByTitle('Rule space information');
      expect(ruleSpaceSection).toBeDefined();
      expect(ruleSpaceSection?.content).toMatch(/2-state, 4-color/);
      expect(ruleSpaceSection?.content).toMatch(/4294967296/);
    });
  });

  describe('getSimplifiedAnswer', () => {
    it('should return simplified response for geography', async () => {
      const result = await service.getSimplifiedAnswer('what is the capital of France?');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('what is the capital of France?');
      expect(result.result?.result).toMatch(/Paris.*France/);
      
      // Verify sections contain key data
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Location');
      expect(sectionTitles).toContain('Input interpretation');
    });

    it('should return simplified response for chemistry', async () => {
      const result = await service.getSimplifiedAnswer('what is H2O?');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('what is H2O?');
      expect(result.result?.result).toMatch(/water/i);
      
      // Verify sections contain chemical data
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Chemical names and formulas');
      expect(sectionTitles).toContain('Input interpretation');
    });

    it('should return simplified response for physics', async () => {
      const result = await service.getSimplifiedAnswer('what is the speed of light?');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('what is the speed of light?');
      expect(result.result?.result).toMatch(/2\.998×10\^8.*m\/s/);
      
      // Verify sections contain physics data
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Value');
      expect(sectionTitles).toContain('Basic unit dimensions');
    });

    it('should return simplified response for history with section access', async () => {
      const result = await service.getSimplifiedAnswer('when was the Declaration of Independence signed?');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('when was the Declaration of Independence signed?');
      expect(result.result?.result).toMatch(/Result:.*August 2, 1776/s);
      
      // Test getSectionByTitle helper for date data
      const dateFormatsSection = result.result?.getSectionByTitle('Date formats');
      expect(dateFormatsSection).toBeDefined();
      expect(dateFormatsSection?.content).toMatch(/\d{4}/); // Contains year
      
      const resultSection = result.result?.getSectionByTitle('Result');
      expect(resultSection).toBeDefined();
      expect(resultSection?.content).toBe("August 2, 1776");

      // Verify sections contain date data
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Date formats');
      expect(sectionTitles).toContain('Result');
    });

    it('should return simplified response for biology', async () => {
      const result = await service.getSimplifiedAnswer('what species is an elephant?');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('what species is an elephant?');
      expect(result.result?.result).toMatch(/Loxodonta africana/i);
      
      // Verify sections contain species data
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Scientific name');
      expect(sectionTitles).toContain('Input interpretation');
    });

    it('should return simplified response for technology', async () => {
      const result = await service.getSimplifiedAnswer('what is a binary tree?');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('what is a binary tree?');
      expect(result.result?.result).toMatch(/tree/i);
      
      // Verify sections contain mathematical data
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Subject classifications');
      expect(sectionTitles).toContain('Input interpretation');
    });

    it('should return detailed information about sulfuric acid', async () => {
      const result = await service.getSimplifiedAnswer('what is H2SO4?');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('what is H2SO4?');
      expect(result.result?.result).toMatch(/sulfuric acid/i);
      
      // Verify sections contain chemical data
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Chemical names and formulas');
      expect(sectionTitles).toContain('Structure diagram');
      
      // Test section content
      const structureSection = result.result?.getSectionByTitle('Structure diagram');
      expect(structureSection).toBeDefined();
      expect(structureSection?.content).toMatch(/diagram|formula/i);
    });

    it('should return information about astronomical distances', async () => {
      const result = await service.getSimplifiedAnswer('what is the average distance from Earth to Mars?');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('what is the average distance from Earth to Mars?');
      expect(result.result?.result).toMatch(/million (kilometers|km)|astronomical units/i);
      
      // Verify sections contain astronomical data
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Result');
      expect(sectionTitles).toContain('Unit conversions');
      expect(sectionTitles).toContain('Comparisons as distance');
      
      // Test section content
      const resultSection = result.result?.getSectionByTitle('Result');
      expect(resultSection).toBeDefined();
      expect(resultSection?.content).toMatch(/au|astronomical units/i);

      const conversionsSection = result.result?.getSectionByTitle('Unit conversions');
      expect(conversionsSection).toBeDefined();
      expect(conversionsSection?.content).toMatch(/(km|kilometers|miles)/i);
    });

    it('should analyze a chemical reaction', async () => {
      const result = await service.getSimplifiedAnswer('2 H2 + O2 -> 2 H2O');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('2 H2 + O2 -> 2 H2O');
      expect(result.result?.result).toMatch(/balanced equation|reaction/i);
      
      // Verify sections contain reaction data
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Balanced equation');
      expect(sectionTitles).toContain('Word equation');
      expect(sectionTitles).toContain('Thermochemistry');
      
      // Test section content
      const balancedSection = result.result?.getSectionByTitle('Balanced equation');
      expect(balancedSection).toBeDefined();
      expect(balancedSection?.content).toMatch(/H_2.*O_2.*H_2O/);

      const wordSection = result.result?.getSectionByTitle('Word equation');
      expect(wordSection).toBeDefined();
      expect(wordSection?.content).toMatch(/hydrogen|oxygen|water/i);
    });

    it('should analyze probability of dice rolls', async () => {
      const result = await service.getSimplifiedAnswer('probability of rolling sum of 7 with two dice');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('probability of rolling sum of 7 with two dice');
      
      // Check input interpretation
      const inputSection = result.result?.getSectionByTitle('Input interpretation');
      expect(inputSection).toBeDefined();
      expect(inputSection?.content).toBe("dice | number of dice | 2\nnumber of faces on each die | 6\ntotal | 7");
      
      // Check probability result
      const resultSection = result.result?.getSectionByTitle('Probability of occurrence');
      expect(resultSection).toBeDefined();
      expect(resultSection?.content).toMatch(/0\.1667.*1 in 6/);
      expect(resultSection?.content).toMatch(/fair 6-sided dice/i);
      
      // Verify sections contain distribution
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Distribution of total');
    });

    it('should solve quadratic equations', async () => {
      const result = await service.getSimplifiedAnswer('solve x^2 + 5x + 6 = 0');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('solve x^2 + 5x + 6 = 0');
      
      // Check input interpretation
      const inputSection = result.result?.getSectionByTitle('Input interpretation');
      expect(inputSection).toBeDefined();
      expect(inputSection?.content).toBe("solve x^2 + 5 x + 6 = 0");
      
      // Check results
      const resultSection = result.result?.getSectionByTitle('Results');
      expect(resultSection).toBeDefined();
      expect(resultSection?.content).toBe("x = -3\nx = -2");
      
      // Verify sections contain visualizations
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Root plot');
      expect(sectionTitles).toContain('Number line');
    });

    it('should solve systems of equations', async () => {
      const result = await service.getSimplifiedAnswer('solve system of equations: x + y = 5, x - y = 1');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('solve system of equations: x + y = 5, x - y = 1');
      
      // Check input interpretation
      const inputSection = result.result?.getSectionByTitle('Input interpretation');
      expect(inputSection).toBeDefined();
      expect(inputSection?.content).toBe("solve x + y = 5\nx - y = 1");
      
      // Check results
      const resultSection = result.result?.getSectionByTitle('Result');
      expect(resultSection).toBeDefined();
      expect(resultSection?.content).toBe("x = 3 and y = 2");
      
      // Verify sections contain visualization
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Implicit plot');
    });

    it('should analyze statistical data', async () => {
      const result = await service.getSimplifiedAnswer('statistics {2,3,3,4,4,4,5,6}');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.query).toBe('statistics {2,3,3,4,4,4,5,6}');
      
      // Check input interpretation
      const inputSection = result.result?.getSectionByTitle('Input');
      expect(inputSection).toBeDefined();
      expect(inputSection?.content).toBe("{2, 3, 3, 4, 4, 4, 5, 6}");

      // Verify sections contain visualizations
      const sectionTitles = result.result?.sections.map(s => s.title);
      expect(sectionTitles).toContain('Plot');
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key', async () => {
      const result = await service.validateApiKey();
      expect(result).toBe(true);
    });
  });
});
