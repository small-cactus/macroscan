import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Platform,
  Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');
const SPACING = 20;

const ImageAnalyzer = () => {
  const [image, setImage] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const pickImage = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo library to use this feature.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const manipulatedImage = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: SaveFormat.JPEG, base64: true }
        );
        setImage(manipulatedImage);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        Alert.alert('Error', 'Failed to process image');
      }
    }
  }, []);

  const sendToOpenAI = useCallback(async () => {
    if (!image || !prompt.trim()) {
      Alert.alert('Missing Information', 'Please select an image and enter a prompt');
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);
      const apiKey = await AsyncStorage.getItem('@openai_api_key');
      
      if (!apiKey) {
        Alert.alert('Configuration Required', 'Please set up your OpenAI API key in settings');
        return;
      }

      const requestBody = {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You analyze images and provide structured data about their attributes."
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image.base64}`
                }
              }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "image_analysis_schema",
            schema: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "A brief title describing the image"
                },
                description: {
                  type: "string",
                  description: "A detailed description of the image"
                },
                attributes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { 
                        type: "string",
                        description: "Name of the attribute"
                      },
                      value: { 
                        type: "string",
                        description: "Value of the attribute"
                      },
                      confidence: { 
                        type: "number",
                        description: "Confidence score from 0 to 100",
                        minimum: 0,
                        maximum: 100
                      }
                    },
                    required: ["name", "value", "confidence"]
                  }
                },
                tags: {
                  type: "array",
                  items: { 
                    type: "string",
                    description: "Related keywords or tags"
                  }
                }
              },
              required: ["title", "description", "attributes", "tags"],
              additionalProperties: false
            }
          }
        }
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      setResponse(JSON.parse(data.choices[0].message.content));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Analysis Failed', error.message);
    } finally {
      setLoading(false);
    }
  }, [image, prompt]);

  const renderAttribute = useCallback(({ name, value, confidence }) => (
    <View key={name} style={styles.attributeCard}>
      <LinearGradient
        colors={['#2a2a2a', '#3a3a3a']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.attributeHeader}>
        <Text style={styles.attributeName}>{name}</Text>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>{confidence}%</Text>
        </View>
      </View>
      <Text style={styles.attributeValue}>{value}</Text>
    </View>
  ), []);

  const renderTags = useCallback((tags) => (
    <View style={styles.tagsContainer}>
      {tags.map((tag, index) => (
        <View key={index} style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ))}
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1a1a1a', '#2a2a2a']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Text style={styles.title}>Image Analyzer</Text>
        <Text style={styles.subtitle}>Powered by GPT-4o</Text>

        <View style={styles.imageSection}>
          {image ? (
            <TouchableOpacity
              onPress={pickImage}
              style={styles.imageContainer}
              activeOpacity={0.9}
            >
              <Image source={{ uri: image.uri }} style={styles.image} />
              <BlurView intensity={80} style={styles.imageOverlay}>
                <MaterialIcons name="edit" size={24} color="#fff" />
                <Text style={styles.imageOverlayText}>Change Image</Text>
              </BlurView>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add-photo-alternate" size={40} color="#fff" />
              <Text style={styles.uploadText}>Select an Image</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            placeholder="What would you like to know about this image?"
            placeholderTextColor="#666"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            maxLength={500}
            returnKeyType="done"
            blurOnSubmit={true}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.analyzeButton,
            (!image || !prompt.trim() || loading) && styles.disabledButton
          ]}
          onPress={sendToOpenAI}
          disabled={!image || !prompt.trim() || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialIcons name="analytics" size={24} color="#fff" />
              <Text style={styles.buttonText}>Analyze Image</Text>
            </>
          )}
        </TouchableOpacity>

        {response && (
    <View style={styles.responseContainer}>
      <LinearGradient
        colors={['#2a2a2a', '#3a3a3a']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <Text style={styles.responseTitle}>{response.title}</Text>
      <Text style={styles.description}>{response.description}</Text>
      
      <Text style={styles.sectionTitle}>Attributes</Text>
      <View style={styles.attributesContainer}>
        {response.attributes.map(renderAttribute)}
      </View>

      <Text style={styles.sectionTitle}>Tags</Text>
      {renderTags(response.tags)}
    </View>
  )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  responseContainer: {
    borderRadius: 16,
    padding: SPACING,
    overflow: 'hidden',
    marginBottom: SPACING,
  },
  responseTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: SPACING,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#fff',
    marginBottom: SPACING * 1.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: SPACING,
    marginTop: SPACING,
  },
  attributesContainer: {
    gap: SPACING,
  },
  attributeCard: {
    borderRadius: 12,
    padding: SPACING,
    overflow: 'hidden',
  },
  attributeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  attributeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  confidenceBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  attributeValue: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#3a3a3a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4a4a4a',
  },
  tagText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  jsonContainer: {
    backgroundColor: '#1a1a1a',
    padding: SPACING,
    borderRadius: 12,
    marginTop: SPACING / 2,
  },
  emailText: {
    color: '#00ff00', // Bright green for email
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: SPACING * 2,
  },
  imageSection: {
    marginBottom: SPACING * 1.5,
  },
  imageContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  image: {
    width: '100%',
    height: width * 0.75,
    backgroundColor: '#2a2a2a',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING,
    gap: 8,
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    height: width * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3a3a3a',
    borderStyle: 'dashed',
  },
  uploadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: SPACING / 2,
  },
  inputSection: {
    marginBottom: SPACING * 1.5,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: SPACING,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  analyzeButton: {
    backgroundColor: '#007AFF',
    padding: SPACING,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING * 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  disabledButton: {
    backgroundColor: '#4a4a4a',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  responseContainer: {
    borderRadius: 16,
    padding: SPACING,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  responseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: SPACING / 2,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#fff',
  },
});

export default ImageAnalyzer;