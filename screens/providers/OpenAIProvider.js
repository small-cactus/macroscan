import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { systemPrompts } from './prompts';
import { getModel } from './models';

export const handleOpenAIScan = async ({
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
    const currentModel = getModel('openai', { 
      selectedMode, 
      selectedModel,
      hasDrawing
    });
    
    console.log(`Using ${selectedMode} mode with OpenAI model: ${currentModel}`);

    // Define the JSON schema for the response
    const foodSchema = {
      name: "food_analysis",
      strict: true,
      schema: {
        type: "object",
        properties: {
          food: {
            type: "object",
            properties: {
              name: { type: "string" },
              class: { type: "string" },
              type: { type: "string" },
              calories: {
                type: "object",
                properties: {
                  amount: { type: "number" },
                  marginOfErrorPercent: { type: "number" }
                },
                required: ["amount", "marginOfErrorPercent"],
                additionalProperties: false
              },
              proteins: {
                type: "object",
                properties: {
                  amount: { type: "number" },
                  marginOfErrorPercent: { type: "number" }
                },
                required: ["amount", "marginOfErrorPercent"],
                additionalProperties: false
              },
              carbohydrates: {
                type: "object",
                properties: {
                  amount: { type: "number" },
                  marginOfErrorPercent: { type: "number" }
                },
                required: ["amount", "marginOfErrorPercent"],
                additionalProperties: false
              },
              fats: {
                type: "object",
                properties: {
                  amount: { type: "number" },
                  marginOfErrorPercent: { type: "number" }
                },
                required: ["amount", "marginOfErrorPercent"],
                additionalProperties: false
              },
              fiber: {
                type: "object",
                properties: {
                  amount: { type: "number" },
                  marginOfErrorPercent: { type: "number" }
                },
                required: ["amount", "marginOfErrorPercent"],
                additionalProperties: false
              },
              sodium: {
                type: "object",
                properties: {
                  amount: { type: "number" },
                  marginOfErrorPercent: { type: "number" }
                },
                required: ["amount", "marginOfErrorPercent"],
                additionalProperties: false
              },
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    wikipediaLink: { type: "string" },
                    description: { type: "string" }
                  },
                  required: ["name", "wikipediaLink", "description"],
                  additionalProperties: false
                }
              },
              details: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  prepTime: { type: "string" },
                  servingSize: { type: "string" },
                  wikipediaLink: { type: "string" }
                },
                required: ["summary", "prepTime", "servingSize", "wikipediaLink"],
                additionalProperties: false
              }
            },
            required: ["name", "class", "type", "calories", "proteins", "carbohydrates", "fats", "fiber", "sodium", "ingredients", "details"],
            additionalProperties: false
          }
        },
        required: ["food"],
        additionalProperties: false
      }
    };

    const payload = {
      model: currentModel,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: selectedMode === 'accurate' ? systemPrompts.accurateMode(hasDrawing, barcodeData) : systemPrompts.fastMode(hasDrawing, barcodeData)
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Analyze this image and provide nutritional information as specified. If the image isn't food, just say '{No Food Found.}'. Your response must be in JSON format." 
            },
            { 
              type: "image_url", 
              image_url: { 
                url: `data:image/jpeg;base64,${base64Image}` 
              } 
            }
          ]
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: foodSchema
      }
    };

    // If using circle selection, track its timing
    let circleStartTime;
    if (hasDrawing) {
      circleStartTime = Date.now();
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseJson = await response.json();
    console.log('OpenAI raw response:', JSON.stringify(responseJson, null, 2));

    // If we were using circle selection, record its timing
    if (hasDrawing) {
      const circleEndTime = Date.now();
      const circleProcessingDuration = circleEndTime - circleStartTime;
      console.log(`Circle selection processing duration for ${currentModel}: ${circleProcessingDuration}ms`);
      
      // Update the average processing time for circle selection
      await updateAverageProcessingTime(
        'openai',
        currentModel,
        'circle',
        circleProcessingDuration
      );
    }

    if (responseJson.error) {
      console.error("OpenAI API error:", responseJson.error);
    //   Alert.alert('Error', 'OpenAI API error');
      throw new Error(responseJson.error.message);
    }

    // Check for refusal
    if (responseJson.choices[0].message.refusal) {
      console.log("Model refused to process:", responseJson.choices[0].message.refusal);
      setNoFoodFound(true);
      setFoodData(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setActiveTab('');
      foodFound = false;
      return foodFound;
    }

    // Handle normal response
    const content = responseJson.choices[0].message.content;
    console.log('OpenAI response content:', content);
    
    if (selectedMode === 'fast' && hasDrawing) {
      console.log(`Using fast mode with circle selection for OpenAI model: ${currentModel}`);
      
      // First phase: Identify the circled food
      const circleStartTime = Date.now();
      const firstPayload = {
        model: currentModel,
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content: "You are a food identifier. Your task is to identify ONLY the food item that is circled in white in the image. Ignore all other food items."
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "What food item is circled in this image? If no food is circled, respond with 'The circled food is not identifiable.'" 
              },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:image/jpeg;base64,${base64Image}` 
                } 
              }
            ]
          }
        ]
      };

      const firstResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(firstPayload),
      });

      const firstResponseJson = await firstResponse.json();
      console.log('OpenAI raw response (circle identification):', JSON.stringify(firstResponseJson, null, 2));
      
      if (firstResponseJson.error) {
        console.error("OpenAI API error:", firstResponseJson.error);
        throw new Error(firstResponseJson.error.message);
      }

      const firstResponseText = firstResponseJson.choices[0].message.content;
      console.log('Circle identification result:', firstResponseText);
      
      const circleEndTime = Date.now();
      const circleProcessingDuration = circleEndTime - circleStartTime;
      console.log(`Circle selection processing duration for ${currentModel}: ${circleProcessingDuration}ms`);
      
      // Update the average processing time for circle selection
      await updateAverageProcessingTime(
        'openai',
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
          model: currentModel,
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: systemPrompts.fastMode(hasDrawing, barcodeData)
            },
            {
              role: "user",
              content: [
                { 
                  type: "text", 
                  text: `The circled food has been identified as: ${firstResponseText}. Please provide detailed nutritional information for this specific food item in JSON format.` 
                },
                { 
                  type: "image_url", 
                  image_url: { 
                    url: `data:image/jpeg;base64,${base64Image}` 
                  } 
                }
              ]
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: foodSchema
          }
        };

        const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(secondPayload),
        });

        const secondResponseJson = await secondResponse.json();
        console.log('OpenAI raw response (nutritional info):', JSON.stringify(secondResponseJson, null, 2));
        
        if (secondResponseJson.error) {
          console.error("OpenAI API error:", secondResponseJson.error);
          throw new Error(secondResponseJson.error.message);
        }

        const content = secondResponseJson.choices[0].message.content;
        console.log('Nutritional info response:', content);

        try {
          const parsedData = JSON.parse(content);
          console.log('Parsed nutritional data:', parsedData);
          if (parsedData && parsedData.food) {
            foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData, hasDrawing, currentModel);
          } else {
            throw new Error("Parsed data is missing required properties.");
          }
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
          handleError(parseError, imageUri, barcodeData);
          foodFound = false;
        }
      }
    } else if (content.includes("No Food Found.}")) {
      setNoFoodFound(true);
      setFoodData(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setActiveTab('');
      foodFound = false;
    } else {
      try {
        const parsedData = JSON.parse(content);
        console.log('Parsed nutritional data:', parsedData);
        if (parsedData && parsedData.food) {
          foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData, hasDrawing, currentModel);
        } else {
          throw new Error("Parsed data is missing required properties.");
        }
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        handleError(parseError, imageUri, barcodeData);
        foodFound = false;
      }
    }

    // Calculate processing time regardless of food found status
    const endTime = Date.now();
    const processingDuration = endTime - startTimeRef.current;
    console.log(`Processing duration for ${currentModel} (${selectedMode}): ${processingDuration}ms`);
    
    // Update the average processing time
    await updateAverageProcessingTime(
      'openai',
      currentModel,
      selectedMode,
      processingDuration
    );
    
    return foodFound;
  } catch (error) {
    console.error("Error in OpenAI provider:", error);
    throw error;
  }
}; 