import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import { WebView } from 'react-native-webview';
import PropTypes from 'prop-types';

const SCRAPE_TIMEOUT = 15000; // 15 seconds timeout for loading/scraping

const HiddenWebScraper = ({ scrapeRequest, onScrapeComplete }) => {
  const webviewRef = useRef(null);
  const [currentUrl, setCurrentUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const timeoutRef = useRef(null);

  // Effect to handle app state changes (pause/resume scraping)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('HiddenWebScraper: App has come to the foreground!');
        // Optionally reload or re-inject JS if needed on resume
      }
      setAppState(nextAppState);
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [appState]);

  // Effect to process incoming scrape requests
  useEffect(() => {
    if (scrapeRequest && scrapeRequest.url && !isLoading) {
      console.log(`HiddenWebScraper: Starting scrape for ${scrapeRequest.url}`);
      setIsLoading(true);
      setCurrentUrl(scrapeRequest.url);
      // Set a timeout for the entire process
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        console.warn(`HiddenWebScraper: Scrape timed out for ${scrapeRequest.url}`);
        handleScrapeEnd(new Error(`Scrape timed out after ${SCRAPE_TIMEOUT / 1000}s`), null);
      }, SCRAPE_TIMEOUT);
    }
  }, [scrapeRequest, isLoading]);

  // Cleanup function for when scraping ends (success, error, or timeout)
  const handleScrapeEnd = useCallback((error, html) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (isLoading) { // Ensure we only call back once per request
      setIsLoading(false);
      setCurrentUrl(null); // Allow next request
      if (scrapeRequest?.id) {
        onScrapeComplete(scrapeRequest.id, error, html);
      }
    }
  }, [isLoading, onScrapeComplete, scrapeRequest]);

  // Called when the WebView finishes loading a page or fails
  const handleLoadEnd = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.log(`HiddenWebScraper: Load event for ${nativeEvent.url}: ${nativeEvent.loading ? 'loading' : 'finished'}`);
    // Note: We rely on injectedJS to send the message, handleLoadEnd is just for info/errors
  };

  // Called on WebView loading errors
  const handleLoadError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    // Ignore "Frame interrupted" errors often caused by navigation cancellation
    if (nativeEvent.code === -999 || nativeEvent.description?.includes('Frame load interrupted')) {
        console.log(`HiddenWebScraper: Ignoring frame load interrupted error for ${nativeEvent.url}`);
        return;
    }
    console.error(`HiddenWebScraper: WebView Load Error for ${nativeEvent.url}:`, nativeEvent.description);
    handleScrapeEnd(new Error(`WebView load error: ${nativeEvent.description}`), null);
  };

  // Called when the injected JavaScript posts a message
  const onMessage = (event) => {
    const html = event.nativeEvent.data;
    console.log(`HiddenWebScraper: ☑️ Received HTML content (${html?.length || 0} bytes)`);
    if (html && html.length > 0) {
      handleScrapeEnd(null, html); // Success
    } else {
      // Sometimes message might be empty if JS failed or page was blank
      console.warn('HiddenWebScraper: Received empty message from WebView.');
      handleScrapeEnd(new Error('Received empty HTML content from page'), null);
    }
  };

  // JavaScript to inject into the WebView
  // Waits for DOMContentLoaded or a fallback timeout, then sends HTML back
  const injectedJS = `
    ;(function() {
      const TIMEOUT = ${SCRAPE_TIMEOUT - 2000}; // Slightly less than overall timeout
      let posted = false;
      function postHTML() {
        if (posted) return;
        posted = true;
        // Use outerHTML for the whole document structure
        window.ReactNativeWebView.postMessage(document.documentElement.outerHTML || '');
      }
      // Try sending immediately after load, but also wait for DOMContentLoaded
      window.addEventListener('DOMContentLoaded', postHTML);
      // Fallback timeout in case DOMContentLoaded doesn't fire or is too slow
      setTimeout(postHTML, TIMEOUT);
      // Sometimes pages load instantly, try posting early too
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
         setTimeout(postHTML, 500); // Slight delay after initial load
      }
    })();
    // Required for iOS
    true;
  `;

  // Only render WebView when actively scraping
  if (!isLoading || !currentUrl) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <WebView
        key={currentUrl} // Force re-render when URL changes
        ref={webviewRef}
        source={{ uri: currentUrl }}
        injectedJavaScript={injectedJS}
        onMessage={onMessage}
        onLoadEnd={handleLoadEnd}
        onError={handleLoadError} // Catch basic load errors
        onHttpError={(syntheticEvent) => { // Catch HTTP errors
            const { nativeEvent } = syntheticEvent;
            console.error(`HiddenWebScraper: HTTP Error for ${nativeEvent.url}: ${nativeEvent.statusCode}`);
            handleScrapeEnd(new Error(`HTTP error ${nativeEvent.statusCode}`), null);
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true} // May be needed for some sites
        cacheEnabled={false} // Disable cache to ensure fresh content
        style={styles.webview}
        // Improve performance by reducing render passes
        renderLoading={() => <View />} // Render nothing while loading
        // Set a reasonable user agent
        userAgent="Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36"
      />
    </View>
  );
};

HiddenWebScraper.propTypes = {
  scrapeRequest: PropTypes.shape({
    id: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
  }),
  onScrapeComplete: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, // Keep at top 0, visibility handled by opacity/size
    left: 0,
    width: 0, // Use 0 size instead of negative position
    height: 0,
    opacity: 0, // Fully transparent
    zIndex: -1, // Ensure it's behind everything
    overflow: 'hidden', // Hide potential rendering artifacts
  },
  webview: {
    flex: 1, // Take up the container size (which is 0x0)
    width: 1, // Needs some dimension to render internally
    height: 1,
  },
});

export default HiddenWebScraper; 