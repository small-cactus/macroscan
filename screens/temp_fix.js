        updateAverageProcessingTime,
      };
      
      // Update visualization with initial query data
      if (searchVisualizationRef.current) {
        searchVisualizationRef.current.updateWithScanData({ _searchInfo: { queries } });
      }
    }
  };
