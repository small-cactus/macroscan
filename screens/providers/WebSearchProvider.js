import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { systemPrompts } from './prompts';
import { getModel } from './models';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

// Global reference to the searchTracking function
let globalSearchTrackingFn = null;

/**
 * Performs a web search using the search query
 * @param {string} query The search query
 * @returns {Promise<Array>} An array of search results with title, url, and snippet
 */
const performWebSearch = async (query) => {
  try {
    console.log('Performing web search for:', query);
    
    // For testing, we're implementing a simple approach using a free search API
    // In production, you'd use a more robust solution like SerpAPI, Bing Web Search API, etc.
    const response = await axios.get('https://ddg-api.herokuapp.com/search', {
      params: { query, limit: 5 }
    });
    
    if (response.data && Array.isArray(response.data)) {
      return response.data.map(item => ({
        title: item.title,
        url: item.url,
        snippet: item.snippet
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error performing web search:', error);
    // Return a minimal set of results on error
    return [
      {
        title: 'Error fetching search results',
        url: 'https://example.com',
        snippet: 'Could not retrieve search results due to an error.'
      }
    ];
  }
};

/**
 * Implements web scraping functionality for providers
 * @param {Object} toolCall The tool call object from the model
 * @returns {Promise<Object>} The search results
 */
const processWebSearchToolCall = async (toolCall) => {
  try {
    // Extract the query from the tool call parameters
    let query = '';
    if (toolCall.function && toolCall.function.name === 'search_web') {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        query = args.query;
        
        // Call handleSearchTracking immediately upon extracting a query
        if (globalSearchTrackingFn && typeof globalSearchTrackingFn === 'function' && query) {
          console.log('Immediately tracking search query:', query);
          globalSearchTrackingFn([query], []);
        }
      } catch (e) {
        console.error('Error parsing tool call arguments:', e);
        return { 
          error: 'Failed to parse search query',
          results: []
        };
      }
    } else if (toolCall.tools && toolCall.tools.length > 0) {
      // Handle different format for Gemini
      const searchTool = toolCall.tools.find(tool => 
        tool.functionDeclaration && tool.functionDeclaration.name === 'search_web'
      );
      if (searchTool && searchTool.toolUseValue) {
        try {
          const args = JSON.parse(searchTool.toolUseValue);
          query = args.query;
          
          // Call handleSearchTracking immediately for Gemini as well
          if (globalSearchTrackingFn && typeof globalSearchTrackingFn === 'function' && query) {
            console.log('Immediately tracking Gemini search query:', query);
            globalSearchTrackingFn([query], []);
          }
        } catch (e) {
          console.error('Error parsing Gemini tool arguments:', e);
          return { 
            error: 'Failed to parse search query',
            results: []
          };
        }
      }
    }
    
    if (!query) {
      return {
        error: 'No search query provided',
        results: []
      };
    }
    
    // Perform the web search
    const results = await performWebSearch(query);
    
    // Immediately track search results as they arrive
    if (results && Array.isArray(results) && results.length > 0 && typeof globalSearchTrackingFn === 'function') {
      console.log('Immediately tracking search results:', results.length);
      globalSearchTrackingFn([], results);
    }
    
    return {
      query,
      results
    };
  } catch (error) {
    console.error('Error handling web search:', error);
    return {
      error: `Web search failed: ${error.message}`,
      results: []
    };
  }
};

/**
 * Generic handler for web search mode across all providers
 * This will route to the appropriate provider but with web search capabilities
 */
export const handleWebSearch = async ({
  provider,
  selectedModel,
  selectedMode,
  base64Image,
  barcodeData,
  hasDrawing,
  apiKey,
  handleSuccessfulScan,
  handleError,
  handleSearchTracking,
  imageUri,
  startTimeRef,
  updateAverageProcessingTime,
  isFirstDayUnlimited,
  isSubscribed,
  setNoFoodFound,
  setFoodData,
  setActiveTab,
}) => {
  try {
    // Store the search tracking function in the global reference for use by other functions
    globalSearchTrackingFn = handleSearchTracking;
    
    let foodFound = false;
    
    // Get the appropriate model based on provider and search mode
    const currentModel = getModel(provider, { 
      selectedMode: 'search',  // Force search mode
      selectedModel,
      hasDrawing
    });
    
    console.log(`Using search mode with ${provider} model: ${currentModel}`);
    
    // Route to the appropriate provider-specific web search function
    switch (provider) {
      case 'openai':
        foodFound = await handleOpenAIWebSearch({
          selectedModel: currentModel,
          selectedMode,
          base64Image,
          barcodeData,
          hasDrawing,
          apiKey,
          handleSuccessfulScan,
          handleError,
          handleSearchTracking,
          imageUri,
          startTimeRef,
          updateAverageProcessingTime,
          isFirstDayUnlimited,
          isSubscribed,
          setNoFoodFound,
          setFoodData,
          setActiveTab,
        });
        break;
      case 'gemini':
        foodFound = await handleGeminiWebSearch({
          selectedModel: currentModel,
          selectedMode,
          base64Image,
          barcodeData,
          hasDrawing,
          apiKey,
          handleSuccessfulScan,
          handleError,
          handleSearchTracking,
          imageUri,
          startTimeRef,
          updateAverageProcessingTime,
          isFirstDayUnlimited,
          isSubscribed,
          setNoFoodFound,
          setFoodData,
          setActiveTab,
        });
        break;
      case 'anthropic':
      default:
        foodFound = await handleAnthropicWebSearch({
          selectedModel: currentModel,
          selectedMode,
          base64Image,
          barcodeData,
          hasDrawing,
          apiKey,
          handleSuccessfulScan,
          handleError,
          handleSearchTracking,
          imageUri,
          startTimeRef,
          updateAverageProcessingTime,
          isFirstDayUnlimited,
          isSubscribed,
          setNoFoodFound,
          setFoodData,
          setActiveTab,
        });
        break;
    }
    
    return foodFound;
  } catch (error) {
    console.error('Error in handleWebSearch:', error);
    handleError(error, imageUri, barcodeData);
    return false;
  }
};

/**
 * Handles web search using Anthropic's API
 */
const handleAnthropicWebSearch = async ({
  selectedModel,
  selectedMode,
  base64Image,
  barcodeData,
  hasDrawing,
  apiKey,
  handleSuccessfulScan,
  handleError,
  handleSearchTracking,
  imageUri,
  startTimeRef,
  updateAverageProcessingTime,
  isFirstDayUnlimited,
  isSubscribed,
  setNoFoodFound,
  setFoodData,
  setActiveTab,
}) => {
  try {
    const anthropic = new Anthropic({ apiKey });
    let foodFound = false;
    const searchInfo = {
      queries: [],
      results: []
    };
    
    console.log("Using search mode with Anthropic. Sending request to API");
    
    // Initial message to identify the food and determine what to search for
    const initialResponse = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 4096,
      temperature: 0.5,
      system: systemPrompts.searchMode(hasDrawing, barcodeData),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and tell me what food this is. Look very carefully at all visual details including packaging, branding, logos, and size references. Pay close attention to portion size relative to other objects in the image. Only after thoroughly analyzing what you see, use the search_web tool if needed to gather accurate nutritional information."
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        }
      ],
      tools: [
        {
          name: "search_web",
          description: "Search the web for information related to food nutrition",
          input_schema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to find nutrition information"
              }
            },
            required: ["query"]
          }
        }
      ]
    });
    
    console.log('Anthropic initial response:', JSON.stringify(initialResponse, null, 2));
    
    // Process the initial response
    let messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this image and tell me what food this is. Use the search_web tool if needed to gather accurate nutritional information."
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64Image,
            },
          },
        ],
      }
    ];
    
    // Track all tool calls for display purpose
    if (initialResponse.content) {
      const textContent = initialResponse.content.find(item => item.type === 'text');
      if (textContent) {
        // Extract potential food items from the initial text response
        if (textContent.text) {
          // Parse the structured format first
          const foodMatches = [];
          const formattedData = {};
          
          // Look for the structured format pattern we defined
          const lines = textContent.text.split('\n');
          let foundStructuredFormat = false;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Try to extract key-value pairs
            const match = line.match(/^(Food item\(s\)|Brand\/Restaurant|Portion size|Packaging|Distinguishing features):\s*(.+)$/i);
            if (match) {
              foundStructuredFormat = true;
              const [_, key, value] = match;
              formattedData[key] = value.trim();
              
              // Extract food items from the dedicated field
              if (key === 'Food item(s)') {
                // Split by commas or 'and' to get individual items
                const items = value.split(/,|\s+and\s+/).map(item => item.trim());
                items.forEach(item => {
                  if (item.length > 2 && !foodMatches.includes(item)) {
                    foodMatches.push(item);
                  }
                });
              }
            }
          }
          
          // If we didn't find the structured format, fall back to regex patterns
          if (!foundStructuredFormat) {
            // Common patterns of AI describing food in images
            const patterns = [
              /(?:this is|I can see|the image shows|appears to be|visible is|we can see)\s+(?:a|an|some)?\s+([\w\s\-\'\,]+)(?:\.|,|\s+in\s+the\s+image|\s+on\s+a\s+plate|\s+with\s+)/i,
              /(?:a|an|some)\s+([\w\s\-\'\,]+)(?:\s+is\s+visible|\s+is\s+shown|\s+appears|\s+can\s+be\s+seen)/i,
              /(?:image|photo) (?:of|contains|showing|displays)\s+(?:a|an|some)?\s+([\w\s\-\'\,]+)(?:\.|,|\s+on|\s+with)/i
            ];
            
            // Try each pattern
            for (const pattern of patterns) {
              const match = textContent.text.match(pattern);
              if (match && match[1] && match[1].trim().length > 2) {
                const foodItem = match[1].trim();
                // Remove articles and common qualifiers
                const cleanedItem = foodItem
                  .replace(/^(a|an|some)\s+/i, '')
                  .replace(/\s+(dish|meal|food|item|portion)$/i, '');
                  
                if (cleanedItem.length > 2 && !foodMatches.includes(cleanedItem)) {
                  foodMatches.push(cleanedItem);
                }
              }
            }
          }
          
          // Create search queries for each identified food
          if (foodMatches.length > 0 && globalSearchTrackingFn) {
            console.log('Extracted food items from initial response:', foodMatches);
            
            // Add brand information if available from structured format
            let brandInfo = '';
            if (formattedData['Brand/Restaurant'] && 
                formattedData['Brand/Restaurant'] !== 'None visible' && 
                !formattedData['Brand/Restaurant'].includes('None')) {
              brandInfo = formattedData['Brand/Restaurant'] + ' ';
            }
            
            // Create nutritional search queries for each food item, including brand if available
            foodMatches.forEach(item => {
              const query = `nutrition facts for ${brandInfo}${item}`;
              globalSearchTrackingFn([query], []);
            });
          }
        }
        
        messages.push({
          role: "assistant",
          content: [textContent],
        });
      }
    }
    
    // Process any tool calls (up to 3 iterations)
    let iterations = 0;
    let currentResponse = initialResponse;
    const maxIterations = 3;
    
    // Check for tool calls and process them
    while (currentResponse.tool_calls && currentResponse.tool_calls.length > 0 && iterations < maxIterations) {
      iterations++;
      console.log(`Processing tool call iteration ${iterations}`);
      
      // Process each tool call
      for (const toolCall of currentResponse.tool_calls) {
        if (toolCall.type !== 'function' || toolCall.function.name !== 'search_web') continue;
        
        // Track the search query
        try {
          const args = JSON.parse(toolCall.function.arguments);
          if (args.query) {
            searchInfo.queries.push(args.query);
            
            // Call handleSearchTracking if available
            if (globalSearchTrackingFn && typeof globalSearchTrackingFn === 'function') {
              globalSearchTrackingFn([args.query], []);
            }
          }
        } catch (e) {
          console.error("Error parsing tool arguments:", e);
        }
        
        // Perform the web search
        const searchResult = await processWebSearchToolCall(toolCall);
        console.log('Search result:', searchResult);
        
        // Track the search results
        if (searchResult.results && Array.isArray(searchResult.results)) {
          searchInfo.results.push(...searchResult.results);
          
          // Call handleSearchTracking if available
          if (globalSearchTrackingFn && typeof globalSearchTrackingFn === 'function') {
            globalSearchTrackingFn([], searchResult.results);
          }
        }
        
        // Add the search result to the messages
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: "search_web",
          content: JSON.stringify(searchResult),
        });
      }
      
      // Continue the conversation with the search results
      currentResponse = await anthropic.messages.create({
        model: selectedModel,
        max_tokens: 4096,
        temperature: 0.4,
        system: systemPrompts.searchMode(hasDrawing, barcodeData),
        messages: messages,
        tools: [
          {
            name: "search_web",
            description: "Search the web for information related to food nutrition",
            input_schema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to find nutrition information"
                }
              },
              required: ["query"]
            }
          }
        ]
      });
      
      console.log(`Anthropic response iteration ${iterations}:`, JSON.stringify(currentResponse, null, 2));
      
      // Add the assistant's response to messages for potential next iteration
      if (currentResponse.content) {
        const textContent = currentResponse.content.find(item => item.type === 'text');
        if (textContent) {
          messages.push({
            role: "assistant",
            content: [textContent],
          });
        }
      }
    }
    
    // Final request specifically asking for JSON response
    const finalPrompt = `Based on your analysis and the search results, let's take a careful approach to finalizing your response:

<reflection>
1. Review the image one more time and consider all visual details:
   - Did you correctly identify the specific food/drink and its branding?
   - Have you accurately estimated portion size using visual references?
   - Are there any packaging details or logos that provide definitive identification?

2. Review your search results:
   - Did you find nutritional information for the exact product shown?
   - How confident are you in the accuracy of your nutritional estimates?
   - Are there any discrepancies between different sources that need resolution?

3. Consider accuracy of your assessment:
   - How certain are you about the food identification?
   - How precise is your portion size estimation?
   - Are there any assumptions you're making that could be wrong?
</reflection>

Now, provide the complete nutritional information in the JSON format exactly as specified. The response should start with { and end with } without any other text before or after. Don't use markdown code blocks.`;
    
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: finalPrompt
        }
      ]
    });
    
    // Get the final JSON response
    const finalResponse = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 4096,
      temperature: 0.3,
      system: systemPrompts.searchMode(hasDrawing, barcodeData),
      messages: messages
    });
    
    console.log('Final response:', JSON.stringify(finalResponse, null, 2));
    
    // Extract the response text
    let jsonString = '';
    if (finalResponse.content && finalResponse.content.length > 0) {
      const textContent = finalResponse.content.find(item => item.type === 'text');
      if (textContent) {
        jsonString = textContent.text;
      }
    }
    
    console.log('Final raw text:', jsonString);
    
    // Clean up the JSON string - remove any markdown code blocks
    if (jsonString.includes('```json')) {
      jsonString = jsonString.replace(/```json\n|\n```|```/g, '');
    } else if (jsonString.includes('```')) {
      jsonString = jsonString.replace(/```\n|\n```|```/g, '');
    }
    
    // Extract the JSON object if it's surrounded by other text
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
    
    console.log('Cleaned JSON string:', jsonString);
    
    try {
      const parsedData = JSON.parse(jsonString);
      console.log('Parsed nutritional data from web search:', parsedData);
      
      // Add the search queries and results to the data
      if (!parsedData.details) {
        parsedData.details = {};
      }
      
      // Add search info directly to the data for tracking
      parsedData._searchInfo = searchInfo;
      
      if (searchInfo.queries.length > 0 || searchInfo.results.length > 0) {
        // If no sources in the response, add them from our collected data
        if (!parsedData.details.sources || !Array.isArray(parsedData.details.sources) || parsedData.details.sources.length === 0) {
          parsedData.details.sources = searchInfo.results.map(result => ({
            title: result.title || 'Search Result',
            url: result.url || '',
            snippet: result.snippet || ''
          }));
        }
      }
      
      if (parsedData && parsedData.food) {
        foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData, hasDrawing, selectedModel);
      } else if (jsonString.includes("No Food Found") || jsonString.includes("{No Food Found.}")) {
        console.log("No food found in the image");
        setNoFoodFound(true);
        setFoodData(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setActiveTab('');
        foodFound = false;
      } else {
        throw new Error("Parsed data is missing required properties.");
      }
    } catch (parseError) {
      console.error("Error parsing JSON response (web search mode):", parseError);
      console.error("Failed content:", jsonString);
      
      // Attempt to create a minimal valid response as fallback
      try {
        // Create a simple fallback response
        const fallbackResponse = {
          food: {
            name: "Unknown Food",
            class: "Unknown",
            type: "Unknown",
            calories: { amount: 0, marginOfErrorPercent: 50 },
            proteins: { amount: 0, marginOfErrorPercent: 50 },
            carbohydrates: { amount: 0, marginOfErrorPercent: 50 },
            fats: { amount: 0, marginOfErrorPercent: 50 },
            fiber: { amount: 0, marginOfErrorPercent: 50 },
            sodium: { amount: 0, marginOfErrorPercent: 50 },
            sugar: { amount: 0, marginOfErrorPercent: 50 },
            servingSize: { amount: 1, unit: "serving" },
            ingredients: []
          },
          details: {
            summaryText: "Error processing search results, unable to determine nutrition information.",
            sources: searchInfo.results.map(result => ({
              title: result.title || 'Search Result',
              url: result.url || '',
              snippet: result.snippet || ''
            }))
          },
          _searchInfo: searchInfo
        };
        
        // Log the fallback response and alert the user
        console.log("Using fallback response:", fallbackResponse);
        Alert.alert(
          "Processing Error", 
          "There was an error processing the response. Basic information will be shown instead."
        );
        
        // Attempt to still show some results
        foodFound = await handleSuccessfulScan(fallbackResponse, imageUri, barcodeData, hasDrawing, selectedModel);
      } catch (fallbackError) {
        console.error("Error creating fallback response:", fallbackError);
        handleError(parseError, imageUri, barcodeData);
        foodFound = false;
      }
    }
    
    return foodFound;
  } catch (error) {
    console.error('Error in handleAnthropicWebSearch:', error);
    handleError(error, imageUri, barcodeData);
    return false;
  }
};

/**
 * Handles web search using OpenAI's API
 */
const handleOpenAIWebSearch = async ({
  selectedModel,
  selectedMode,
  base64Image,
  barcodeData,
  hasDrawing,
  apiKey,
  handleSuccessfulScan,
  handleError,
  handleSearchTracking,
  imageUri,
  startTimeRef,
  updateAverageProcessingTime,
  isFirstDayUnlimited,
  isSubscribed,
  setNoFoodFound,
  setFoodData,
  setActiveTab,
}) => {
  try {
    const searchInfo = {
      queries: [],
      results: []
    };
    
    // This is a placeholder for future implementation
    console.log('OpenAI web search not yet fully implemented');
    
    // Create a fallback response
    const fallbackResponse = {
      food: {
        name: "OpenAI Search Implementation Required",
        class: "Unknown",
        type: "Unknown",
        calories: { amount: 0, marginOfErrorPercent: 50 },
        proteins: { amount: 0, marginOfErrorPercent: 50 },
        carbohydrates: { amount: 0, marginOfErrorPercent: 50 },
        fats: { amount: 0, marginOfErrorPercent: 50 },
        fiber: { amount: 0, marginOfErrorPercent: 50 },
        sodium: { amount: 0, marginOfErrorPercent: 50 },
        sugar: { amount: 0, marginOfErrorPercent: 50 },
        servingSize: { amount: 1, unit: "serving" },
        ingredients: []
      },
      details: {
        summaryText: "OpenAI web search functionality requires implementation.",
        sources: []
      },
      _searchInfo: searchInfo
    };
    
    Alert.alert(
      "Not Fully Implemented", 
      "OpenAI web search functionality is not yet fully implemented."
    );
    
    // Return false to indicate no food was found
    return false;
  } catch (error) {
    console.error('Error in handleOpenAIWebSearch:', error);
    handleError(error, imageUri, barcodeData);
    return false;
  }
};

/**
 * Handles web search using Gemini's API
 */
const handleGeminiWebSearch = async ({
  selectedModel,
  selectedMode,
  base64Image,
  barcodeData,
  hasDrawing,
  apiKey,
  handleSuccessfulScan,
  handleError,
  handleSearchTracking,
  imageUri,
  startTimeRef,
  updateAverageProcessingTime,
  isFirstDayUnlimited,
  isSubscribed,
  setNoFoodFound,
  setFoodData,
  setActiveTab,
}) => {
  try {
    const searchInfo = {
      queries: [],
      results: []
    };
    
    // This is a placeholder for future implementation
    console.log('Gemini web search not yet fully implemented');
    
    // Create a fallback response
    const fallbackResponse = {
      food: {
        name: "Gemini Search Implementation Required",
        class: "Unknown",
        type: "Unknown",
        calories: { amount: 0, marginOfErrorPercent: 50 },
        proteins: { amount: 0, marginOfErrorPercent: 50 },
        carbohydrates: { amount: 0, marginOfErrorPercent: 50 },
        fats: { amount: 0, marginOfErrorPercent: 50 },
        fiber: { amount: 0, marginOfErrorPercent: 50 },
        sodium: { amount: 0, marginOfErrorPercent: 50 },
        sugar: { amount: 0, marginOfErrorPercent: 50 },
        servingSize: { amount: 1, unit: "serving" },
        ingredients: []
      },
      details: {
        summaryText: "Gemini web search functionality requires implementation.",
        sources: []
      },
      _searchInfo: searchInfo
    };
    
    Alert.alert(
      "Not Fully Implemented", 
      "Gemini web search functionality is not yet fully implemented."
    );
    
    // Return false to indicate no food was found
    return false;
  } catch (error) {
    console.error('Error in handleGeminiWebSearch:', error);
    handleError(error, imageUri, barcodeData);
    return false;
  }
};

export default {
  handleWebSearch,
  handleAnthropicWebSearch,
  handleOpenAIWebSearch,
  handleGeminiWebSearch,
  performWebSearch
}; 