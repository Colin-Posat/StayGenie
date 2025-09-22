// ReviewsSlide.tsx - Updated with cleaner layout and different preview approach
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  headline: string;
  content: string;
  pros: string;
  cons: string;
}

interface ReviewsSlideProps {
  hotel: {
    id: string;
    name: string;
    images: string[];
  };
  isVisible?: boolean;
}

interface ReviewsModalProps {
  visible: boolean;
  reviews: Review[];
  hotelName: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}

// Reviews modal component
const ReviewsModal: React.FC<ReviewsModalProps> = ({
  visible,
  reviews,
  hotelName,
  loading,
  error,
  onClose,
  onRetry,
}) => {
  const [hasScrolled, setHasScrolled] = useState(false);

  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y > 10 && !hasScrolled) {
      setHasScrolled(true);
    }
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return "#1df9ff";
    if (rating >= 4.0) return "#1df9ffE6";
    if (rating >= 3.5) return "#1df9ffCC";
    if (rating >= 3.0) return "#1df9ffB3";
    return "#1df9ff99";
  };

  const getReviewStats = () => {
    if (reviews.length === 0) return null;
    
    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    const positiveReviews = reviews.filter(r => r.rating >= 4).length;
    
    return {
      average: avgRating,
      positive: positiveReviews,
      total: reviews.length
    };
  };

  const stats = getReviewStats();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={tw`flex-1 bg-white`}>
        {/* Header */}
        <View style={tw`pt-12 pb-4 px-4 border-b border-gray-200`}>
          <View style={tw`flex-row items-center justify-between`}>
            <TouchableOpacity onPress={onClose} style={tw`p-2`}>
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>
            
            <Text style={tw`text-black text-lg font-semibold flex-1 text-center`}>
              {hotelName}
            </Text>
     
          </View>
        </View>

        {/* Content */}
        {loading && (
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color="#1df9ff" />
            <Text style={tw`mt-2 text-gray-600 text-sm`}>Loading reviews...</Text>
          </View>
        )}

        {error && (
          <View style={tw`flex-1 items-center justify-center px-4`}>
            <View style={tw`bg-gray-50 border border-gray-200 rounded-xl p-6 items-center`}>
              <View style={[
                tw`w-12 h-12 rounded-full items-center justify-center mb-3`,
                { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
              ]}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
              </View>
              <Text style={tw`text-gray-900 font-medium text-center mb-2`}>
                Unable to load reviews
              </Text>
              <Text style={tw`text-gray-600 text-sm text-center mb-4`}>
                {error}
              </Text>
              <TouchableOpacity
                onPress={onRetry}
                style={tw`bg-blue-500 rounded-lg py-2 px-4`}
                activeOpacity={0.8}
              >
                <Text style={tw`text-white font-medium text-sm`}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!loading && !error && reviews.length === 0 && (
          <View style={tw`flex-1 items-center justify-center px-4`}>
            <View style={tw`bg-gray-50 border border-gray-200 rounded-xl p-6 items-center`}>
              <View style={[
                tw`w-12 h-12 rounded-full items-center justify-center mb-3`,
                { backgroundColor: 'rgba(156, 163, 175, 0.1)' }
              ]}>
                <Ionicons name="chatbubbles-outline" size={24} color="#9CA3AF" />
              </View>
              <Text style={tw`text-gray-900 font-medium text-center mb-2`}>
                No reviews yet
              </Text>
              <Text style={tw`text-gray-600 text-sm text-center`}>
                Be the first to share your experience
              </Text>
            </View>
          </View>
        )}

        {reviews.length > 0 && (
          <View style={tw`flex-1 relative`}>
            {/* Scroll hint */}
            {!hasScrolled && (
              <View style={tw`absolute bottom-4 left-0 right-0 z-10 pointer-events-none`}>
                <View style={tw`flex-row justify-center items-center`}>
                  <View style={[
                    tw`bg-gray-800/80 rounded-full px-3 py-2 flex-row items-center`,
                    {
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                    }
                  ]}>
                    <Text style={tw`text-white text-xs mr-1`}>scroll for more</Text>
                    <Ionicons name="chevron-down" size={14} color="white" />
                  </View>
                </View>
              </View>
            )}

            <ScrollView 
              style={tw`flex-1`}
              contentContainerStyle={tw`p-4 pb-8`}
              showsVerticalScrollIndicator={true}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {reviews.map((review) => (
                <View 
                  key={review.id} 
                  style={[
                    tw`bg-white border border-gray-200 rounded-xl p-4 mb-3`,
                    {
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                    }
                  ]}
                >
                  {/* Review header */}
                  <View style={tw`flex-row items-center mb-3`}>
                    <View style={[
                      tw`rounded-full w-8 h-8 items-center justify-center mr-3`,
                      { backgroundColor: getRatingColor(review.rating) }
                    ]}>
                      <Text style={tw`text-white font-bold text-xs`}>
                        {review.rating}
                      </Text>
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={tw`font-medium text-gray-900 text-sm`}>
                        {review.author}
                      </Text>
                      <Text style={tw`text-gray-500 text-xs`}>
                        {review.date}
                      </Text>
                    </View>
                  </View>

                  {/* Review title */}
                  {review.headline && review.headline.trim() && (
                    <Text style={tw`font-medium text-gray-900 mb-2 text-sm leading-5`}>
                      {review.headline}
                    </Text>
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
                        <Text style={tw`text-green-700 flex-1 text-xs leading-4`}>
                          {review.pros}
                        </Text>
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
                        <Text style={tw`text-red-700 flex-1 text-xs leading-4`}>
                          {review.cons}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Full content if no pros/cons */}
                  {review.content && !review.pros && !review.cons && (
                    <Text style={tw`text-gray-700 text-xs leading-4`}>
                      {review.content}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
};

const ReviewsSlide: React.FC<ReviewsSlideProps> = ({
  hotel,
  isVisible = false,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);

    try {
      //const API_BASE_URL = 'http://localhost:3003';
      const API_BASE_URL = "https://staygenie-wwpa.onrender.com";
      const url = `${API_BASE_URL}/api/hotels/reviews`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotelId: hotel.id,
          limit: 15,
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

  // Auto-fetch when slide becomes visible
  useEffect(() => {
    if (isVisible && reviews.length === 0 && !loading && !error) {
      fetchReviews();
    }
  }, [isVisible]);

  const getBackgroundImage = () => {
    return hotel.images?.[2] || hotel.images?.[1] || hotel.images?.[0];
  };

  const getReviewStats = () => {
    if (reviews.length === 0) return null;
    
    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    const positiveReviews = reviews.filter(r => r.rating >= 4).length;
    
    return {
      average: avgRating,
      positive: positiveReviews,
      total: reviews.length
    };
  };

  const stats = getReviewStats();

  const openReviewsModal = () => {
    console.log('📱 Opening reviews modal');
    setShowReviewsModal(true);
  };

  return (
    <View style={tw`flex-1 relative overflow-hidden`}>
      {/* Background image */}
      <View style={tw`absolute inset-0`}>
        <Image 
          source={{ uri: getBackgroundImage() }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
        <View style={tw`absolute inset-0 bg-black/60`} />
      </View>

      {/* Gradient overlay */}
      <View style={tw`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent z-1`} />

      {/* Centered reviews preview */}
      <View style={tw`absolute inset-0 items-center justify-center z-10 px-4`}>
        <TouchableOpacity
          onPress={openReviewsModal}
          style={tw`bg-black/45 border border-white/15 rounded-xl p-4 w-80 max-w-full`}
          activeOpacity={0.8}
        >
          {/* Header */}
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <View style={tw`flex-row items-center`}>
              <View style={[
                tw`w-6 h-6 rounded-full items-center justify-center mr-2`,
                { backgroundColor: loading ? '#6B7280' : error ? '#EF4444' : '#1df9ff' }
              ]}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons 
                    name={error ? "alert-circle" : "chatbubbles"} 
                    size={14} 
                    color="#FFFFFF" 
                  />
                )}
              </View>
              <Text style={tw`text-white text-sm font-semibold`}>
                Guest Reviews
              </Text>
            </View>
            
            {stats && (
              <Text style={tw`text-white/80 text-xs`}>
                {stats.total} reviews
              </Text>
            )}
          </View>
          
          {/* Preview content */}
          {loading && (
            <View style={tw`py-4`}>
              <Text style={tw`text-white/80 text-xs text-center`}>
                Loading reviews...
              </Text>
            </View>
          )}

          {error && (
            <View style={tw`py-4`}>
              <View style={tw`items-center mb-3`}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
                <Text style={tw`text-white text-xs text-center mt-2`}>
                  Unable to load reviews
                </Text>
              </View>
            </View>
          )}

          {!loading && !error && reviews.length === 0 && (
            <View style={tw`py-4 items-center`}>
              <Ionicons name="chatbubbles-outline" size={24} color="rgba(255,255,255,0.7)" />
              <Text style={tw`text-white/70 text-xs text-center mt-2`}>
                No reviews available
              </Text>
            </View>
          )}

          {reviews.length > 0 && (
            <View>

              {/* Preview of first 2 reviews */}
              <View style={tw`gap-2 mb-3`}>
                {reviews.slice(0, 2).map((review, index) => (
                  <View 
                    key={review.id}
                    style={tw`bg-white/10 border border-white/20 rounded-lg p-3`}
                  >
                    <View style={tw`flex-row items-center mb-2`}>
                      <View style={[
                        tw`w-6 h-6 rounded-full items-center justify-center mr-2`,
                        { backgroundColor: '#1df9ff' }
                      ]}>
                        <Text style={tw`text-white font-bold text-xs`}>
                          {review.rating}
                        </Text>
                      </View>
                      <Text style={tw`text-white text-xs font-medium`}>
                        {review.author}
                      </Text>
                    </View>
                    {review.headline && (
                      <Text 
                        style={tw`text-white/90 text-xs leading-4`}
                        numberOfLines={2}
                      >
                        {review.headline}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Call to action */}
          <View style={tw`flex-row items-center justify-center pt-2 border-t border-white/15`}>
            <Ionicons name="expand" size={12} color="#1df9ff" />
            <Text style={tw`text-white text-xs font-medium ml-2`}>
              {reviews.length > 0 
                ? `Tap to View All ${reviews.length} Reviews`
                : loading 
                  ? "Loading Reviews..."
                  : error
                    ? "Tap to Retry"
                    : "No Reviews Available"
              }
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Reviews modal */}
      <ReviewsModal
        visible={showReviewsModal}
        reviews={reviews}
        hotelName={hotel.name}
        loading={loading}
        error={error}
        onClose={() => {
          console.log('📱 Closing reviews modal');
          setShowReviewsModal(false);
        }}
        onRetry={fetchReviews}
      />
    </View>
  );
};
export default ReviewsSlide;