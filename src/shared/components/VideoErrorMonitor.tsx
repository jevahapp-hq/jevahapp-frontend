import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { analyzeVideoUrl } from '../utils/videoUrlManager';

interface VideoErrorMonitorProps {
  videoUrls: string[];
  onUrlFix?: (originalUrl: string, fixedUrl: string) => void;
}

export const VideoErrorMonitor: React.FC<VideoErrorMonitorProps> = ({
  videoUrls,
  onUrlFix
}) => {
  const [urlAnalysis, setUrlAnalysis] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const analysis = videoUrls.map(url => ({
      url,
      analysis: analyzeVideoUrl(url)
    }));
    setUrlAnalysis(analysis);
  }, [videoUrls]);

  const problematicUrls = urlAnalysis.filter(item => 
    item.analysis.isSignedUrl || item.analysis.isExpired || !item.analysis.isValid
  );

  const handleFixUrl = (originalUrl: string) => {
    const analysis = analyzeVideoUrl(originalUrl);
    if (onUrlFix && analysis.convertedUrl !== originalUrl) {
      onUrlFix(originalUrl, analysis.convertedUrl);
    }
  };

  if (problematicUrls.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.successText}>✅ All video URLs are healthy!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setShowDetails(!showDetails)}
      >
        <Text style={styles.headerText}>
          🚨 {problematicUrls.length} Video URL Issues Detected
        </Text>
        <Text style={styles.toggleText}>
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Text>
      </TouchableOpacity>

      {showDetails && (
        <ScrollView style={styles.detailsContainer}>
          {problematicUrls.map((item, index) => (
            <View key={index} style={styles.urlItem}>
              <Text style={styles.urlTitle}>Video {index + 1}</Text>
              
              {item.analysis.isSignedUrl && (
                <View style={styles.issueContainer}>
                  <Text style={styles.issueText}>
                    ⚠️ Signed URL detected
                  </Text>
                  <TouchableOpacity 
                    style={styles.fixButton}
                    onPress={() => handleFixUrl(item.url)}
                  >
                    <Text style={styles.fixButtonText}>Fix URL</Text>
                  </TouchableOpacity>
                </View>
              )}

              {item.analysis.isExpired && (
                <View style={styles.issueContainer}>
                  <Text style={styles.issueText}>
                    ⏰ URL appears expired
                  </Text>
                </View>
              )}

              {!item.analysis.isValid && (
                <View style={styles.issueContainer}>
                  <Text style={styles.issueText}>
                    ❌ Invalid URL format
                  </Text>
                </View>
              )}

              <Text style={styles.urlText} numberOfLines={2}>
                {item.url.substring(0, 100)}...
              </Text>
              
              {item.analysis.convertedUrl !== item.url && (
                <Text style={styles.convertedUrlText} numberOfLines={2}>
                  Fixed: {item.analysis.convertedUrl.substring(0, 100)}...
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          💡 Tip: Backend should provide public URLs instead of signed URLs
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 10,
    padding: 15,
  },
  successText: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc3545',
    flex: 1,
  },
  toggleText: {
    fontSize: 12,
    color: '#6c757d',
  },
  detailsContainer: {
    maxHeight: 300,
  },
  urlItem: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  urlTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#343a40',
  },
  issueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueText: {
    fontSize: 12,
    color: '#dc3545',
    flex: 1,
  },
  fixButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  fixButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  urlText: {
    fontSize: 10,
    color: '#6c757d',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  convertedUrlText: {
    fontSize: 10,
    color: '#28a745',
    fontFamily: 'monospace',
  },
  summary: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  summaryText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default VideoErrorMonitor;

