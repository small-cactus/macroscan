// TimeZoneContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const TimeZoneContext = createContext();

// Helper function to check if a date is valid
const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date.getTime());
};

export const TimeZoneProvider = ({ children }) => {
  const [userTimeZone, setUserTimeZone] = useState(null);
  const [timeZoneOffset, setTimeZoneOffset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get timezone from device or AsyncStorage
  useEffect(() => {
    const getUserTimeZone = async () => {
      try {
        // Check if timezone is already stored
        const storedTimeZone = await AsyncStorage.getItem('@user_timezone');
        const storedOffset = await AsyncStorage.getItem('@timezone_offset');
        
        if (storedTimeZone && storedOffset) {
          // Use stored timezone if available
          setUserTimeZone(storedTimeZone);
          setTimeZoneOffset(parseInt(storedOffset, 10));
          // console.log('[TimeZoneContext] Using stored timezone:', storedTimeZone, 'with offset:', parseInt(storedOffset, 10));
          setLoading(false);
        } else {
          // Get timezone from device
          const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          // Convert minutes to seconds and invert (JS gives opposite sign of what we need)
          const deviceOffset = new Date().getTimezoneOffset() * -60; 
          
          // console.log('[TimeZoneContext] Using device timezone:', deviceTimeZone, 'with offset:', deviceOffset);
          
          // Store timezone in AsyncStorage
          await AsyncStorage.setItem('@user_timezone', deviceTimeZone);
          await AsyncStorage.setItem('@timezone_offset', deviceOffset.toString());
          
          setUserTimeZone(deviceTimeZone);
          setTimeZoneOffset(deviceOffset);
          setLoading(false);
        }
        
        // Log timezone info
        const utcNow = new Date();
        // console.log('[TimeZoneContext] Current UTC time:', utcNow.toISOString());
      } catch (err) {
        // console.error('Error getting timezone:', err);
        setError(err);
        setLoading(false);
        
        // Use device timezone as fallback
        try {
          const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const deviceOffset = new Date().getTimezoneOffset() * -60; // Convert to seconds
          
          // console.log('[TimeZoneContext] Using fallback device timezone:', deviceTimeZone, 'with offset:', deviceOffset);
          
          setUserTimeZone(deviceTimeZone);
          setTimeZoneOffset(deviceOffset);
          
          // Store fallback timezone
          await AsyncStorage.setItem('@user_timezone', deviceTimeZone);
          await AsyncStorage.setItem('@timezone_offset', deviceOffset.toString());
        } catch (storageErr) {
          // console.error('Error storing timezone:', storageErr);
        }
      }
    };

    getUserTimeZone();
  }, []);

  // Get current date in user's timezone by applying the timezone offset
  const getUserDate = () => {
    try {
      // Get the current UTC date and time
      const now = new Date();
      
      // Create a new date with the offset applied directly to UTC time
      if (timeZoneOffset !== null) {
        // Get UTC time in milliseconds
        const utcTime = now.getTime();
        
        // Get the local timezone offset in milliseconds
        const localOffset = now.getTimezoneOffset() * 60 * 1000;
        
        // Calculate the target timezone time by:
        // 1. Converting to UTC (removing local offset)
        // 2. Then adding the desired timezone offset
        const adjustedTime = utcTime + localOffset + (timeZoneOffset * 1000);
        
        return new Date(adjustedTime);
      }
      
      // Fallback approach using device timezone
      return new Date();
    } catch (err) {
      // console.error('Error in getUserDate:', err);
      return new Date(); // Fallback
    }
  };

  // Get today's date string in YYYY-MM-DD format for the user's timezone
  const getTodayString = () => {
    try {
      const localNow = getUserDate();
      
      // Extract UTC components and adjust for timezone
      const utcMs = localNow.getTime();
      
      // Create a date string in YYYY-MM-DD format
      const localDate = new Date(utcMs);
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (err) {
      // console.error('Error in getTodayString:', err);
      // Ultimate fallback: just use UTC date components
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };

  // Log date information on first load
  useEffect(() => {
    if (!loading && userTimeZone) {
      const utcNow = new Date();
      const utcMs = utcNow.getTime();
      
      // Manually calculate local time based on offset
      const localOffset = utcNow.getTimezoneOffset() * 60 * 1000;
      const localMs = utcMs + localOffset + (timeZoneOffset * 1000);
      const localNow = new Date(localMs);
      
      const todayString = getTodayString();
      
      // Helper function to format time in 12-hour format
      const formatTimeIn12Hour = (hours, minutes, seconds) => {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12; // Convert 0 to 12 for midnight
        return `${hours12}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
      };
      
      // Format UTC time
      const formatUTCTime = (date) => {
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        const weekday = weekdays[date.getUTCDay()];
        const month = months[date.getUTCMonth()];
        const day = date.getUTCDate();
        const year = date.getUTCFullYear();
        const time = formatTimeIn12Hour(date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
        
        return `${weekday}, ${month} ${day}, ${year} at ${time} UTC`;
      };
      
      // Format local time
      const formatLocalTime = (date, timezone) => {
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        // Extract date components
        const weekday = weekdays[date.getDay()];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        const time = formatTimeIn12Hour(date.getHours(), date.getMinutes(), date.getSeconds());
        
        // Extract timezone name
        const timeZoneName = timezone.split('/')[1]?.replace('_', ' ') || timezone;
        
        return `${weekday}, ${month} ${day}, ${year} at ${time} ${timeZoneName} Time`;
      };
      
      // Get the UTC and local hours for debugging
      const utcHour = utcNow.getUTCHours();
      const localHour = localNow.getHours();
      
      // Create a visually distinct log for better readability
      // console.log('\n');
      // console.log('==================================================');
      // console.log('📅 TIMEZONE INFORMATION');
      // console.log('==================================================');
      // console.log('🌐 UTC TIME:');
      // console.log('   ' + utcNow.toISOString());
      // console.log('   ' + formatUTCTime(utcNow));
      // console.log(`   UTC Hour: ${utcHour} (24h format)`);
      // console.log('\n');
      // console.log('🕒 LOCAL TIME (' + userTimeZone + '):');
      // console.log('   Timestamp: ' + localNow.toISOString());
      // console.log('   Formatted: ' + formatLocalTime(localNow, userTimeZone));
      // console.log(`   Local Hour: ${localHour} (24h format)`);
      // console.log(`   Local Time Raw: ${localNow.toString()}`);
      // console.log('\n');
      // console.log('📊 TIME DETAILS:');
      // console.log('   Today (YYYY-MM-DD): ' + todayString);
      // console.log('   Timezone Offset: ' + (timeZoneOffset / 3600) + ' hours (' + timeZoneOffset + ' seconds)');
      // console.log('   Hour difference: UTC ' + utcHour + ' - Local ' + localHour + ' = ' + (utcHour - localHour) + ' hours');
      // console.log('   Date calculations: UTC ms: ' + utcMs + ', Local ms: ' + localMs + ', Diff: ' + (localMs - utcMs) + 'ms');
      
      // Also log the time until midnight
      const midnight = getTimeUntilMidnight();
      // console.log('   Time until midnight: ' + midnight.formatted);
      // console.log('==================================================');
      // console.log('\n');
    }
  }, [loading, userTimeZone, timeZoneOffset]);

  // Get time until midnight in user's timezone
  const getTimeUntilMidnight = () => {
    try {
      const localNow = getUserDate();
      
      // Create local midnight by setting hours, minutes, seconds to zero for the NEXT day
      const localMidnight = new Date(localNow);
      localMidnight.setDate(localMidnight.getDate() + 1); // Move to next day
      localMidnight.setHours(0, 0, 0, 0); // Set to start of day
      
      if (!isValidDate(localMidnight)) {
        throw new Error('Invalid midnight date');
      }
      
      // Calculate milliseconds until midnight
      const millisTillMidnight = localMidnight.getTime() - localNow.getTime();
      
      // Validate the result is reasonable
      if (millisTillMidnight < 0 || millisTillMidnight > 24 * 60 * 60 * 1000) {
        throw new Error('Invalid time until midnight calculation');
      }
      
      const hours = Math.floor(millisTillMidnight / (1000 * 60 * 60));
      const minutes = Math.floor((millisTillMidnight % (1000 * 60 * 60)) / (1000 * 60));
      
      return {
        milliseconds: millisTillMidnight,
        formatted: `${hours} hours and ${minutes} minutes`,
        hours,
        minutes
      };
    } catch (err) {
      // console.error('Error in getTimeUntilMidnight:', err);
      // Return a default value if calculation fails
      return {
        milliseconds: 12 * 60 * 60 * 1000, // 12 hours as fallback
        formatted: "12 hours and 0 minutes",
        hours: 12,
        minutes: 0
      };
    }
  };

  // Format a date string with the user's timezone
  const formatDate = (dateString) => {
    try {
      if (!dateString) return '';
      
      // Parse the input date string (this will give a UTC date)
      const utcDate = new Date(dateString);
      
      // Validate the date before formatting
      if (!isValidDate(utcDate)) {
        throw new Error('Invalid date for formatting');
      }
      
      // Apply the timezone offset
      let localDate = utcDate;
      if (timeZoneOffset !== null) {
        // Adjust for the timezone offset if we have it
        localDate = new Date(utcDate.getTime() + (timeZoneOffset * 1000));
      }
      
      // Format with the local settings
      const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit' 
      };
      
      return localDate.toLocaleString(undefined, options);
    } catch (err) {
      // console.error('Error in formatDate:', err, 'dateString:', dateString);
      // Return the original string if formatting fails
      return dateString || '';
    }
  };

  // Check if a stored date is today in user's timezone
  const isDateToday = (dateString) => {
    try {
      if (!dateString) return false;
      
      // Get today's string for comparison in user's timezone
      const todayString = getTodayString();
      
      // For most stored dates, we expect them to be in YYYY-MM-DD format already,
      // so we can do a direct string comparison
      if (dateString.length === 10 && dateString.includes('-')) {
        return dateString === todayString;
      }
      
      // If it's a full ISO string or other format, parse it and convert to user's timezone
      const date = new Date(dateString);
      if (!isValidDate(date)) {
        return false;
      }
      
      // Apply timezone offset and format as YYYY-MM-DD
      let localDate = date;
      if (timeZoneOffset !== null) {
        localDate = new Date(date.getTime() + (timeZoneOffset * 1000));
      }
      
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      return dateStr === todayString;
    } catch (err) {
      // console.error('Error in isDateToday:', err);
      return false; // Default to false if there's an error
    }
  };

  return (
    <TimeZoneContext.Provider
      value={{
        userTimeZone,
        timeZoneOffset,
        loading,
        error,
        getUserDate,
        getTodayString,
        getTimeUntilMidnight,
        formatDate,
        isDateToday
      }}
    >
      {children}
    </TimeZoneContext.Provider>
  );
};

export const useTimeZone = () => useContext(TimeZoneContext); 