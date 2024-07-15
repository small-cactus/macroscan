import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Image, RefreshControl, Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Anthropic from "@anthropic-ai/sdk";
import { SymbolView } from 'expo-symbols';
import SubscriptionModal from './SubscriptionModal';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const isIphoneSE = () => {
    const smallIphoneDimensions = [
      { width: 320, height: 568 }, // iPhone SE (1st generation), iPhone 5, 5S, 5C
      { width: 375, height: 667 }, // iPhone 6, 6S, 7, 8, SE (2nd generation)
      { width: 414, height: 736 }, // iPhone 8 Plus
      { width: 360, height: 640 }, // iPhone SE (2020)
      { width: 375, height: 812 }, // iPhone 12 Mini, iPhone 13 Mini
      { width: 360, height: 780 }, // iPhone 12 Mini, iPhone 13 Mini
    ];
  
    return (
      Platform.OS === 'ios' &&
      smallIphoneDimensions.some(
        dim => (width === dim.width && height === dim.height) || (width === dim.height && height === dim.width)
      )
    );
  };

let previousHistory = [];
let previousGoals = {};
let lastAPICallTime = 0;

const InsightsScreen = () => {
    const { width, height } = Dimensions.get('window');
    const fontSize = width * 0.080;
    const [history, setHistory] = useState([]);
    const [nutrientData, setNutrientData] = useState({ goal: { calories: 0, sodium: 0, carbohydrates: 0, proteins: 0, fats: 0, fiber: 0, sugars: 0 } });
    const [goalModalVisible, setGoalModalVisible] = useState(false);
    const [newGoal, setNewGoal] = useState({ calories: '', sodium: '', carbohydrates: '', proteins: '', fats: '', fiber: '', sugars: '' });
    const [userInfo, setUserInfo] = useState({ height: '', age: '', weight: '', gender: '', activityLevel: '' });
    const [estimatedCalories, setEstimatedCalories] = useState(null);
    const [userName, setUserName] = useState('');
    const [step, setStep] = useState(1);
    const [trends, setTrends] = useState({});
    const colorScheme = useColorScheme();
    const styles = getDynamicStyles(colorScheme);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedModel, setSelectedModel] = useState('claude-3-haiku-20240307');
    const [smartCoachContent, setSmartCoachContent] = useState(null);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [nutrientDataLoaded, setNutrientDataLoaded] = useState(false);
    const hasRunRef = useRef(false);

    const initializeData = async () => {
        await loadUserName();
        await loadHistory();
        await loadLastUsedTime();
        await loadNutrientData();
        await loadUserInfo();
        await loadSelectedModel();
        await loadSmartCoachContent(); // Load AI response
        await loadLastAPICallTime(); // Load last API call time
        await loadPreviousData(); // Load previous history and goals
    
        // Save initial state if not already saved
        const storedHistoryString = await AsyncStorage.getItem('previousHistory');
        const storedGoalsString = await AsyncStorage.getItem('previousGoals');
    
        if (!storedHistoryString) {
            await AsyncStorage.setItem('previousHistory', JSON.stringify(history));
        }
        if (!storedGoalsString) {
            await AsyncStorage.setItem('previousGoals', JSON.stringify(nutrientData.goal));
        }
    };
    
    useEffect(() => {
        initializeData();
    }, []);

    const loadLastAPICallTime = async () => {
        try {
            const storedLastAPICallTime = await AsyncStorage.getItem('lastAPICallTime');
            if (storedLastAPICallTime) {
                lastAPICallTime = parseInt(storedLastAPICallTime, 10);
            }
        } catch (error) {
            console.error("Error loading last API call time from storage", error);
        }
    };
    
    const loadSelectedModel = async () => {
        try {
            const storedModel = await AsyncStorage.getItem('selectedModel');
            if (storedModel) {
                setSelectedModel(storedModel);
            }
        } catch (error) {
            console.error("Error loading selected model from storage", error);
        }
    };

    const loadSmartCoachContent = async () => {
        try {
            const storedSmartCoachContent = await AsyncStorage.getItem('smartCoachContent');
            if (storedSmartCoachContent) {
                setSmartCoachContent(storedSmartCoachContent); // Set AI response as string
            }
        } catch (error) {
            console.error("Error loading Smart Coach content from storage", error);
            await AsyncStorage.removeItem('smartCoachContent');
        }
    };

    useFocusEffect(
        useCallback(() => {
            const refreshScreen = async () => {
                setRefreshing(true);
                await loadHistory();
                checkAndUpdateSmartCoach();
                setRefreshing(false);
            };
            
            refreshScreen();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadHistory().then(() => setRefreshing(false));
    }, []);
    
    const checkAndUpdateSmartCoach = useCallback(async () => {
        if (!historyLoaded || !nutrientDataLoaded) {
            return;
        }
    
        await loadPreviousData();
    
        // console.log("Checking Smart Coach updates...");
        // console.log("Current history:", history);
        // console.log("Current nutrient data:", nutrientData);
    
        const currentTime = Date.now();
        const currentHistoryString = JSON.stringify(history);
        const currentGoalsString = JSON.stringify(nutrientData.goal);
    
        if (
            previousHistory !== currentHistoryString ||
            previousGoals !== currentGoalsString
        ) {
            previousHistory = currentHistoryString;
            previousGoals = currentGoalsString;
    
            await AsyncStorage.setItem('previousHistory', currentHistoryString);
            await AsyncStorage.setItem('previousGoals', currentGoalsString);
    
            if (history.length === 0 || Object.keys(nutrientData.goal).length === 0) {
                setSmartCoachContent("Smart Coach insights are unavailable right now, scan some items and try later.");
            } else {
                if (currentTime - lastAPICallTime >= 15 * 60 * 1000) {
                    const insights = generateUserInsights(userName, nutrientData.goal, history);
                    const aiResponse = await sendInsightsToAnthropic(insights);
    
                    setSmartCoachContent(aiResponse);
                    await AsyncStorage.setItem('smartCoachContent', JSON.stringify(aiResponse)); // Save AI response as string
                    lastAPICallTime = currentTime;
                    await AsyncStorage.setItem('lastAPICallTime', currentTime.toString()); // Save last API call time
                } else {
                    console.log("Skipping API call due to rate limit.");
                }
            }
        }
    }, [history, nutrientData, historyLoaded, nutrientDataLoaded]);
    
    
    useEffect(() => {
        const intervalId = setInterval(() => {
            const currentTime = Date.now();
            const timeLeft = 15 * 60 * 1000 - (currentTime - lastAPICallTime);
            
            if (timeLeft > 0) {
                //console.log(`Time left until next Smart Coach activation: ${Math.floor(timeLeft / 1000)} seconds`);
            }
    
            if (currentTime - lastAPICallTime >= 15 * 60 * 1000) {
                checkAndUpdateSmartCoach();
            }
        }, 1000); // Check every second
    
        return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }, [checkAndUpdateSmartCoach]);

    useEffect(() => {
        if (goalModalVisible) {
            setNewGoal(newGoal); // Trigger re-render with updated newGoal
        }
    }, [goalModalVisible, newGoal]);

    useEffect(() => {
        loadUserName();
        loadHistory();
        loadLastUsedTime();
        loadNutrientData();
        loadUserInfo();
        loadSelectedModel();
        loadSmartCoachContent(); // Load AI response
    }, []);

    useEffect(() => {
        saveDataToStorage();
    }, [history, nutrientData, userInfo, userName, selectedModel]);

    const saveDataToStorage = async () => {
        try {
            await AsyncStorage.setItem('history', JSON.stringify(history));
            await AsyncStorage.setItem('nutrientData', JSON.stringify(nutrientData));
            await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
            await AsyncStorage.setItem('lastUsedTime', new Date().toISOString());
            await AsyncStorage.setItem('selectedModel', selectedModel);
    
            if (!await AsyncStorage.getItem('previousHistory')) {
                await AsyncStorage.setItem('previousHistory', JSON.stringify(history));
            }
            if (!await AsyncStorage.getItem('previousGoals')) {
                await AsyncStorage.setItem('previousGoals', JSON.stringify(nutrientData.goal));
            }
        } catch (error) {
            console.error("Error saving data to storage", error);
        }
    };

    const loadPreviousData = async () => {
        try {
            const storedPreviousHistory = await AsyncStorage.getItem('previousHistory');
            const storedPreviousGoals = await AsyncStorage.getItem('previousGoals');
    
            if (storedPreviousHistory) {
                previousHistory = storedPreviousHistory;
            }
    
            if (storedPreviousGoals) {
                previousGoals = storedPreviousGoals;
            }
        } catch (error) {
            console.error("Error loading previous data from storage", error);
        }
    };

    const loadNutrientData = async () => {
        try {
            const storedNutrientData = await AsyncStorage.getItem('nutrientData');
            if (storedNutrientData) {
                const parsedNutrientData = JSON.parse(storedNutrientData);
                //console.log("Loaded nutrient data:", parsedNutrientData);
                setNutrientData(parsedNutrientData);
            } else {
                //console.log("No nutrient data found in storage.");
            }
        } catch (error) {
            console.error("Error loading nutrient data from storage", error);
        } finally {
            setNutrientDataLoaded(true);
        }
    };

    const loadUserInfo = async () => {
        try {
            const storedUserInfo = await AsyncStorage.getItem('userInfo');
            if (storedUserInfo) {
                setUserInfo(JSON.parse(storedUserInfo));
            }
        } catch (error) {
            console.error("Error loading user info from storage", error);
        }
    };

    const loadLastUsedTime = async () => {
        try {
            const lastUsedTime = await AsyncStorage.getItem('lastUsedTime');
            if (lastUsedTime) {
                //console.log("Last used time:", lastUsedTime);
            }
        } catch (error) {
            console.error("Error loading last used time from storage", error);
        }
    };

    useEffect(() => {
        const loadSmartCoachContent = async () => {
            try {
                const storedSmartCoachContent = await AsyncStorage.getItem('smartCoachContent');
                if (storedSmartCoachContent) {
                    setSmartCoachContent(storedSmartCoachContent); // Set AI response as string
                }
            } catch (error) {
                console.error("Error loading Smart Coach content from storage", error);
                await AsyncStorage.removeItem('smartCoachContent');
            }
        };
    
        const initializeData = async () => {
            await loadUserName();
            await loadHistory();
            await loadLastUsedTime();
            await loadNutrientData();
            await loadUserInfo();
            await loadSelectedModel();
            await loadSmartCoachContent(); // Load AI response
            await loadLastAPICallTime(); // Load last API call time
            await loadPreviousData(); // Load previous history and goals
        };
    
        initializeData();
    }, []);

    const loadUserName = async () => {
        try {
            const name = await AsyncStorage.getItem('userName');
            if (name) {
                setUserName(name.split(" ")[0]);
            }
        } catch (e) {
            console.error("Error loading user name: ", e);
        }
    };

    useEffect(() => {
        const fetchGoals = async () => {
            const goals = await AsyncStorage.getItem('@user_goals');
            if (goals) {
                const parsedGoals = JSON.parse(goals);
                setNewGoal(parsedGoals);
            }
        };

        if (goalModalVisible) {
            fetchGoals();
        }
    }, [goalModalVisible]);

    const loadHistory = async () => {
        try {
            // Load history data from AsyncStorage
            const historyData = await AsyncStorage.getItem('@product_history');
            if (historyData) {
                const parsedHistory = JSON.parse(historyData);
                const today = new Date();
                const todayString = today.toISOString().split('T')[0]; // Get today's date string
    
                // Filter history entries to include only those from today
                const filteredHistory = parsedHistory.filter(item => {
                    const entryDate = new Date(item.date);
                    return entryDate.getFullYear() === today.getFullYear() &&
                           entryDate.getMonth() === today.getMonth() &&
                           entryDate.getDate() === today.getDate();
                });
    
                setHistory(filteredHistory);
                calculateTrends(filteredHistory);
    
                // Save the filtered history
                await AsyncStorage.setItem('filteredHistory', JSON.stringify(filteredHistory));
    
                // Log the number of items from today
                console.log(`Number of items from today: ${filteredHistory.length}`);
    
                if (filteredHistory.length === 0) {
                    const unavailableMessage = "Smart Coach insights are unavailable right now, scan some items and try later.";
                    setSmartCoachContent(unavailableMessage);
                    await AsyncStorage.setItem('smartCoachContent', unavailableMessage);
                }
            } else {
                // If no history data found, set history to an empty array
                setHistory([]);
                console.log('No history data found in storage.');
                const unavailableMessage = "Smart Coach insights are currently unavailable because you haven't scanned any meals today. Please scan your meals so I can assist you.";
                setSmartCoachContent(unavailableMessage);
                await AsyncStorage.setItem('smartCoachContent', unavailableMessage);
            }
        } catch (e) {
            console.error("Error loading history:", e);
        } finally {
            setHistoryLoaded(true);
        }
    };

    const shouldShowCard = (current, goal) => {
        const percent = getCompletionPercent(current, goal);
        // Adjust the threshold values here
        const lowerThreshold = 80; // 90% of the goal is acceptable
        const upperThreshold = 120; // Up to 110% of the goal is acceptable
        return percent < lowerThreshold || percent > upperThreshold;
    };

    const calculateTrends = (data) => {
        if (data.length === 0) {
            console.log("No data available to calculate trends.");
            setTrends({});
            return;
        }
    
        let totalCalories = 0;
        let totalSodium = 0;
        let totalCarbohydrates = 0;
        let totalProteins = 0;
        let totalFats = 0;
        let totalFiber = 0;
        let totalSugars = 0;
    
        data.forEach(item => {
            totalCalories += parseInt(item.nutrients['Total Calories']) || 0;
            totalSodium += parseInt(item.nutrients.Sodium) || 0;
            totalCarbohydrates += parseInt(item.nutrients.Carbohydrates) || 0;
            totalProteins += parseInt(item.nutrients.Proteins) || 0;
            totalFats += parseInt(item.nutrients.Fats) || 0;
            totalFiber += parseInt(item.nutrients['Dietary Fiber']) || 0;
            totalSugars += parseInt(item.nutrients.Sugars) || 0;
        });
    
        setTrends({
            avgCalories: totalCalories,
            avgSodium: totalSodium,
            avgCarbohydrates: totalCarbohydrates,
            avgProteins: totalProteins,
            avgFats: totalFats,
            avgFiber: totalFiber,
            avgSugars: totalSugars,
        });
    };
    

    const showSmartCoachAlert = () => {
        const alertMessage = `Smart Coach is waiting on:
        - Nutrient Data: ${JSON.stringify(nutrientData.goal)}
        - History Data: ${history.length} items`;

        Alert.alert("Smart Coach Status", alertMessage, [{ text: "OK" }]);
    };

    // Function to generate insights
    const generateUserInsights = (userName, goals, history) => {
        if (!userName || !goals || history.length === 0) {
            return "No sufficient data to generate insights.";
        }
    
        const { calories, sodium, carbohydrates, proteins, fats, fiber, sugars } = goals;
    
        const totalCalories = history.reduce((sum, item) => sum + parseInt(item.nutrients['Total Calories'] || 0), 0);
        const totalSodium = history.reduce((sum, item) => sum + parseInt(item.nutrients.Sodium || 0), 0);
        const totalCarbohydrates = history.reduce((sum, item) => sum + parseInt(item.nutrients.Carbohydrates || 0), 0);
        const totalProteins = history.reduce((sum, item) => sum + parseInt(item.nutrients.Proteins || 0), 0);
        const totalFats = history.reduce((sum, item) => sum + parseInt(item.nutrients.Fats || 0), 0);
        const totalFiber = history.reduce((sum, item) => sum + parseInt(item.nutrients['Dietary Fiber'] || 0), 0);
        const totalSugars = history.reduce((sum, item) => sum + parseInt(item.nutrients.Sugars || 0), 0);
    
        const generateComparison = (goal, actual, nutrientName) => {
            const percent = ((actual / goal) * 100).toFixed(2);
            return `${percent}% of their ${nutrientName} goal (${actual} / ${goal})`;
        };
    
        const recommendAction = (goal, actual, nutrientName) => {
            if (actual > goal) {
                if (nutrientName === 'sodium') {
                    return `It's recommended to drink more water to balance sodium levels.`;
                } else {
                    return `Consider a workout to bring down ${nutrientName} levels.`;
                }
            } else if (actual < goal) {
                if (nutrientName === 'calories') {
                    return `Consider eating foods rich in healthy fats and proteins to meet your calorie goal.`;
                } else if (nutrientName === 'proteins') {
                    return `Eat foods like chicken, beans, or tofu to increase protein intake.`;
                } else if (nutrientName === 'carbohydrates') {
                    return `Include more whole grains and fruits in your diet to reach your carbohydrate goal.`;
                } else {
                    return `Try to include more ${nutrientName}-rich foods in your diet.`;
                }
            } else {
                return `Great job! You've met your ${nutrientName} goal.`;
            }
        };
    
        const insights = `
            The user's name is ${userName}.
    
            Their goals for today are:
            1. Calories: ${calories} cal
            2. Sodium: ${sodium} mg
            3. Carbohydrates: ${carbohydrates} g
            4. Proteins: ${proteins} g
            5. Fats: ${fats} g
            6. Fiber: ${fiber} g
            7. Sugars: ${sugars} g
    
            Here is the percentage they are to each goal:
            1. Calories: ${generateComparison(calories, totalCalories, 'calories')}
               - ${recommendAction(calories, totalCalories, 'calories')}
            2. Sodium: ${generateComparison(sodium, totalSodium, 'sodium')}
               - ${recommendAction(sodium, totalSodium, 'sodium')}
            3. Carbohydrates: ${generateComparison(carbohydrates, totalCarbohydrates, 'carbohydrates')}
               - ${recommendAction(carbohydrates, totalCarbohydrates, 'carbohydrates')}
            4. Proteins: ${generateComparison(proteins, totalProteins, 'proteins')}
               - ${recommendAction(proteins, totalProteins, 'proteins')}
            5. Fats: ${generateComparison(fats, totalFats, 'fats')}
               - ${recommendAction(fats, totalFats, 'fats')}
            6. Fiber: ${generateComparison(fiber, totalFiber, 'fiber')}
               - ${recommendAction(fiber, totalFiber, 'fiber')}
            7. Sugars: ${generateComparison(sugars, totalSugars, 'sugars')}
               - ${recommendAction(sugars, totalSugars, 'sugars')}
    
            Today, they consumed a total of ${history.length} items.
        `;
    
        return insights.trim();
    };

// Function to send data to Anthropic API
const sendInsightsToAnthropic = async (insights) => {
    try {
        console.log("Trying to use API for smart coach.")
        const apiKey = await AsyncStorage.getItem('@apikey');
        const model = await AsyncStorage.getItem('selectedModel');
    
        if (!apiKey || !model) {
            console.error('API key or model not found');
            return "Smart Coach insights are unavailable right now, scan some items and try later.";
        }

        const anthropic = new Anthropic({
            apiKey: apiKey,
        });

        const msg = await anthropic.messages.create({
            model: model,  // Use the model from AsyncStorage
            max_tokens: 4096,
            temperature: 0.7,
            system: `Your task is to generate a VERY concise summary of what the user needs to do based on this data.

You are a tool, your reply should just be a 1 or 2 small sentence summary with no greeting or introduction.

Guidelines:
1. Summarize the key points from the provided insights.
2. Offer clear and actionable recommendations for the user.
3. If the user exceeds their goals, suggest ways to bring the levels down (e.g., exercise, drinking water).
4. If the user is below their goals, recommend specific foods or workouts to help them meet their targets, including amounts where applicable.
5. Suggest specific workouts based on your own knowledge of what they help with.
6. Keep the summary concise and focused on practical advice.

Do nots:
1. Do not suggest generic terms like "exercise"; instead, suggest specific activities such as a 20-minute jog or 30-minute strength training.
2. Do not engage in conversational language; provide direct, actionable recommendations.

Example Response (DO NOT COPY):
Hi Anthony! You exceeded your sodium intake goal by 100 mg. Drink more water and do a 30-minute cardio session. You're 200 calories short of your calorie goal. Eat 1 avocado or 30g of almonds and do strength training for 20 minutes.

References:
1. For every 500 calories over the goal, recommend {number of hours} hour of intense workout (e.g., running, HIIT).
2. For every 100 mg of sodium over the goal, recommend drinking 2 extra glasses of water.
3. To increase protein intake, suggest high-protein foods like chicken breast, Greek yogurt, or legumes.
4. To increase fiber intake, suggest high-fiber foods like apples, broccoli, or whole grains.
5. For every 100 calories below the goal, recommend foods like bananas, nuts, or peanut butter.

Make it make sense, eg recommending a workout to increase calorie intake makes no sense.

Insights:
${insights}

IMPORTANT: If it is physically impossible to work off the calories or other nutrient amounts given, let the user know and tell them that it's impossible and reccomend something else.`,
            messages: [{
                role: "user",
                content: `Your task is to generate a VERY concise summary of what the user needs to do based on this data.

You are a tool, your reply should just be a 1 or 2 small sentence summary with no greeting or introduction.

Guidelines:
1. Summarize the key points from the provided insights.
2. Offer clear and actionable recommendations for the user.
3. If the user exceeds their goals, suggest ways to bring the levels down (e.g., exercise, drinking water).
4. If the user is below their goals, recommend specific foods or workouts to help them meet their targets, including amounts where applicable.
5. Suggest specific workouts based on your own knowledge of what they help with.
6. Keep the summary concise and focused on practical advice.

Do nots:
1. Do not suggest generic terms like "exercise"; instead, suggest specific activities such as a 20-minute jog or 30-minute strength training.
2. Do not engage in conversational language; provide direct, actionable recommendations.

Example Response (DO NOT COPY):
Hi Anthony! You exceeded your sodium intake goal by 100 mg. Drink more water and do a 30-minute cardio session. You're 200 calories short of your calorie goal. Eat 1 avocado or 30g of almonds and do strength training for 20 minutes.

References:
1. For every 500 calories over the goal, recommend 1 hour of intense workout (e.g., running, HIIT).
2. For every 100 mg of sodium over the goal, recommend drinking 2 extra glasses of water.
3. To increase protein intake, suggest high-protein foods like chicken breast, Greek yogurt, or legumes.
4. To increase fiber intake, suggest high-fiber foods like apples, broccoli, or whole grains.
5. For every 100 calories below the goal, recommend foods like bananas, nuts, or peanut butter.

Make it make sense, eg recommending a workout to increase calorie intake makes no sense.

Insights:
${insights}

IMPORTANT: If it is physically impossible to work off the calories or other nutrient amounts given, let the user know and tell them that it's impossible and reccomend something else.`
            }]
        });

        const responseContent = msg.content;
        console.log("API Response:", responseContent);

        if (responseContent && Array.isArray(responseContent) && responseContent[0] && responseContent[0].text) {
            return responseContent[0].text;
        } else {
            return "Smart Coach insights are unavailable right now, scan some items and try later.";
        }
    } catch (error) {
        console.error("Error sending message to Anthropic API:", error);
        Alert.alert("High Demand", `We're experiencing extremely high demand, try again in 1 minute.`);
        return "Smart Coach insights are unavailable right now, scan some items and try later.";
    }
};

const calculateCalorieIntake = async () => {
    const { height, weight, age, gender, activityLevel, goal } = userInfo;

    const weightInKg = parseFloat(weight);
    const heightInCm = parseFloat(height);
    const ageInYears = parseFloat(age);

    if (isNaN(weightInKg) || isNaN(heightInCm) || isNaN(ageInYears)) {
        Alert.alert("Invalid input", "Please enter valid numeric values for height, weight, and age.");
        return;
    }

    const activityMultiplier = {
        sedentary: 1.2,
        lightly: 1.375,
        moderately: 1.55,
        very: 1.725,
        extra: 1.9
    };

    let BMR;
    if (gender === 'male') {
        BMR = 10 * weightInKg + 6.25 * heightInCm - 5 * ageInYears + 5;
    } else if (gender === 'female') {
        BMR = 10 * weightInKg + 6.25 * heightInCm - 5 * ageInYears - 161;
    } else {
        BMR = 10 * weightInKg + 6.25 * heightInCm - 5 * ageInYears - 78;
    }

    const TDEE = BMR * activityMultiplier[activityLevel];

    let adjustedCalories = TDEE; // Default to maintain

    if (goal === 'lose') {
        adjustedCalories -= 500;
    } else if (goal === 'gain') {
        adjustedCalories += 500;
    }

    setEstimatedCalories(adjustedCalories);

    const calculatedGoal = {
        calories: adjustedCalories.toFixed(0),
        sodium: 2300,
        carbohydrates: ((adjustedCalories * 0.5) / 4).toFixed(0),
        proteins: ((adjustedCalories * 0.2) / 4).toFixed(0),
        fats: ((adjustedCalories * 0.3) / 9).toFixed(0),
        fiber: 25,
        sugars: 50
    };

    setNewGoal(calculatedGoal);
    setStep(step + 1);
};


    const handleSaveGoal = async () => {
        await AsyncStorage.setItem('@user_goals', JSON.stringify(newGoal));
        await AsyncStorage.setItem('@user_info', JSON.stringify(userInfo)); // Save user info
        setNutrientData({ goal: newGoal });
        setGoalModalVisible(false);
    };

    const handleNextStep = () => {
        if (step === 4) {
            calculateCalorieIntake();
        } else {
            setStep(step + 1);
        }
    };

    const convertHeight = (height) => {
        const [feet, inches] = height.split("'").map(part => parseInt(part.trim(), 10));
        return feet * 30.48 + inches * 2.54; // convert feet to cm and inches to cm
    };

    const convertWeight = (weight) => {
        return weight * 0.453592; // convert pounds to kg
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputModalTitle}>Enter your height, weight, and gender.</Text>
                        <Text style={styles.inputLabel}>Height (ft'in)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Height (ft'in)"
                            value={userInfo.height}
                            onChangeText={(text) => setUserInfo({ ...userInfo, height: text })}
                        />
                        <Text style={styles.inputLabel}>Weight (lbs)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Weight (lbs)"
                            keyboardType="numeric"
                            value={userInfo.weight}
                            onChangeText={(text) => setUserInfo({ ...userInfo, weight: text })}
                        />
                        <Text style={styles.inputLabel}>Gender</Text>
                        <View style={styles.genderSelection}>
                            <View style={styles.genderRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.genderButton,
                                        userInfo.gender === 'male' && styles.selectedGenderButton
                                    ]}
                                    onPress={() => setUserInfo({ ...userInfo, gender: 'male' })}
                                >
                                    <Text style={styles.genderButtonText}>Male</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.genderButton,
                                        userInfo.gender === 'female' && styles.selectedGenderButton
                                    ]}
                                    onPress={() => setUserInfo({ ...userInfo, gender: 'female' })}
                                >
                                    <Text style={styles.genderButtonText}>Female</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.genderButtonNoSay,
                                userInfo.gender === 'prefer_not_to_say' && styles.selectedGenderButton
                            ]}
                            onPress={() => setUserInfo({ ...userInfo, gender: 'prefer_not_to_say' })}
                        >
                            <Text style={styles.genderButtonText}>Prefer not to say</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalDescription}>We don't share any of your personal data with 3rd parties.</Text>
                    </View>
                );
            case 2:
                return (
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputModalTitle}>Enter your age.</Text>
                        <Text style={styles.inputLabel}>Age (years)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Age (years)"
                            keyboardType="numeric"
                            value={userInfo.age}
                            onChangeText={(text) => setUserInfo({ ...userInfo, age: text })}
                        />
