import Anthropic from '@anthropic-ai/sdk';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { systemPrompts } from './prompts';
import { MODELS, getModel } from './models';

export const handleAnthropicScan = async ({
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
    const anthropic = new Anthropic({ apiKey });
    let foodFound = false;
    
    // Get the appropriate model based on mode and user preference
    const currentModel = getModel('anthropic', { 
      selectedMode, 
      selectedModel,
      hasDrawing
    });
    
    // Force complex processing if the selected model is set to complex even when scanning mode is fast.
    const effectiveModel = selectedModel === MODELS.anthropic.complex ? MODELS.anthropic.complex : currentModel;
    
    console.log(`Using ${selectedMode} mode with Anthropic model: ${effectiveModel}`);

    // Changed condition - now based on selectedMode instead of model
    if (selectedMode === 'accurate') {
      console.log("Using accurate mode processing");
      // Accurate mode logic
      console.log("Using accurate mode. Sending first request to Anthropic API");
      const firstResponse = await anthropic.messages.create({
        model: effectiveModel,
        max_tokens: 4096,
        temperature: 0.7,
        system: systemPrompts.accurateMode(hasDrawing, barcodeData),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and provide nutritional information as specified. If the image doesn't contain any food AT ALL, just say '{No Food Found.}'. Your response should be in perfect JSON format.",
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
          },
          {
            role: "assistant",
            content: "",
          },
        ],
      });

      console.log('Anthropic raw response (first phase):', JSON.stringify(firstResponse, null, 2));
      const firstResponseText = firstResponse.content[0].text;
      console.log('First phase analysis:', firstResponseText);
      if (firstResponseText.includes("No Food Found.}")) {
        setNoFoodFound(true);
        setFoodData(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setActiveTab('');
        foodFound = false;
      } else {
        // Proceed to second request
        console.log("Sending second request to Anthropic API (accurate mode)");
        const secondResponse = await anthropic.messages.create({
          model: effectiveModel,
          max_tokens: 4096,
          temperature: 0.7,
          system: systemPrompts.accurateModeJson,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this image and provide nutritional information as specified. If the image isn't food, just say '{No Food Found.}'",
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
            },
            {
              role: "assistant",
              content: `{${firstResponse.content[0].text}`,
            },
            {
              role: "user",
              content: "Now, based on your analysis and focusing on the highest-scored thought path, provide the JSON data as specified. Continue from the opening curly brace.",
            },
            {
              role: "assistant",
              content: "{",
            },
          ],
        });

        console.log('Anthropic raw response (second phase):', JSON.stringify(secondResponse, null, 2));
        const responseText = secondResponse.content[0].text;
        console.log('Second phase response:', responseText);
        const jsonString = `{${responseText}`;
        try {
          const parsedData = JSON.parse(jsonString);
          console.log('Parsed nutritional data:', parsedData);
          if (parsedData && parsedData.food) {
            foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData, hasDrawing, effectiveModel);
          } else {
            throw new Error("Parsed data is missing required properties.");
          }
        } catch (parseError) {
          console.error("Error parsing JSON response (accurate mode):", parseError);
          handleError(parseError, imageUri, barcodeData);
          foodFound = false;
        }
      }
    } else {
      if (selectedMode === 'fast') {
        if (hasDrawing) {
          console.log(`Using fast mode with Anthropic model: ${effectiveModel}`);
          
          // First request: Ask for plain text identification of the circled food
          const circleStartTime = Date.now();
          const firstResponse = await anthropic.messages.create({
            model: effectiveModel,
            max_tokens: 4096,
            temperature: 0.5,
            system: "You are a food identifier. Your task is to identify ONLY the food item that is circled in white in the image. Ignore all other food items.",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "What food item is circled in this image? If no food is circled, respond with 'The circled food is not identifiable.'",
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
              },
              {
                role: "assistant",
                content: "The circled food item is:",
              },
            ],
          });

          console.log('Anthropic raw response (circle identification):', JSON.stringify(firstResponse, null, 2));
          const firstResponseText = firstResponse.content[0].text;
          console.log('Circle identification result:', firstResponseText);
          const circleEndTime = Date.now();
          const circleProcessingDuration = circleEndTime - circleStartTime;
          console.log(`Circle selection processing duration for ${effectiveModel}: ${circleProcessingDuration}ms`);
          
          // Update the average processing time for circle selection
          await updateAverageProcessingTime(
            'anthropic',
            effectiveModel,
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
            // Second request: Get nutritional information for the identified food
            const response = await anthropic.messages.create({
              model: effectiveModel,
              max_tokens: 4096,
              temperature: 0.5,
              system: systemPrompts.fastMode(hasDrawing, barcodeData),
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `The circled food has been identified as: ${firstResponseText}. Please provide detailed nutritional information for this specific food item in JSON format.`,
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
                },
                {
                  role: "assistant",
                  content: "{",
                },
              ],
            });

            console.log('Anthropic raw response (nutritional info):', JSON.stringify(response, null, 2));
            const responseText = response.content[0].text;
            console.log('Nutritional info response:', responseText);
            const jsonString = `{${responseText}`;
            try {
              const parsedData = JSON.parse(jsonString);
              console.log('Parsed nutritional data:', parsedData);
              if (parsedData && parsedData.food) {
                foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData, hasDrawing, effectiveModel);
              } else {
                throw new Error("Parsed data is missing required properties.");
              }
            } catch (parseError) {
              console.error("Error parsing JSON response (fast mode):", parseError);
              handleError(parseError, imageUri, barcodeData);
              foodFound = false;
            }
          }
        } else {
          // Original fast mode code for non-circle-selected images
          console.log(`Using fast mode with Anthropic model: ${effectiveModel}`);
          const response = await anthropic.messages.create({
            model: effectiveModel,
            max_tokens: 4096,
            temperature: 0.5,
            system: systemPrompts.fastMode(hasDrawing, barcodeData),
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Analyze this image and provide nutritional information as specified, using barcode data if available, otherwise use visual analysis. If the image isn't food, just say '{No Food Found.}'. Your response should be in perfect JSON format.",
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
              },
              {
                role: "assistant",
                content: "{",
              },
            ],
          });

          const responseText = response.content[0].text;
          if (responseText.includes("No Food Found.}")) {
            setNoFoodFound(true);
            setFoodData(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setActiveTab('');
            foodFound = false;
          } else {
            const jsonString = `{${responseText}`;
            try {
              const parsedData = JSON.parse(jsonString);
              if (parsedData && parsedData.food) {
                foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData, hasDrawing, effectiveModel);
              } else {
                throw new Error("Parsed data is missing required properties.");
              }
            } catch (parseError) {
              console.error("Error parsing JSON response (fast mode):", parseError);
              handleError(parseError, imageUri, barcodeData);
              foodFound = false;
            }
          }
        }
      } else {
        // Accurate mode logic
        console.log("Using accurate mode. Sending first request to Anthropic API");
        const firstResponse = await anthropic.messages.create({
          model: effectiveModel,
          max_tokens: 4096,
          temperature: 0.7,
          system: systemPrompts.accurateMode(hasDrawing, barcodeData),
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this image and provide nutritional information as specified. If the image doesn't contain any food AT ALL, just say '{No Food Found.}'. Your response should be in perfect JSON format.",
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
            },
            {
              role: "assistant",
              content: "",
            },
          ],
        });

        console.log('Anthropic raw response (first phase):', JSON.stringify(firstResponse, null, 2));
        const firstResponseText = firstResponse.content[0].text;
        console.log('First phase analysis:', firstResponseText);
        if (firstResponseText.includes("No Food Found.}")) {
          setNoFoodFound(true);
          setFoodData(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setActiveTab('');
          foodFound = false;
        } else {
          // Proceed to second request
          console.log("Sending second request to Anthropic API (accurate mode)");
          const secondResponse = await anthropic.messages.create({
            model: effectiveModel,
            max_tokens: 4096,
            temperature: 0.7,
            system: systemPrompts.accurateModeJson,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Analyze this image and provide nutritional information as specified. If the image isn't food, just say '{No Food Found.}'",
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
              },
              {
                role: "assistant",
                content: `{${firstResponse.content[0].text}`,
              },
              {
                role: "user",
                content: "Now, based on your analysis and focusing on the highest-scored thought path, provide the JSON data as specified. Continue from the opening curly brace.",
              },
              {
                role: "assistant",
                content: "{",
              },
            ],
          });

          console.log('Anthropic raw response (second phase):', JSON.stringify(secondResponse, null, 2));
          const responseText = secondResponse.content[0].text;
          console.log('Second phase response:', responseText);
          const jsonString = `{${responseText}`;
          try {
            const parsedData = JSON.parse(jsonString);
            console.log('Parsed nutritional data:', parsedData);
            if (parsedData && parsedData.food) {
              foodFound = await handleSuccessfulScan(parsedData, imageUri, barcodeData, hasDrawing, effectiveModel);
            } else {
              throw new Error("Parsed data is missing required properties.");
            }
          } catch (parseError) {
            console.error("Error parsing JSON response (accurate mode):", parseError);
            handleError(parseError, imageUri, barcodeData);
            foodFound = false;
          }
        }
      }
    }

    // Calculate processing time regardless of food found status
    const endTime = Date.now();
    const processingDuration = endTime - startTimeRef.current;
    console.log(`Processing duration for ${effectiveModel} (${selectedMode}): ${processingDuration}ms`);
    
    // Update the average processing time
    await updateAverageProcessingTime(
      'anthropic',
      effectiveModel,
      selectedMode,
      processingDuration
    );
    
    return foodFound;
  } catch (error) {
    console.error("Error in Anthropic provider:", error);
    throw error;
  }
}; 