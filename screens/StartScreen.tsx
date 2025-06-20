import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom hook for auto-typing placeholder text
const useTypingPlaceholder = (
  words: string[], 
  typingSpeed = 100, 
  deletingSpeed = 50, 
  delayAfterWord = 2000
) => {
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  
  const currentIndex = useRef(0);
  const currentWord = words[wordIndex];

  // Handle cursor blinking
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);
    
    return () => clearInterval(cursorInterval);
  }, []);

  // Handle typing animation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDeleting) {
        // Deleting text
        setDisplayText(currentWord.substring(0, currentIndex.current - 1));
        currentIndex.current -= 1;
        
        // When deletion is complete, move to next word
        if (currentIndex.current <= 0) {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
        }
      } else {
        // Typing text
        setDisplayText(currentWord.substring(0, currentIndex.current + 1));
        currentIndex.current += 1;
        
        // When word is complete, pause then start deleting
        if (currentIndex.current >= currentWord.length) {
          setTimeout(() => {
            setIsDeleting(true);
          }, delayAfterWord);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);
    
    return () => clearTimeout(timer);
  }, [currentWord, isDeleting, typingSpeed, deletingSpeed, delayAfterWord, words]);

  return { displayText, cursorVisible };
};

interface StartScreenProps {
  onSearch: (query: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const suggestionAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Auto-typing destinations
  const destinations = [
    "Luxury hotels in Dubai",
    "Beach resorts in Bali",
    "Boutique stays in Paris",
    "Safari lodges in Kenya",
    "Mountain retreats in Switzerland",
    "Historic hotels in Rome",
    "Spa resorts in Thailand",
    "City breaks in Tokyo",
  ];

  const { displayText, cursorVisible } = useTypingPlaceholder(
    destinations,
    120,
    60,
    2500
  );

  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Delay suggestions animation
    setTimeout(() => {
      Animated.timing(suggestionAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 800);
  }, []);

  // Pulse animation for mic button
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    setTimeout(() => onSearch(suggestion), 300);
  };

  const handleVoiceSearch = () => {
    setIsListening(true);
    // Simulate voice recognition
    setTimeout(() => {
      setIsListening(false);
      const voiceQuery = "Hotels with ocean view in Maldives";
      setSearchQuery(voiceQuery);
      setTimeout(() => onSearch(voiceQuery), 500);
    }, 3000);
  };

  const suggestions = [
    { icon: 'paw', text: 'Pet-friendly hotels in Istanbul', color: '#8B5CF6' },
    { icon: 'business', text: 'Business hotels near airports', color: '#3B82F6' },
    { icon: 'heart', text: 'Romantic getaways in Santorini', color: '#EF4444' },
    { icon: 'water', text: 'Beach resorts with kids clubs', color: '#06B6D4' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1e293b', '#334155', '#475569']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={styles.title}>Where to next?</Text>
            <Text style={styles.subtitle}>Find your perfect stay from millions of options</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.searchBoxContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={[styles.searchBox, isFocused && styles.searchBoxFocused]}>
              <Ionicons name="search" size={24} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={isFocused || searchQuery ? "Search destinations, hotels..." : `${displayText}${cursorVisible ? '|' : ''}`}
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={22} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            <Animated.View
              style={[
                styles.micButtonContainer,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.micButton, isListening && styles.micButtonActive]}
                onPress={handleVoiceSearch}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isListening ? ['#EF4444', '#DC2626'] : ['#6366F1', '#4F46E5']}
                  style={styles.micButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons 
                    name={isListening ? "stop" : "mic"} 
                    size={28} 
                    color="white" 
                  />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {isListening && (
            <Animated.View style={[styles.listeningContainer, { opacity: fadeAnim }]}>
              <View style={styles.soundWaves}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.soundWave,
                      {
                        height: 16 + Math.random() * 20,
                        opacity: pulseAnim.interpolate({
                          inputRange: [1, 1.2],
                          outputRange: [0.3, 1],
                        }),
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.listeningText}>Listening...</Text>
            </Animated.View>
          )}

          <Animated.View
            style={[
              styles.suggestionsContainer,
              {
                opacity: suggestionAnim,
                transform: [
                  {
                    translateY: suggestionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.suggestionsTitle}>Popular searches</Text>
            <View style={styles.suggestionsList}>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionPress(suggestion.text)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.suggestionIcon, { backgroundColor: suggestion.color + '20' }]}>
                    <Ionicons name={suggestion.icon as any} size={20} color={suggestion.color} />
                  </View>
                  <Text style={styles.suggestionText}>{suggestion.text}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#6B7280" />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View style={[styles.bottomDecoration, { opacity: fadeAnim }]}>
            <View style={styles.decorativeDots}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.dot, { opacity: 0.2 * i }]} />
              ))}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#CBD5E1',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  searchBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 48,
    gap: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchBoxFocused: {
    borderColor: '#6366F1',
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    marginRight: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: '#1F2937',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  micButtonContainer: {
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  micButtonActive: {
    shadowColor: '#EF4444',
  },
  micButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  soundWaves: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  soundWave: {
    width: 4,
    backgroundColor: '#EF4444',
    borderRadius: 2,
  },
  listeningText: {
    color: '#F87171',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsContainer: {
    marginBottom: 48,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  suggestionsList: {
    gap: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  suggestionText: {
    flex: 1,
    fontSize: 16,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  decorativeDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
});

export default StartScreen;