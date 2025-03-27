import * as Haptics from 'expo-haptics';

export const handleSuccessfulScan = async (foodData, imageUri, barcodeData, food) => {
  try {
    // Trigger haptic success feedback
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return true;
  } catch (error) {
    console.error('Error in handleSuccessfulScan:', error);
    return false;
  }
}; 