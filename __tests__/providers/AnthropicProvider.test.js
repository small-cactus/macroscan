import { handleAnthropicScan } from '../../screens/providers/AnthropicProvider';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn(() => Promise.resolve({
          id: 'msg_test123',
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                name: 'Test Food Item',
                nutritionalInfo: {
                  calories: 250,
                  protein: 10,
                  carbs: 30,
                  fat: 12
                },
                ingredients: ['ingredient1', 'ingredient2'],
                details: 'This is a test food item'
              })
            }
          ]
        }))
      }
    }))
  };
});

describe('AnthropicProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('correctly processes image data and returns food information', async () => {
    // Simulate base64 image data
    const base64ImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAoHBwkHBgoJCAkLCwoMDxkQDw4ODx4WFxIZJCAmJSMgIyIoLTkwKCo2KyIjMkQyNjs9QEBAJjBGS0U+Sjk/QD3/2wBDAQsLCw8NDx0QEB09KSMpPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT3/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';
    
    // Call the function with test data
    const result = await handleAnthropicScan(
      base64ImageData,
      'accurate',
      null,
      false,
      'en'
    );
    
    // Verify Anthropic was called with correct parameters
    expect(Anthropic).toHaveBeenCalled();
    const anthropicInstance = Anthropic.mock.results[0].value;
    expect(anthropicInstance.messages.create).toHaveBeenCalled();
    
    // Check the call parameters to make sure image data was included
    const createCall = anthropicInstance.messages.create.mock.calls[0][0];
    expect(createCall.model).toBeDefined();
    expect(createCall.max_tokens).toBeDefined();
    expect(createCall.messages).toBeDefined();
    expect(createCall.messages[0].role).toBe('user');
    expect(createCall.messages[0].content).toContainEqual(
      expect.objectContaining({
        type: 'image',
        source: expect.objectContaining({
          data: base64ImageData
        })
      })
    );
    
    // Verify the returned data is processed correctly
    expect(result).toEqual({
      name: 'Test Food Item',
      nutritionalInfo: {
        calories: 250,
        protein: 10,
        carbs: 30,
        fat: 12
      },
      ingredients: ['ingredient1', 'ingredient2'],
      details: 'This is a test food item'
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock the API to throw an error
    const errorMessage = 'API Error';
    Anthropic.mockImplementationOnce(() => ({
      messages: {
        create: jest.fn(() => Promise.reject(new Error(errorMessage)))
      }
    }));
    
    // Call the function with test data expecting it to throw
    await expect(
      handleAnthropicScan(
        'image-data',
        'accurate',
        null,
        false,
        'en'
      )
    ).rejects.toThrow(errorMessage);
  });
}); 