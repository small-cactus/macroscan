import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Appearance } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '../userContext';

const LogScreen = () => {
  const { user, loading } = useUser();
  const [error, setError] = useState(null);
  const colorScheme = Appearance.getColorScheme();
  const styles = getDynamicStyles(colorScheme);

  useFocusEffect(
    useCallback(() => {
      console.log('LogScreen mounted');
      console.log('User from context:', user);
      console.log('Loading state:', loading);

      if (!user && !loading) {
        console.log('No authenticated user found');
        setError('No authenticated user found');
      } else {
        setError(null);
      }
    }, [user, loading])
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading data...</Text>
      </View>
    );
  }

  if (error) {
    console.log('Error state:', error);
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Current User Data</Text>
      {user ? (
        <View style={styles.item}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{user.name}</Text>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{user.email}</Text>
          <Text style={styles.label}>Subscription:</Text>
          <Text style={styles.value}>{user.subscriptionStatus}</Text>
        </View>
      ) : (
        <Text>No user data available</Text>
      )}
    </View>
  );
};

const getDynamicStyles = (colorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colorScheme === 'dark' ? '#161618' : '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: colorScheme === 'dark' ? '#fff' : '#000',
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colorScheme === 'dark' ? '#5f5f5f' : '#ddd',
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#fff',
    borderRadius: 10,
    width: '100%',
    alignItems: 'flex-start',
  },
  label: {
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
  },
  value: {
    marginBottom: 10,
    color: colorScheme === 'dark' ? '#e9e9e9' : '#000',
  },
  errorText: {
    color: 'red',
    fontSize: 18,
    textAlign: 'center',
  },
});

export default LogScreen;
