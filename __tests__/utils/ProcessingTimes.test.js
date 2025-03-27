import { 
  updateAverageProcessingTime, 
  loadAverageProcessingTimes 
} from '../../screens/providers/processingTimes';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('ProcessingTimes Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateAverageProcessingTime', () => {
    it('updates processing time for fast mode correctly', async () => {
      // Mock existing data in AsyncStorage
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        anthropic: {
          'claude-3-haiku-20240307': {
            fast: 4000,
            accurate: 8000
          },
          'claude-3-5-sonnet-20240620': {
            fast: 6000,
            accurate: 12000
          }
        },
        openai: {
          'gpt-4o': {
            fast: 5000,
            accurate: 10000
          }
        },
        gemini: {
          'gemini-1.5-flash': {
            fast: 5000,
            accurate: 15000
          },
          'gemini-1.5-pro': {
            fast: 4000,
            accurate: 9000
          }
        }
      }));

      // Update with a new processing time of 3 seconds for fast mode
      await updateAverageProcessingTime('anthropic', 'claude-3-haiku-20240307', 'fast', 3000);

      // Verify AsyncStorage was called with updated values
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@average_processing_times',
        expect.any(String)
      );

      // Parse the JSON that was passed to AsyncStorage.setItem
      const updatedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      
      // Check that the data structure is as expected
      expect(updatedData).toHaveProperty('anthropic');
      expect(updatedData).toHaveProperty('openai');
      expect(updatedData).toHaveProperty('gemini');
    });

    it('initializes data if no previous data exists', async () => {
      // Mock no existing data in AsyncStorage
      AsyncStorage.getItem.mockResolvedValue(null);

      // Update with a new processing time of 4 seconds for accurate mode
      await updateAverageProcessingTime('anthropic', 'claude-3-5-sonnet-20240620', 'accurate', 4000);

      // Verify AsyncStorage was called with initial values
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@average_processing_times',
        expect.any(String)
      );

      // Parse the JSON that was passed to AsyncStorage.setItem
      const initializedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      
      // Check that the data structure is as expected
      expect(initializedData).toHaveProperty('anthropic');
      expect(initializedData).toHaveProperty('openai');
      expect(initializedData).toHaveProperty('gemini');
    });
  });

  describe('loadAverageProcessingTimes', () => {
    it('loads existing processing times correctly', async () => {
      // Mock existing data in AsyncStorage
      const mockData = {
        anthropic: {
          'claude-3-haiku-20240307': {
            fast: 4000,
            accurate: 8000
          },
          'claude-3-5-sonnet-20240620': {
            fast: 6000,
            accurate: 12000
          }
        },
        openai: {
          'gpt-4o': {
            fast: 5000,
            accurate: 10000
          }
        },
        gemini: {
          'gemini-1.5-flash': {
            fast: 5000,
            accurate: 15000
          },
          'gemini-1.5-pro': {
            fast: 4000,
            accurate: 9000
          }
        }
      };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      // Load processing times
      const result = await loadAverageProcessingTimes();

      // Verify AsyncStorage.getItem was called
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@average_processing_times');
      
      // Verify returned data matches what was in AsyncStorage
      expect(result).toEqual(mockData);
    });

    it('returns default values if no data exists', async () => {
      // Mock no existing data in AsyncStorage
      AsyncStorage.getItem.mockResolvedValue(null);

      // Load processing times
      const result = await loadAverageProcessingTimes();

      // Verify AsyncStorage.getItem was called
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@average_processing_times');
      
      // Verify default values are returned
      expect(result).toHaveProperty('anthropic');
      expect(result).toHaveProperty('openai');
      expect(result).toHaveProperty('gemini');
    });
  });
}); 