<Text style={styles.modalDescription}>We only use your age to calculate automatic goals. We won’t share it, save it in our cloud services, or send it to any third parties.</Text>
</View>
                );
            case 3:
                return (
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputModalTitle}> Select your Activity Level</Text>
                        <TouchableOpacity
                            style={[
                                styles.activityButton,
                                userInfo.activityLevel === 'sedentary' && styles.selectedActivityButton
                            ]}
                            onPress={() => setUserInfo({ ...userInfo, activityLevel: 'sedentary' })}
                        >
                            <Text style={styles.activityButtonText}>
                                Sedentary{'\n'}<Text style={styles.activityDescription}>Little or no exercise</Text>
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.activityButton,
                                userInfo.activityLevel === 'lightly' && styles.selectedActivityButton
                            ]}
                            onPress={() => setUserInfo({ ...userInfo, activityLevel: 'lightly' })}
                        >
                            <Text style={styles.activityButtonText}>
                                Lightly Active{'\n'}<Text style={styles.activityDescription}>Light exercise 1-3 days a week</Text>
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.activityButton,
                                userInfo.activityLevel === 'moderately' && styles.selectedActivityButton
                            ]}
                            onPress={() => setUserInfo({ ...userInfo, activityLevel: 'moderately' })}
                        >
                            <Text style={styles.activityButtonText}>
                                Moderately Active{'\n'}<Text style={styles.activityDescription}>Exercise 3-5 days a week</Text>
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.activityButton,
                                userInfo.activityLevel === 'very' && styles.selectedActivityButton
                            ]}
                            onPress={() => setUserInfo({ ...userInfo, activityLevel: 'very' })}
                        >
                            <Text style={styles.activityButtonText}>
                                Very Active{'\n'}<Text style={styles.activityDescription}>Hard exercise 6-7 days a week</Text>
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.activityButton,
                                userInfo.activityLevel === 'extra' && styles.selectedActivityButton
                            ]}
                            onPress={() => setUserInfo({ ...userInfo, activityLevel: 'extra' })}
                        >
                            <Text style={styles.activityButtonText}>
                                Extra Active{'\n'}<Text style={styles.activityDescription}>Very hard exercise or a physical job</Text>
                            </Text>
                        </TouchableOpacity>
                        <Text style={styles.modalDescription}>We use advanced calculations to find the best values to help you achieve your goals.</Text>
                    </View>
                );
            case 4:
                return (
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputModalTitle}>Select Your Goal</Text>
                        <TouchableOpacity
                            style={[
                                styles.goalButton,
                                userInfo.goal === 'maintain' && styles.selectedGoalButton
                            ]}
                            onPress={() => setUserInfo({ ...userInfo, goal: 'maintain' })}
                        >
                            <Text style={styles.goalButtonText}>
                                Maintain Weight{'\n'}<Text style={styles.goalDescription}>Keep your current weight</Text>
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.goalButton,
                                userInfo.goal === 'lose' && styles.selectedGoalButton
                            ]}
                            onPress={() => setUserInfo({ ...userInfo, goal: 'lose' })}
                        >
                            <Text style={styles.goalButtonText}>
                                Lose Weight{'\n'}<Text style={styles.goalDescription}>Reduce your weight</Text>
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.goalButton,
                                userInfo.goal === 'gain' && styles.selectedGoalButton
                            ]}
                            onPress={() => setUserInfo({ ...userInfo, goal: 'gain' })}
                        >
                            <Text style={styles.goalButtonText}>
                                Gain Weight{'\n'}<Text style={styles.goalDescription}>Increase your weight</Text>
                            </Text>
                        </TouchableOpacity>
                        <Text style={styles.modalDescription}>We use advanced calculations to find the best values to help you achieve your goals.</Text>
                        </View>
                );
            case 5:
                return (
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputModalTitleSmartCoach}>Smart Coach autofilled your goals. Feel free to edit them.</Text>
                        <Text style={styles.inputLabel}>Calories Per Day</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Calories"
                            keyboardType="numeric"
                            value={newGoal.calories.toString()}
                            onChangeText={(text) => setNewGoal({ ...newGoal, calories: text })}
                        />
                        <Text style={styles.inputLabel}>Sodium Per Day (mg)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Sodium"
                            keyboardType="numeric"
                            value={newGoal.sodium.toString()}
                            onChangeText={(text) => setNewGoal({ ...newGoal, sodium: text })}
                        />
                        <Text style={styles.inputLabel}>Carbohydrates Per Day (g)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Carbohydrates"
                            keyboardType="numeric"
                            value={newGoal.carbohydrates.toString()}
                            onChangeText={(text) => setNewGoal({ ...newGoal, carbohydrates: text })}
                        />
                        <Text style={styles.inputLabel}>Proteins Per Day (g)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Proteins"
                            keyboardType="numeric"
                            value={newGoal.proteins.toString()}
                            onChangeText={(text) => setNewGoal({ ...newGoal, proteins: text })}
                        />
                        <Text style={styles.inputLabel}>Fats Per Day (g)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Fats"
                            keyboardType="numeric"
                            value={newGoal.fats.toString()}
                            onChangeText={(text) => setNewGoal({ ...newGoal, fats: text })}
                        />
                        <Text style={styles.inputLabel}>Fiber Per Day (g)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Fiber"
                            keyboardType="numeric"
                            value={newGoal.fiber.toString()}
                            onChangeText={(text) => setNewGoal({ ...newGoal, fiber: text })}
                        />
                        <Text style={styles.inputLabel}>Sugars Per Day (g)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Sugars"
                            keyboardType="numeric"
                            value={newGoal.sugars.toString()}
                            onChangeText={(text) => setNewGoal({ ...newGoal, sugars: text })}
                        />
                    </View>
                );
            default:
                return null;
        }
    };
    

    const renderCircle = (percent, color, lightColor, darkColor, overGoal, borderColor) => {
        const adjustedPercent = Math.min(100, percent);
        const strokeDasharray = `${adjustedPercent * 3.14} ${314 - adjustedPercent * 3.14}`;
        const overlapPercent = percent - 100;

        return (
            <Svg height="70" width="70" viewBox="0 0 120 120">
                <Defs>
                    <LinearGradient id="grad" x1="0%" y1="50%" x2="200%" y2="50%">
                        <Stop offset="0%" stopColor={lightColor} />
                        <Stop offset="50%" stopColor={darkColor} />
                        <Stop offset="100%" stopColor={lightColor} />
                    </LinearGradient>
                </Defs>
                <Circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke={borderColor}
                    strokeWidth="4"
                    fill="none"
                    transform="rotate(-90 60 60)"
                />
                <Circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="url(#grad)"
                    strokeWidth="14"
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                    fill="none"
                    transform="rotate(-90 60 60)"
                />
                {overGoal && (
                    <Circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke={darkColor}
                        strokeWidth="14"
                        strokeDasharray={`${overlapPercent * 3.14} ${314 - overlapPercent * 3.14}`}
                        strokeLinecap="round"
                        fill="none"
                        transform={`rotate(${(adjustedPercent * 3.6) - 90} 60 60)`}
                    />
                )}
            </Svg>
        );
    };

    const renderCalorieCard = () => {
        const calorieDifference = nutrientData.goal.calories - trends.avgCalories;
        const isGoalMet = Math.abs(calorieDifference) <= 75;
        const caloriePercent = getCompletionPercent(trends.avgCalories, nutrientData.goal.calories);
        const overGoal = caloriePercent > 100;
        const borderColor = colorScheme === 'dark' ? '#ffffff' : '#000000';

        return (
            <View style={styles.card}>
                <Text style={styles.IntroduceUserTitle}>Hi {userName},</Text>
                <Text style={styles.cardText}>
                    {isGoalMet
                        ? "You've completed your goals, time to relax!"
                        : calorieDifference > 0
                            ? `You need ${calorieDifference.toFixed(0)} more calories to meet your goal.`
                            : `You have gone past your calorie goal by ${Math.abs(calorieDifference).toFixed(0)} calories. Check Smart Coach for advice.`}
                </Text>
                <View style={styles.circleContainer}>
                    {renderCircle(caloriePercent, 'orange', '#FFEDD5', 'orange', overGoal, borderColor)}
                    <Ionicons
                        name={calorieDifference > 0 ? "arrow-up-circle" : "arrow-down-circle"}
                        size={fontSize}
                        color="orange"
                        style={styles.arrowIconInsideCircle}
                    />
                </View>
            </View>
        );
    };

    const renderSodiumCard = () => {
        const sodiumDifference = nutrientData.goal.sodium - trends.avgSodium;
        const sodiumPercent = getCompletionPercent(trends.avgSodium, nutrientData.goal.sodium);
        const overGoal = sodiumPercent > 100;
        const borderColor = colorScheme === 'dark' ? '#ffffff' : '#000000';

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Decrease sodium intake,</Text>
                <Text style={styles.cardText}>
                    Your sodium intake is {Math.abs(sodiumDifference).toFixed(2)}% {sodiumDifference > 0 ? "higher" : "lower"} than your goal.
                </Text>
                <View style={styles.circleContainer}>
                    {renderCircle(sodiumPercent, 'lightblue', '#fff', 'lightblue', overGoal, borderColor)}
                    <Ionicons
                        name={sodiumDifference > 0 ? "arrow-down-circle" : "arrow-up-circle"}
                        size={24}
                        color="lightblue"
                        style={styles.arrowIconInsideCircle}
                    />
                </View>
            </View>
        );
    };

    const renderDynamicCards = () => {
        const nutrientTypes = [
            { 
                name: 'Calories', 
                key: 'calories', 
                unit: 'cal', 
                color: 'orange', 
                lightColor: '#FFEDD5', 
                darkColor: 'orange', 
                phrases: {
                    needMore: "You need to consume {amount} more calories to reach your goal.",
                    overGoal: "Oops! You're {amount} calories over your goal."
                }
            },
            { 
                name: 'Sodium', 
                key: 'sodium', 
                unit: 'mg', 
                color: 'lightblue', 
                lightColor: '#E0F7FA', 
                darkColor: 'lightblue', 
                phrases: {
                    needMore: "Increase your sodium intake by {amount} mg to reach your goal.",
                    overGoal: "Careful! You're {amount} mg over your sodium goal."
                }
            },
            { 
                name: 'Carbohydrates', 
                key: 'carbohydrates', 
                unit: 'g', 
                color: 'green', 
                lightColor: '#E8F5E9', 
                darkColor: 'green', 
                phrases: {
                    needMore: "You need to eat {amount} grams more carbohydrates to reach your goal.",
                    overGoal: "Whoa! You're {amount} grams over your carb goal."
                }
            },
            { 
                name: 'Proteins', 
                key: 'proteins', 
                unit: 'g', 
                color: 'purple', 
                lightColor: '#F3E5F5', 
                darkColor: 'purple', 
                phrases: {
                    needMore: "You have to consume {amount} grams of protein to meet your goal.",
                    overGoal: "Heads up! You're {amount} grams over your protein goal."
                }
            },
            { 
                name: 'Fats', 
                key: 'fats', 
                unit: 'g', 
                color: 'red', 
                lightColor: '#FFEBEE', 
                darkColor: 'red', 
                phrases: {
                    needMore: "You need {amount} more grams of fats to hit your goal.",
                    overGoal: "Uh-oh! You're {amount} grams over your fat goal."
                }
            },
            { 
                name: 'Fiber', 
                key: 'fiber', 
                unit: 'g', 
                color: 'brown', 
                lightColor: '#EFEBE9', 
                darkColor: 'brown', 
                phrases: {
                    needMore: "Increase your fiber intake by {amount} grams to meet your goal.",
                    overGoal: "Uh-oh! You're {amount} grams over your fiber goal."
                }
            },
            { 
                name: 'Sugars', 
                key: 'sugars', 
                unit: 'g', 
                color: 'pink', 
                lightColor: '#FCE4EC', 
                darkColor: 'pink', 
                phrases: {
                    needMore: "You have to consume {amount} grams more sugars to meet your goal.",
                    overGoal: "Oops! You're {amount} grams over your sugar goal."
                }
            }
        ];        
    
        const sortedNutrientTypes = nutrientTypes
            .map(nutrient => {
                const goalValue = nutrientData.goal[nutrient.key];
                const avgValue = trends[`avg${nutrient.name}`];
                const percent = getCompletionPercent(avgValue, goalValue);
                return { ...nutrient, goalValue, avgValue, percent, deviation: Math.abs(percent - 100) };
            })
            .filter(nutrient => nutrient.goalValue > 0 && nutrient.avgValue !== undefined)
            .sort((a, b) => b.deviation - a.deviation);
    
        return sortedNutrientTypes.map(nutrient => {
            if (!shouldShowCard(nutrient.avgValue, nutrient.goalValue)) {
                return null;
            }
    
            const difference = nutrient.goalValue - nutrient.avgValue;
            const overGoal = nutrient.percent > 100;
            const borderColor = colorScheme === 'dark' ? '#ffffff' : '#bbb';
            const amount = Math.abs(difference).toFixed(0);
            const message = difference > 0 
                ? nutrient.phrases.needMore.replace('{amount}', amount) 
                : nutrient.phrases.overGoal.replace('{amount}', amount);
    
            return (
                <View key={nutrient.key} style={styles.card}>
                    <Text style={styles.cardTitle}>{nutrient.name}</Text>
                    <Text style={styles.cardText}>{message}</Text>
                    <View style={styles.circleContainer}>
                        {renderCircle(nutrient.percent, nutrient.color, nutrient.lightColor, nutrient.darkColor, overGoal, borderColor)}
                        <Ionicons
                            name={difference > 0 ? "arrow-up-circle" : "arrow-down-circle"}
                            size={34}
                            color={nutrient.color}
                            style={styles.arrowIconInsideCircle}
                        />
                    </View>
                </View>
            );
        });
    };

    useEffect(() => {
        loadUserName();
        loadHistory();
        checkGoals(); // Check goals when component mounts
    }, []);

    useEffect(() => {
        const checkGoals = async () => {
            const goals = await AsyncStorage.getItem('@user_goals');
            const userInfoData = await AsyncStorage.getItem('@user_info'); // Load user info
        
            if (!goals) {
                // Show modal with default values if no goals are found
                setNewGoal({
                    calories: '',
                    sodium: '',
                    carbohydrates: '',
                    proteins: '',
                    fats: '',
                    fiber: '',
                    sugars: ''
                });
                setGoalModalVisible(true);
            } else {
                const parsedGoals = JSON.parse(goals);
                setNutrientData({ goal: parsedGoals });
                setNewGoal(parsedGoals); // Set newGoal with the existing goals
            }
        
            if (userInfoData) {
                setUserInfo(JSON.parse(userInfoData)); // Set user info with the existing data
            }
        };

        checkGoals();
    }, []);

    const checkGoals = async () => {
        const goals = await AsyncStorage.getItem('@user_goals');
        const userInfoData = await AsyncStorage.getItem('@user_info'); // Load user info
    
        if (!goals) {
            // Show modal with default values if no goals are found
            setNewGoal({
                calories: '',
                sodium: '',
                carbohydrates: '',
                proteins: '',
                fats: '',
                fiber: '',
                sugars: ''
            });
            setGoalModalVisible(true);
        } else {
            const parsedGoals = JSON.parse(goals);
            setNutrientData({ goal: parsedGoals });
            setNewGoal(parsedGoals); // Set newGoal with the existing goals
        }
    
        if (userInfoData) {
            setUserInfo(JSON.parse(userInfoData)); // Set user info with the existing data
        }
    };

    const handleCheckSmartCoach = async () => {
        console.log("Starting handleCheckSmartCoach");
    
        if (!historyLoaded || !nutrientDataLoaded) {
            Alert.alert("Data not loaded", "Please wait for data to load and try again.");
            console.log("Data not loaded: historyLoaded =", historyLoaded, "nutrientDataLoaded =", nutrientDataLoaded);
            return;
        }
    
        await loadPreviousData();
    
        const currentHistoryString = JSON.stringify(history);
        const currentGoalsString = JSON.stringify(nutrientData.goal);
    
        try {
            const storedHistoryString = await AsyncStorage.getItem('previousHistory');
            const storedGoalsString = await AsyncStorage.getItem('previousGoals');
    
            console.log("Stored history string:", storedHistoryString);
            console.log("Stored goals string:", storedGoalsString);
            console.log("Current history string:", currentHistoryString);
            console.log("Current goals string:", currentGoalsString);
    
            if (storedHistoryString === currentHistoryString && storedGoalsString === currentGoalsString) {
                Alert.alert("No Changes Detected", "It looks like you haven't scanned anything or updated your goals yet. Once you do, Smart Coach will be able to assist you.");
                console.log("No changes detected, skipping API call.");
                return;
            }
    
            previousHistory = currentHistoryString;
            previousGoals = currentGoalsString;
    
            await AsyncStorage.setItem('previousHistory', currentHistoryString);
            await AsyncStorage.setItem('previousGoals', currentGoalsString);
    
            if (history.length === 0 || Object.keys(nutrientData.goal).length === 0) {
                setSmartCoachContent("Smart Coach insights are unavailable right now, scan some items and try later.");
                console.log("No history or goal data available.");
            } else {
                const insights = generateUserInsights(userName, nutrientData.goal, history);
                console.log("Generated insights:", insights);
                const aiResponse = await sendInsightsToAnthropic(insights);
    
                if (aiResponse && typeof aiResponse === 'string') {
                    setSmartCoachContent(aiResponse);
                    await AsyncStorage.setItem('smartCoachContent', aiResponse); // Save AI response as string
                    lastAPICallTime = Date.now();
                    await AsyncStorage.setItem('lastAPICallTime', lastAPICallTime.toString()); // Save last API call time
                    console.log("API response received and saved.");
                } else {
                    setSmartCoachContent("Smart Coach insights are unavailable right now, scan some items and try later.");
                    console.log("API response unavailable.");
                }
            }
        } catch (error) {
            console.error("Error handling Smart Coach check:", error);
        }
    };

    const imageSource = colorScheme === 'dark' 
        ? require('../assets/AI coach-light.png') 
        : require('../assets/AI coach-dark.png');

    return (
        <View style={styles.container}>
                    <SubscriptionModal />
            <Text style={styles.insightsTitle}>Insights</Text>

            <TouchableOpacity style={styles.iconButton} onPress={() => {
                setNewGoal(nutrientData.goal); // Set newGoal with existing nutrient data before opening modal
                setGoalModalVisible(true);
            }}>
                <SymbolView 
        name="gearshape.fill" // SF Symbol name for 'close'
        size={26} 
        tintColor={colorScheme === 'dark' ? '#fff' : '#fff'} 
        type="hierarchical" // or other types like 'monochrome', 'palette', etc.
        style={styles.symbol}
      />
            </TouchableOpacity>
            <ScrollView
    style={styles.scrollContainer}
    refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    }
