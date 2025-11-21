// ReviewsModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { Text } from '../../components/CustomText'; 
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useFonts } from 'expo-font';

interface ReviewsModalProps {
  visible: boolean;
  hotelId: string;
  hotelName: string;
  overallRating: number;
  totalReviews: number;
  onClose: () => void;
}

const ReviewsModal: React.FC<ReviewsModalProps> = ({ 
  visible, 
  hotelId, 
  hotelName, 
  overallRating, 
  totalReviews, 
  onClose 
}) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [fontsLoaded] = useFonts({
    'Merriweather-Bold': require('../../assets/fonts/Merriweather_36pt-Bold.ttf'),
    'Merriweather-Regular': require('../../assets/fonts/Merriweather_36pt-Regular.ttf'),
  });

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);

    try {
      //const API_BASE_URL = __DEV__ ? 'http://localhost:3003' : "https://staygenie-wwpa.onrender.com";
      const API_BASE_URL ="https://staygenie-wwpa.onrender.com"
      const url = `${API_BASE_URL}/api/hotels/reviews`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotelId: hotelId,
          limit: 50,
          getSentiment: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data && result.data.reviews) {
        setReviews(result.data.reviews);
      } else {
        setError('No reviews found');
      }
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && reviews.length === 0 && !loading && !error) {
      fetchReviews();
    }
  }, [visible]);

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return "#1df9ff";
    if (rating >= 4.0) return "#1df9ffE6";
    if (rating >= 3.5) return "#1df9ffCC";
    if (rating >= 3.0) return "#1df9ffB3";
    return "#1df9ff99";
  };

  // Filter reviews based on search query
  const filteredReviews = reviews.filter((review) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      review.headline?.toLowerCase().includes(query) ||
      review.pros?.toLowerCase().includes(query) ||
      review.cons?.toLowerCase().includes(query) ||
      review.content?.toLowerCase().includes(query) ||
      review.author?.toLowerCase().includes(query)
    );
  });

  // Helper function to highlight matching text
  const highlightText = (text: string | undefined) => {
    if (!text || !searchQuery.trim()) {
      return text;
    }

    const query = searchQuery.toLowerCase();
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(query);

    if (index === -1) {
      return text;
    }

    const before = text.slice(0, index);
    const match = text.slice(index, index + searchQuery.length);
    const after = text.slice(index + searchQuery.length);

    return { before, match, after };
  };

  // Component to render highlighted text
  const HighlightedText = ({ text, style }: { text: string | undefined; style: any }) => {
    const highlighted = highlightText(text);

    if (!highlighted || typeof highlighted === 'string') {
      return <Text style={style}>{text}</Text>;
    }

    return (
      <Text style={style}>
        {highlighted.before}
        <Text style={[style, { backgroundColor: '#FEF08A', fontFamily: 'Merriweather-Bold' }]}>
          {highlighted.match}
        </Text>
        {highlighted.after}
      </Text>
    );
  };

  if (!visible || !fontsLoaded) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={tw`flex-1 bg-white`}>
        {/* Header */}
        <View style={tw`pt-12 pb-4 px-4 border-b border-gray-200 bg-white`}>
          <View style={tw`flex-row items-center justify-between`}>
            <TouchableOpacity 
              onPress={onClose} 
              style={tw`p-2`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>
            
            <View style={tw`flex-1 items-center mx-4`}>
              <Text style={[tw`text-center text-black text-lg`, { fontFamily: 'Merriweather-Bold' }]}>
                {hotelName}
              </Text>
              <View style={tw`flex-row items-center gap-1 mt-1`}>
              </View>
            </View>
            
            <View style={tw`w-12`} />
          </View>

          {/* Search Bar */}
          {!loading && !error && reviews.length > 0 && (
            <View style={tw`mt-4`}>
              <View style={[
                tw`flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200`,
              ]}>
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  style={[
                    tw`flex-1 ml-2 text-gray-900`,
                    { fontFamily: 'Merriweather-Regular', fontSize: 14 }
                  ]}
                  placeholder="Search reviews..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
              {searchQuery.trim() && (
                <Text style={[tw`text-xs text-gray-500 mt-2 ml-1`, { fontFamily: 'Merriweather-Regular' }]}>
                  {filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'} found
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Loading State */}
        {loading && (
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color="#1df9ff" />
            <Text style={[tw`mt-2 text-gray-600 text-sm`, { fontFamily: 'Merriweather-Regular' }]}>
              Loading reviews...
            </Text>
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={tw`flex-1 items-center justify-center px-4`}>
            <View style={tw`bg-gray-50 border border-gray-200 rounded-xl p-6 items-center`}>
              <View style={[
                tw`w-12 h-12 rounded-full items-center justify-center mb-3`,
                { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
              ]}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
              </View>
              <Text style={[tw`text-gray-900 text-center mb-2`, { fontFamily: 'Merriweather-Bold' }]}>
                Unable to load reviews
              </Text>
              <Text style={[tw`text-gray-600 text-sm text-center mb-4`, { fontFamily: 'Merriweather-Regular' }]}>
                {error}
              </Text>
              <TouchableOpacity
                onPress={fetchReviews}
                style={tw`bg-blue-500 rounded-lg py-2 px-4`}
                activeOpacity={0.8}
              >
                <Text style={[tw`text-white text-sm`, { fontFamily: 'Merriweather-Bold' }]}>
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && reviews.length === 0 && (
          <View style={tw`flex-1 items-center justify-center px-4`}>
            <View style={tw`bg-gray-50 border border-gray-200 rounded-xl p-6 items-center`}>
              <View style={[
                tw`w-12 h-12 rounded-full items-center justify-center mb-3`,
                { backgroundColor: 'rgba(156, 163, 175, 0.1)' }
              ]}>
                <Ionicons name="chatbubbles-outline" size={24} color="#9CA3AF" />
              </View>
              <Text style={[tw`text-center mb-2`, { fontFamily: 'Merriweather-Bold' }]}>
                No reviews yet
              </Text>
              <Text style={[tw`text-gray-600 text-sm text-center`, { fontFamily: 'Merriweather-Regular' }]}>
                Be the first to share your experience
              </Text>
            </View>
          </View>
        )}

        {/* No Search Results */}
        {!loading && !error && reviews.length > 0 && filteredReviews.length === 0 && (
          <View style={tw`flex-1 items-center justify-center px-4`}>
            <View style={tw`bg-gray-50 border border-gray-200 rounded-xl p-6 items-center`}>
              <View style={[
                tw`w-12 h-12 rounded-full items-center justify-center mb-3`,
                { backgroundColor: 'rgba(156, 163, 175, 0.1)' }
              ]}>
                <Ionicons name="search" size={24} color="#9CA3AF" />
              </View>
              <Text style={[tw`text-center mb-2`, { fontFamily: 'Merriweather-Bold' }]}>
                No matching reviews
              </Text>
              <Text style={[tw`text-gray-600 text-sm text-center`, { fontFamily: 'Merriweather-Regular' }]}>
                Try adjusting your search terms
              </Text>
            </View>
          </View>
        )}

        {/* Reviews List */}
        {!loading && !error && filteredReviews.length > 0 && (
          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={tw`p-4 pb-8`}
            showsVerticalScrollIndicator={true}
            onScroll={(e) => {
              if (e.nativeEvent.contentOffset.y > 10) setHasScrolled(true);
            }}
            scrollEventThrottle={16}
          >
            {filteredReviews.map((review) => (
              <View
                key={review.id}
                style={[
                  tw`bg-white border rounded-xl p-4 mb-3`,
                  {
                    borderColor: '#D1D5DB',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2,
                  }
                ]}
              >
                {/* Review Header */}
                <View style={tw`flex-row items-center mb-3`}>
                  <View style={[
                    tw`rounded-full w-10 h-10 items-center justify-center mr-3`,
                    { backgroundColor: getRatingColor(review.rating) }
                  ]}>
                    <Text style={[tw`text-white font-bold text-sm`, { fontFamily: 'Merriweather-Bold' }]}>
                      {review.rating}
                    </Text>
                  </View>
                  <View style={tw`flex-1`}>
                    <HighlightedText 
                      text={review.author}
                      style={[tw`text-gray-900 text-sm`, { fontFamily: 'Merriweather-Bold' }]}
                    />
                    <Text style={[tw`text-xs text-gray-500 mt-0.5`, { fontFamily: 'Merriweather-Regular' }]}>
                      {review.date}
                    </Text>
                  </View>
                </View>

                {/* Review Headline */}
                {review.headline && review.headline.trim() && (
                  <HighlightedText 
                    text={review.headline}
                    style={[tw`text-gray-900 mb-2 text-sm leading-5`, { fontFamily: 'Merriweather-Bold' }]}
                  />
                )}

                {/* Pros */}
                {review.pros && review.pros.trim() && (
                  <View style={tw`mb-2`}>
                    <View style={tw`flex-row items-start`}>
                      <View style={[
                        tw`rounded-full p-1 mr-2 mt-0.5`,
                        { backgroundColor: 'rgba(16, 185, 129, 0.1)' }
                      ]}>
                        <Ionicons name="thumbs-up" size={12} color="#10B981" />
                      </View>
                      <View style={tw`flex-1`}>
                        <HighlightedText 
                          text={review.pros}
                          style={[tw`text-gray-900 text-xs leading-4`, { fontFamily: 'Merriweather-Regular' }]}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Cons */}
                {review.cons && review.cons.trim() && (
                  <View style={tw`mb-2`}>
                    <View style={tw`flex-row items-start`}>
                      <View style={[
                        tw`rounded-full p-1 mr-2 mt-0.5`,
                        { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                      ]}>
                        <Ionicons name="thumbs-down" size={12} color="#EF4444" />
                      </View>
                      <View style={tw`flex-1`}>
                        <HighlightedText 
                          text={review.cons}
                          style={[tw`text-gray-900 text-xs leading-4`, { fontFamily: 'Merriweather-Regular' }]}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Review Content (fallback if no pros/cons) */}
                {review.content && !review.pros && !review.cons && (
                  <HighlightedText 
                    text={review.content}
                    style={[tw`text-xs leading-4 text-gray-900`, { fontFamily: 'Merriweather-Regular' }]}
                  />
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

export default ReviewsModal;