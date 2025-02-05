import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { systemPrompts } from './prompts';
import { getModel } from './models';

export const handleGeminiScan = async ({
  selectedModel,
  selectedMode,
  base64Image,
  barcodeData,
  hasDrawing,
  apiKey,
  handleSuccessfulScan,
  handleError,
  imageUri,
  startTimeRef,
  updateAverageProcessingTime,
  handleAccurateScanUsed,
  isFirstDayUnlimited,
  isSubscribed,
  setNoFoodFound,
  setFoodData,
  setActiveTab,
}) => {
  try {
    let foodFound = false;
    
    // Get the appropriate model based on mode and user preference
    const currentModel = getModel('gemini', { 
      selectedMode, 
      selectedModel,
      hasDrawing
    });
    
    console.log(`Using ${selectedMode} mode with Gemini model: ${currentModel}`);

    // Define the JSON schema for the response
    const foodSchema = {
      type: "OBJECT",
      properties: {
        food: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            class: { type: "STRING" },
            type: { type: "STRING" },
            calories: {
              type: "OBJECT",
              properties: {
                amount: { type: "NUMBER" },
                marginOfErrorPercent: { type: "NUMBER" }
              }
            },
            proteins: {
              type: "OBJECT",
              properties: {
                amount: { type: "NUMBER" },
                marginOfErrorPercent: { type: "NUMBER" }
              }
            },
            carbohydrates: {
              type: "OBJECT",
              properties: {
                amount: { type: "NUMBER" },
                marginOfErrorPercent: { type: "NUMBER" }
              }
            },
            fats: {
              type: "OBJECT",
              properties: {
                amount: { type: "NUMBER" },
                marginOfErrorPercent: { type: "NUMBER" }
              }
            },
            fiber: {
              type: "OBJECT",
              properties: {
                amount: { type: "NUMBER" },
                marginOfErrorPercent: { type: "NUMBER" }
              }
            },
            sodium: {
              type: "OBJECT",
              properties: {
                amount: { type: "NUMBER" },
                marginOfErrorPercent: { type: "NUMBER" }
              }
            },
            ingredients: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  wikipediaLink: { type: "STRING" },
                  description: { type: "STRING" }
                }
              }
            },
            details: {
              type: "OBJECT",
              properties: {
                summary: { type: "STRING" },
                prepTime: { type: "STRING" },
                servingSize: { type: "STRING" },
                wikipediaLink: { type: "STRING" }
              }
            }
          }
        }
      }
    };

    const payload = {
      "contents": [{
        parts: [
          {
            text: selectedMode === 'accurate' ? 
              systemPrompts.accurateMode(hasDrawing, barcodeData) : 
              systemPrompts.fastMode(hasDrawing, barcodeData)
          },
          {
            text: "Analyze this image and provide nutritional information. Be concise and only include the required fields. If the image isn't food, respond with {\"food\": null}. Your response must be in JSON format and follow the schema exactly."
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      }
    };

    // Add schema validation to the request
    const requestHeaders = {
      'Content-Type': 'application/json'
    };

    // Add schema enforcement
    if (foodSchema) {
      requestHeaders['X-Response-Schema'] = JSON.stringify(foodSchema);
    }

    if (selectedMode === 'accurate') {
      // First phase: Get the analysis
      const analysisPayload = {
        "contents": [{
          parts: [
            {
              text: systemPrompts.accurateMode(hasDrawing, barcodeData)
            },
            {
              text: "Analyze this image and provide nutritional information. If the image isn't food, respond with 'No Food Found.' Your response should be a detailed analysis in XML format."
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        }
      };

      const firstResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisPayload),
      });

      const firstResponseJson = await firstResponse.json();
      console.log('Gemini raw response (first phase):', JSON.stringify(firstResponseJson, null, 2));

      if (firstResponseJson.error) {
        console.error("Gemini API error:", firstResponseJson.error);
        throw new Error(firstResponseJson.error.message);
      }

      // Check for prompt safety blocks or other errors
      if (firstResponseJson.promptFeedback?.blockReason || !firstResponseJson.candidates?.[0]?.content) {
        console.log("Model refused to process or no content:", firstResponseJson.promptFeedback);
        setNoFoodFound(true);
        setFoodData(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setActiveTab('');
        foodFound = false;
        return foodFound;
      }

      const firstContent = firstResponseJson.candidates[0].content.parts[0].text;
      console.log('First phase analysis:', firstContent);

      if (firstContent.includes("No Food Found")) {
        setNoFoodFound(true);
        setFoodData(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setActiveTab('');
        foodFound = false;
        return foodFound;
      }

      // Second phase: Generate structured JSON based on the analysis
      console.log("Sending second request to Gemini API (accurate mode)");
      const secondPayload = {
        "contents": [{
          parts: [
            {
              text: "Based on this analysis, generate a JSON response with the nutritional information. The response MUST include ALL fields with no null values. If a value is uncertain:\n" +
                    "- For numerical values: Use the best estimate and increase the marginOfErrorPercent\n" +
                    "- For text values: Use 'Unknown' or provide a reasonable default\n" +
                    "- For links: Use 'https://en.wikipedia.org/wiki/' + ingredient_name\n" +
                    "- For ingredients: Always include at least the visible ingredients\n\n" +
                    "Here's the required format with ALL fields mandatory:\n\n" +
                    "{\n" +
                    "  \"food\": {\n" +
                    "    \"name\": \"[Required: Full name of food]\",\n" +
                    "    \"class\": \"[Required: General category like 'Burrito', 'Sandwich', etc.]\",\n" +
                    "    \"type\": \"[Required: Specific type like 'Chicken', 'Beef', etc.]\",\n" +
                    "    \"calories\": { \"amount\": \"[Required: Best estimate]\", \"marginOfErrorPercent\": \"[Required: 10-50]\" },\n" +
                    "    \"proteins\": { \"amount\": \"[Required: Best estimate]\", \"marginOfErrorPercent\": \"[Required: 10-50]\" },\n" +
                    "    \"carbohydrates\": { \"amount\": \"[Required: Best estimate]\", \"marginOfErrorPercent\": \"[Required: 10-50]\" },\n" +
                    "    \"fats\": { \"amount\": \"[Required: Best estimate]\", \"marginOfErrorPercent\": \"[Required: 10-50]\" },\n" +
                    "    \"fiber\": { \"amount\": \"[Required: Best estimate]\", \"marginOfErrorPercent\": \"[Required: 10-50]\" },\n" +
                    "    \"sodium\": { \"amount\": \"[Required: Best estimate in mg]\", \"marginOfErrorPercent\": \"[Required: 10-50]\" },\n" +
                    "    \"ingredients\": [\n" +
                    "      // At least one ingredient required\n" +
                    "      { \n" +
                    "        \"name\": \"[Required: Ingredient name]\",\n" +
                    "        \"wikipediaLink\": \"[Required: Wikipedia URL or 'https://en.wikipedia.org/wiki/' + name]\",\n" +
                    "        \"description\": \"[Required: Brief description]\"\n" +
                    "      }\n" +
                    "    ],\n" +
                    "    \"details\": {\n" +
                    "      \"summary\": \"[Required: Brief description of the food]\",\n" +
                    "      \"prepTime\": \"[Required: Estimated or 'Unknown']\",\n" +
                    "      \"servingSize\": \"[Required: Best estimate with measurements]\",\n" +
                    "      \"wikipediaLink\": \"[Required: Wikipedia URL or 'https://en.wikipedia.org/wiki/' + food_name]\"\n" +
                    "    }\n" +
                    "  }\n" +
                    "}\n\n" +
                    "IMPORTANT:\n" +
                    "1. ALL fields must be provided - no null values allowed\n" +
                    "2. Use higher marginOfErrorPercent (up to 50%) for uncertain values\n" +
                    "3. Always include visible ingredients with descriptions\n" +
                    "4. Provide reasonable estimates based on the analysis\n\n" +
                    "Here's the analysis to use:\n\n" +
                    firstContent
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      };

      const secondResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(secondPayload),
      });

      const secondResponseJson = await secondResponse.json();
      console.log('Gemini raw response (second phase):', JSON.stringify(secondResponseJson, null, 2));

      if (secondResponseJson.error) {
        console.error("Gemini API error (second phase):", secondResponseJson.error);
        throw new Error(secondResponseJson.error.message);
      }

      const content = secondResponseJson.candidates[0].content.parts[0].text;
      console.log('Second phase response:', content);

      try {
        // Try to clean up the response if it's not proper JSON
        let cleanContent = content;
        if (!cleanContent.startsWith('{')) {
          const startIndex = cleanContent.indexOf('{');
          if (startIndex !== -1) {
            cleanContent = cleanContent.substring(startIndex);
          }
        }
        if (!cleanContent.endsWith('}')) {
          const endIndex = cleanContent.lastIndexOf('}');
          if (endIndex !== -1) {
            cleanContent = cleanContent.substring(0, endIndex + 1);
          }
        }

        const parsedData = JSON.parse(cleanContent);
        console.log('Parsed nutritional data:', parsedData);

        if (parsedData && parsedData.food) {
          foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData, hasDrawing, currentModel);
        } else {
          throw new Error("Parsed data is missing required properties.");
        }
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        console.error("Failed content:", content);
        handleError(parseError, imageUri, barcodeData);
        foodFound = false;
      }
    } else {
      // Original fast mode code
      if (hasDrawing) {
        console.log(`Using fast mode with circle selection for Gemini model: ${currentModel}`);
        
        // First phase: Identify the circled food
        const circleStartTime = Date.now();
        const firstPayload = {
          "contents": [{
            parts: [
              {
                text: "You are a food identifier. Your task is to identify ONLY the food item that is circled in white in the image. Ignore all other food items."
              },
              {
                text: "What food item is circled in this image? If no food is circled, respond with 'The circled food is not identifiable.'"
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1024,
          }
        };

        const firstResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(firstPayload),
        });

        const firstResponseJson = await firstResponse.json();
        console.log('Gemini raw response (circle identification):', JSON.stringify(firstResponseJson, null, 2));

        if (firstResponseJson.error) {
          console.error("Gemini API error:", firstResponseJson.error);
          throw new Error(firstResponseJson.error.message);
        }

        // Check for prompt safety blocks or other errors
        if (firstResponseJson.promptFeedback?.blockReason || !firstResponseJson.candidates?.[0]?.content) {
          console.log("Model refused to process or no content:", firstResponseJson.promptFeedback);
          setNoFoodFound(true);
          setFoodData(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setActiveTab('');
          foodFound = false;
          return foodFound;
        }

        const firstResponseText = firstResponseJson.candidates[0].content.parts[0].text;
        console.log('Circle identification result:', firstResponseText);
        
        const circleEndTime = Date.now();
        const circleProcessingDuration = circleEndTime - circleStartTime;
        console.log(`Circle selection processing duration for ${currentModel}: ${circleProcessingDuration}ms`);
        
        // Update the average processing time for circle selection
        await updateAverageProcessingTime(
          'gemini',
          currentModel,
          'circle',
          circleProcessingDuration
        );

        if (firstResponseText.includes("not identifiable")) {
          setNoFoodFound(true);
          setFoodData(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setActiveTab('');
          foodFound = false;
        } else {
          // Second phase: Get nutritional information for the identified food
          const secondPayload = {
            "contents": [{
              parts: [
                {
                  text: systemPrompts.fastMode(hasDrawing, barcodeData)
                },
                {
                  text: `The circled food has been identified as: ${firstResponseText}. Please provide detailed nutritional information for this specific food item in JSON format following the schema exactly.`
                },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            }
          };

          const secondResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(secondPayload),
          });

          const secondResponseJson = await secondResponse.json();
          console.log('Gemini raw response (nutritional info):', JSON.stringify(secondResponseJson, null, 2));

          if (secondResponseJson.error) {
            console.error("Gemini API error:", secondResponseJson.error);
            throw new Error(secondResponseJson.error.message);
          }

          // Check for prompt safety blocks or other errors
          if (secondResponseJson.promptFeedback?.blockReason || !secondResponseJson.candidates?.[0]?.content) {
            console.log("Model refused to process or no content:", secondResponseJson.promptFeedback);
            setNoFoodFound(true);
            setFoodData(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setActiveTab('');
            foodFound = false;
            return foodFound;
          }

          const content = secondResponseJson.candidates[0].content.parts[0].text;
          console.log('Nutritional info response:', content);

          try {
            // Try to clean up the response if it's not proper JSON
            let cleanContent = content;
            if (!cleanContent.startsWith('{')) {
              const startIndex = cleanContent.indexOf('{');
              if (startIndex !== -1) {
                cleanContent = cleanContent.substring(startIndex);
              }
            }
            if (!cleanContent.endsWith('}')) {
              const endIndex = cleanContent.lastIndexOf('}');
              if (endIndex !== -1) {
                cleanContent = cleanContent.substring(0, endIndex + 1);
              }
            }

            console.log('Cleaned content:', cleanContent);
            const parsedData = JSON.parse(cleanContent);
            console.log('Parsed nutritional data:', parsedData);

            if (parsedData && parsedData.food) {
              foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData, hasDrawing, currentModel);
            } else {
              throw new Error("Parsed data is missing required properties.");
            }
          } catch (parseError) {
            console.error("Error parsing JSON response:", parseError);
            console.error("Failed content:", content);
            handleError(parseError, imageUri, barcodeData);
            foodFound = false;
          }
        }
      } else {
        // Original fast mode code for non-circle-selected images
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(payload),
        });

        const responseJson = await response.json();
        console.log('Gemini raw response:', JSON.stringify(responseJson, null, 2));

        if (responseJson.error) {
          console.error("Gemini API error:", responseJson.error);
          throw new Error(responseJson.error.message);
        }

        // Check for prompt safety blocks or other errors
        if (responseJson.promptFeedback?.blockReason || !responseJson.candidates?.[0]?.content) {
          console.log("Model refused to process or no content:", responseJson.promptFeedback);
          setNoFoodFound(true);
          setFoodData(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setActiveTab('');
          foodFound = false;
        } else {
          const content = responseJson.candidates[0].content.parts[0].text;
          console.log('Gemini content:', content);

          if (content.includes("No Food Found.") || content.includes("\"food\": null")) {
            setNoFoodFound(true);
            setFoodData(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setActiveTab('');
            foodFound = false;
          } else {
            try {
              // Try to clean up the response if it's not proper JSON
              let cleanContent = content;
              if (!cleanContent.startsWith('{')) {
                const startIndex = cleanContent.indexOf('{');
                if (startIndex !== -1) {
                  cleanContent = cleanContent.substring(startIndex);
                }
              }
              if (!cleanContent.endsWith('}')) {
                const endIndex = cleanContent.lastIndexOf('}');
                if (endIndex !== -1) {
                  cleanContent = cleanContent.substring(0, endIndex + 1);
                }
              }

              console.log('Cleaned content:', cleanContent);
              const parsedData = JSON.parse(cleanContent);
              console.log('Parsed data:', parsedData);

              if (parsedData && parsedData.food) {
                foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData, hasDrawing, currentModel);
              } else {
                throw new Error("Parsed data is missing required properties.");
              }
            } catch (parseError) {
              console.error("Error parsing JSON response:", parseError);
              console.error("Failed content:", content);
              handleError(parseError, imageUri, barcodeData);
              foodFound = false;
            }
          }
        }
      }
    }

    // Calculate processing time regardless of food found status
    const endTime = Date.now();
    const processingDuration = endTime - startTimeRef.current;
    console.log(`Processing duration for ${currentModel} (${selectedMode}): ${processingDuration}ms`);
    
    // Update the average processing time
    await updateAverageProcessingTime(
      'gemini',
      currentModel,
      selectedMode,
      processingDuration
    );
    
    return foodFound;
  } catch (error) {
    console.error("Error in Gemini provider:", error);
    throw error;
  }
};