>
    <Text style={styles.TopDescriptionText}>
    Set your daily goals, track trends, and optimize your progress.
    </Text>
    <Text style={styles.cardTitle}>Hi {userName},</Text>
    <View style={styles.card}>
        <View style={styles.smartCoachHeader}>
            <Image source={imageSource} style={styles.icon} />
            <Text style={styles.cardTitleSmartCoach}>Smart Coach says,</Text>
            <TouchableOpacity style={styles.checkButton} onPress={handleCheckSmartCoach}>
                <Ionicons name="refresh" size={24} color={colorScheme === 'dark' ? '#fff' : '#fff'} />
            </TouchableOpacity>
        </View>
        <Text style={styles.cardText}>
            {typeof smartCoachContent === 'string' ? smartCoachContent : "Insights are unavailable right now, scan some items and try later."}
        </Text>
    </View>
    {history.length > 0 && renderDynamicCards()}
    <Text style={styles.BottomDescriptionText}>
        Smart Coach uses AI to suggest diets and workouts based on your trends. Goal cards are dynamically prioritized for importance automatically.
    </Text>
</ScrollView>
            <Modal
                animationType="slide"
                transparent={true}
                visible={goalModalVisible}
                onRequestClose={() => setGoalModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.inputModalView}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setGoalModalVisible(false)}>
                <Ionicons name="close" size={26} color={colorScheme === 'dark' ? '#fff' : '#fff'} />
            </TouchableOpacity>
                        <Text style={styles.inputModalText}>{step === 5 ? 'Set Your Goals' : 'Personal Details'}</Text>
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${(step / 5) * 100}%` }]} />
                        </View>
                        <ScrollView contentContainerStyle={styles.inputContainer}>
                            {renderStepContent()}
                        </ScrollView>
                        <View style={styles.buttonContainer}>
                            {step > 1 && (
                                <TouchableOpacity
                                    style={[styles.inputModalButton, styles.arrowButtons]}
                                    onPress={() => setStep(step - 1)}
                                >
                                    <Ionicons name="arrow-back" size={24} color="#fff" />
                                </TouchableOpacity>
                            )}
                            {step < 5 && (
                                <TouchableOpacity
                                    style={[styles.inputModalButton, styles.arrowButtons]}
                                    onPress={handleNextStep}
                                >
                                    <Ionicons name="arrow-forward" size={24} color="#fff" />
                                </TouchableOpacity>
                            )}
                            {step === 5 && (
                                <TouchableOpacity
                                    style={styles.inputModalButton}
                                    onPress={handleSaveGoal}
                                >
                                    <Text style={styles.inputModalButtonText}>Save</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 20,
        backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    },
    scrollContainer: {
        width: '100%',
        marginTop: '5%',
        padding: '3%',
    },
    IntroduceUserTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colorScheme === 'dark' ? '#fff' : '#000',
        marginTop: -200,
        marginLeft: '1%',
    },
    card: {
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#eee',
        padding: '4%',
        marginVertical: '2%',
        borderRadius: 25,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colorScheme === 'dark' ? '#fff' : '#000',
        marginBottom: '3%',
        marginLeft: '1%',
    },
    cardText: {
        fontSize: 17,
        color: colorScheme === 'dark' ? '#d9d9d9' : '#7a7a7a',
        marginBottom: '5%',
        marginLeft: '1%',
    },
    insightsTitle: {
        marginTop: isIphoneSE() ? '5%' : '12%',  // 20% from the top of the screen
        fontSize: 24,
        fontWeight: 'bold',
        color: colorScheme === 'dark' ? '#fff' : '#000',
        textAlign: 'center',
    },
    circleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: '2%',
        paddingLeft: '3%',
    },
    arrowIconInsideCircle: {
        position: 'absolute',
        left: isIphoneSE() ? 28 : 29,  // 20% from the top of the screen
        top: 18.5,
    },
    cardTitleSmartCoach: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colorScheme === 'dark' ? '#fff' : '#000',
        marginBottom: 10,
        marginLeft: '1%',
        marginTop: '1%',
    },
    smartCoachHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    icon: {
        width: 50,
        height: 50,
        marginRight: 8,
    },
    iconButton: {
        position: 'absolute',
        right: '5%',
        top: isIphoneSE() ? '5%' : '8%',  // 20% from the top of the screen
        padding: 10,
        zIndex: 1,
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
        borderRadius: 15,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // More dimmed background
    },
    inputModalView: {
        backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
        borderRadius: 40,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.55,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
        height: '80%',
    },
    input: {
        height: 50,
        margin: 12,
        borderWidth: 2,
        padding: 15,
        width: 180,
        borderColor: colorScheme === 'dark' ? '#4a4a4a' : '#000',
        color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
        borderRadius: 15,
        fontSize: 17,
        textAlign: 'center'
    },
    inputModalButton: {
        backgroundColor: colorScheme === 'dark' ? '#2d2d2d' : '#000',
        borderRadius: 18,
        padding: '4%',
        paddingHorizontal: '6%',
        elevation: 2,
        marginTop: '0%',
        marginHorizontal: '3%',
    },
    inputModalButtonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "500",
        textAlign: "center"
    },
    inputModalText: {
        marginBottom: '2%',
        textAlign: "center",
        fontSize: 26,
        fontWeight: "600",
        color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
    },
    inputDescription: {
        marginBottom: '9%',
        textAlign: "center",
        fontSize: 20,
        fontWeight: '700',
        color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
    },
    inputContainer: {
        alignItems: 'center',
        width: '100%'
    },
    genderSelection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '80%',
    },
    genderButton: {
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#eee',
        alignItems: 'center',
        marginHorizontal: '3.5%',
        marginTop: '6%',
        padding: 15,
        borderRadius: 15,
        borderColor: 'transparent',
        width: 100,
        borderWidth: 1,
    },
    genderButtonNoSay: {
        alignSelf: 'center',
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#eee',
        alignItems: 'center',
        marginTop: '6%',
        padding: 15,
        borderRadius: 15,
        borderColor: 'transparent',
        width: 160,
        borderWidth: 1,
    },
    selectedGenderButton: {
        borderColor: '#AAA',
        borderWidth: 2,
    },
    genderButtonText: {
        color: colorScheme === 'dark' ? '#fff' : '#000',
        fontSize: 16,
    },
    resultText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colorScheme === 'dark' ? '#fff' : '#000',
        marginBottom: 10,
        textAlign: 'center',
    },
    resultDescription: {
        fontSize: 17,
        color: colorScheme === 'dark' ? '#d9d9d9' : '#7a7a7a',
        textAlign: 'center',
        marginBottom: 20,
    },
    activityLevelText: {
        fontSize: 18,
        textAlign: 'center',
        color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
        marginVertical: 10,
    },
    inputLabel: {
        fontSize: 18,
        fontWeight: '500',
        color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
        textAlign: 'center',
    },
    inputDescription: {
        fontSize: 14,
        color: colorScheme === 'dark' ? '#d9d9d9' : '#7a7a7a',
        textAlign: 'center',
        marginBottom: 10,
    },
    activityButton: {
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#eee',
        borderColor: 'transparent',
        width: isIphoneSE() ? 250 : 300,  // 20% from the top of the screen
        alignItems: 'center',
        padding: '3.8%',
        borderRadius: 17,
        marginBottom: '3%',
        borderWidth: 2,
    },
    selectedActivityButton: {
        borderColor: colorScheme === 'dark' ? '#fff' : '#000',
        padding: '3.8%',
        borderRadius: 17,
        marginBottom: '3%',
        borderWidth: 2,
    },
    activityButtonText: {
        fontSize: 18,
        color: colorScheme === 'dark' ? '#FFF' : '#000',
        textAlign: 'center',
    },
    activityDescription: {
        fontSize: 14,
        color: colorScheme === 'dark' ? '#CCC' : '#333',
        textAlign: 'center',
        marginTop: 5,
    },
    progressContainer: {
        width: '100%',
        height: 10,
        backgroundColor: colorScheme === 'dark' ? '#4a4a4a' : '#e0e0e0',
        borderRadius: 5,
        marginTop: 15,
        marginBottom: 20,
    },
    progressBar: {
        height: '100%',
        backgroundColor: colorScheme === 'dark' ? '#fff' : '#000',
        borderRadius: 5,
    },
    goalContainer: {
        marginBottom: 15,
    },
    goalLabel: {
        fontSize: 16,
        color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
        marginBottom: 5,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
    },
    arrowButtons: {
        // empty for now
    },
    inputModalTitle: {
        marginBottom: '5%',
        textAlign: "center",
        fontSize: 22,
        fontWeight: "bold",
        color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
    },
    inputModalTitleSmartCoach: {
        marginBottom: '5%',
        textAlign: "center",
        fontSize: 18,
        fontWeight: "600",
        color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
    },
    checkButton: {
        position: 'absolute',
        right: '0%',
        top: '0%',
        padding: 10,
        zIndex: 90,
        backgroundColor: colorScheme === 'dark' ? '#161618' : '#000',
        borderRadius: 16,
    },
    genderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    modalDescription: {
        fontSize: 14,
        color: colorScheme === 'dark' ? '#AAA' : '#555',
        textAlign: 'center',
        paddingHorizontal: '2%',
        marginTop: '4.6%',
      },
      TopDescriptionText: {
        fontSize: 16,
        color: colorScheme === 'dark' ? '#AAA' : '#555',
        textAlign: 'center',
        paddingHorizontal: '4%',
        marginTop: '-1%',
        marginBottom: '4%'
      },
      BottomDescriptionText: {
        fontSize: 15.5,
        color: colorScheme === 'dark' ? '#AAA' : '#555',
        textAlign: 'center',
        paddingHorizontal: '2%',
        marginTop: '5.5%',
        marginBottom: '16%'
      },
      goalButton: {
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#eee',
        borderColor: 'transparent',
        width: isIphoneSE() ? 250 : 300,  // 20% from the top of the screen
        alignItems: 'center',
        padding: '3.8%',
        borderRadius: 17,
        marginBottom: '3%',
        borderWidth: 2,
    },
    selectedGoalButton: {
        borderColor: colorScheme === 'dark' ? '#fff' : '#000',
        padding: '3.8%',
        borderRadius: 17,
        marginBottom: '3%',
        borderWidth: 2,
    },
    goalButtonText: {
        fontSize: 18,
        color: colorScheme === 'dark' ? '#FFF' : '#000',
        textAlign: 'center',
    },
    goalDescription: {
        fontSize: 14,
        color: colorScheme === 'dark' ? '#CCC' : '#333',
        textAlign: 'center',
        marginTop: 5,
    },
    closeButton: {
        position: 'absolute',
        borderRadius: 100,
        backgroundColor: colorScheme === 'dark' ? '#2a2a2d' : '#000',
        padding: 6,
        top: 20,
        right: 20,
        zIndex: 1,
    },
});

const getCompletionPercent = (current, goal) => (current / goal) * 100;

export default InsightsScreen;
