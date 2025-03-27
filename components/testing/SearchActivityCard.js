import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, useColorScheme } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LoadingSpinner from './LoadingSpinner';

const AnimatedListItem = ({ children, index, itemsCount }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={{ 
        opacity: fadeAnim, 
        transform: [{ translateY: slideAnim }],
        marginBottom: index === itemsCount - 1 ? 0 : 8
      }}
    >
      {children}
    </Animated.View>
  );
};

const WebsiteItem = ({ url, index, itemsCount }) => {
  const colorScheme = useColorScheme();
  const domain = url.split('/')[2] || url;
  
  return (
    <AnimatedListItem index={index} itemsCount={itemsCount}>
      <View style={[
        styles.websiteItem,
        { backgroundColor: colorScheme === 'dark' ? '#333333' : '#e8e8e8' }
      ]}>
        <View style={styles.itemIconContainer}>
          <Ionicons 
            name="globe-outline" 
            size={16} 
            style={[styles.itemIcon, { color: '#3b82f6' }]} 
          />
        </View>
        <Text 
          style={[styles.websiteText, { color: colorScheme === 'dark' ? '#dddddd' : '#333333' }]} 
          numberOfLines={1}
        >
          {domain}
        </Text>
      </View>
    </AnimatedListItem>
  );
};

const SourceItem = ({ source, index, itemsCount }) => {
  const colorScheme = useColorScheme();
  
  return (
    <AnimatedListItem index={index} itemsCount={itemsCount}>
      <View style={[
        styles.sourceItem,
        { backgroundColor: colorScheme === 'dark' ? '#333333' : '#e8e8e8' }
      ]}>
        <View style={styles.itemIconContainer}>
          <Ionicons 
            name="link-outline" 
            size={16} 
            style={[styles.itemIcon, { color: '#3b82f6' }]} 
          />
        </View>
        <Text 
          style={[styles.sourceText, { color: colorScheme === 'dark' ? '#dddddd' : '#333333' }]} 
          numberOfLines={1}
        >
          {source}
        </Text>
      </View>
    </AnimatedListItem>
  );
};

const ToolBadge = ({ tool, index }) => {
  const colorScheme = useColorScheme();
  
  return (
    <AnimatedListItem index={index} itemsCount={1}>
      <View style={[
        styles.toolBadge,
        { backgroundColor: colorScheme === 'dark' ? '#333333' : '#e8e8e8' }
      ]}>
        <Ionicons 
          name="flash-outline" 
          size={14} 
          style={[styles.toolIcon, { color: '#3b82f6' }]} 
        />
        <Text 
          style={[styles.toolText, { color: colorScheme === 'dark' ? '#dddddd' : '#333333' }]}
        >
          {tool}
        </Text>
      </View>
    </AnimatedListItem>
  );
};

const SectionHeader = ({ title, icon }) => {
  const colorScheme = useColorScheme();
  
  return (
    <View style={styles.sectionHeader}>
      {icon && (
        <Ionicons 
          name={icon} 
          size={16} 
          style={{ color: '#3b82f6', marginRight: 8 }} 
        />
      )}
      <Text style={[
        styles.sectionTitle,
        { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }
      ]}>
        {title}
      </Text>
    </View>
  );
};

const SearchActivityCard = ({ 
  identifiedFood,
  processStep,
  currentQuery,
  currentSearchEngine,
  visitedWebsites,
  searchSources,
  activeTools
}) => {
  const colorScheme = useColorScheme();
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const slideInAnim = useRef(new Animated.Value(30)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.timing(slideInAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();
  }, []);
  
  // Get unique tools
  const uniqueTools = [...new Set(activeTools)];

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
          opacity: fadeInAnim,
          transform: [{ translateY: slideInAnim }]
        }
      ]}
    >
      <View style={styles.header}>
        <Text 
          style={[
            styles.title,
            { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }
          ]}
        >
          {identifiedFood ? `Analyzing: ${identifiedFood}` : 'Identifying food...'}
        </Text>
      </View>
      
      <LoadingSpinner message={processStep} accentColor="#3b82f6" />
      
      {currentQuery && (
        <View style={[
          styles.queryContainer,
          { backgroundColor: colorScheme === 'dark' ? '#262626' : '#e8e8e8' }
        ]}>
          <Text style={[
            styles.queryLabel,
            { color: colorScheme === 'dark' ? '#aaaaaa' : '#666666' }
          ]}>
            CURRENT SEARCH
          </Text>
          <Text style={[
            styles.queryText,
            { color: colorScheme === 'dark' ? '#ffffff' : '#333333' }
          ]}>
            {currentQuery}
          </Text>
        </View>
      )}
      
      {currentSearchEngine && (
        <View style={[
          styles.searchEngineContainer,
          { backgroundColor: colorScheme === 'dark' ? '#333333' : '#e8e8e8' }
        ]}>
          <Ionicons 
            name="search-outline" 
            size={18} 
            style={[
              styles.searchIcon,
              { color: '#3b82f6' }
            ]} 
          />
          <Text style={[
            styles.searchEngineText,
            { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }
          ]}>
            Searching {currentSearchEngine}
          </Text>
        </View>
      )}
      
      {uniqueTools.length > 0 && (
        <View style={styles.toolsSection}>
          <SectionHeader title="Analysis Tools" icon="build-outline" />
          <View style={styles.toolsList}>
            {uniqueTools.map((tool, index) => (
              <ToolBadge key={index} tool={tool} index={index} />
            ))}
          </View>
        </View>
      )}
      
      {visitedWebsites.length > 0 && (
        <View style={styles.websitesSection}>
          <SectionHeader title="Checking Websites" icon="globe-outline" />
          {visitedWebsites.map((website, index) => (
            <WebsiteItem 
              key={index} 
              url={website} 
              index={index} 
              itemsCount={visitedWebsites.length} 
            />
          ))}
        </View>
      )}
      
      {searchSources.length > 0 && (
        <View style={styles.sourcesSection}>
          <SectionHeader title="Information Sources" icon="information-circle-outline" />
          {searchSources.slice(-3).map((source, index) => (
            <SourceItem 
              key={index} 
              source={source} 
              index={index} 
              itemsCount={Math.min(searchSources.length, 3)} 
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  queryContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  queryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  queryText: {
    fontSize: 15,
    fontWeight: '500',
  },
  searchEngineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchEngineText: {
    fontSize: 15,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  toolsSection: {
    marginBottom: 20,
  },
  toolsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  toolIcon: {
    marginRight: 6,
  },
  toolText: {
    fontSize: 13,
    fontWeight: '500',
  },
  websitesSection: {
    marginBottom: 20,
  },
  websiteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
  },
  itemIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemIcon: {
    marginRight: 0,
  },
  websiteText: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  sourcesSection: {
    marginBottom: 8,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
  },
  sourceText: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
});

export default SearchActivityCard; 