import React, { createContext, useState, useContext, useRef, useCallback } from 'react';
import HiddenWebScraper from '../components/HiddenWebScraper';
import PropTypes from 'prop-types';

// Create the context
const WebScraperContext = createContext();

// Custom hook to use the context
export const useWebScraper = () => useContext(WebScraperContext);

// Provider component
export const WebScraperProvider = ({ children }) => {
  const [currentScrapeRequest, setCurrentScrapeRequest] = useState(null);
  // Use a ref to store pending promises associated with scrape IDs
  const pendingRequestsRef = useRef({});

  // Function to initiate a scrape
  const scrapeUrl = useCallback((url) => {
    return new Promise((resolve, reject) => {
      if (!url || typeof url !== 'string') {
        return reject(new Error('Invalid URL provided for scraping.'));
      }

      // Simple check to prevent requesting a scrape if one is already active
      // A more robust implementation might queue requests
      if (currentScrapeRequest) {
        console.warn('WebScraperProvider: Scrape already in progress. Request ignored.');
        // Reject immediately or queue - rejecting for now
        return reject(new Error('Scraper is busy with another request.'));
      }

      const id = `scrape-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      console.log(`WebScraperProvider: Queueing scrape request ${id} for ${url}`);

      // Store the promise resolvers
      pendingRequestsRef.current[id] = { resolve, reject };

      // Set the current request to trigger the HiddenWebScraper
      setCurrentScrapeRequest({ id, url });
    });
  }, [currentScrapeRequest]); // Depend on currentScrapeRequest to avoid queuing while busy

  // Callback function passed to HiddenWebScraper
  const handleScrapeComplete = useCallback((id, error, html) => {
    console.log(`WebScraperProvider: Scrape complete for request ${id}. Error: ${!!error}`);
    const requestPromise = pendingRequestsRef.current[id];

    if (requestPromise) {
      if (error) {
        requestPromise.reject(error);
      } else {
        requestPromise.resolve(html);
      }
      // Clean up the stored promise
      delete pendingRequestsRef.current[id];
    } else {
      console.warn(`WebScraperProvider: Received completion for unknown scrape ID: ${id}`);
    }

    // Clear the current request state to allow the next one
    setCurrentScrapeRequest(null);
  }, []);

  // Value provided by the context
  const contextValue = {
    scrapeUrl,
  };

  return (
    <WebScraperContext.Provider value={contextValue}>
      {children}
      {/* Render the hidden scraper, passing the current request and completion handler */}
      <HiddenWebScraper
        scrapeRequest={currentScrapeRequest}
        onScrapeComplete={handleScrapeComplete}
      />
    </WebScraperContext.Provider>
  );
};

WebScraperProvider.propTypes = {
  children: PropTypes.node.isRequired,
}; 