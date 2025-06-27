// StoryProgressBar.tsx - Smooth animated progress bar
import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import tw from 'twrnc';

interface StoryProgressBarProps {
  currentSlide: number;
  totalSlides: number;
  onSlideChange: (slide: number) => void;
  autoProgress?: boolean;
  progressDuration?: number;
}

const StoryProgressBar: React.FC<StoryProgressBarProps> = ({ 
  currentSlide, 
  totalSlides, 
  onSlideChange,
  autoProgress = false,
  progressDuration = 5000 // 5 seconds default
}) => {
  // Create animated values for each progress bar
  const progressValues = useRef(
    Array.from({ length: totalSlides }, () => new Animated.Value(0))
  ).current;

  // Auto-progress timer ref
  const autoProgressTimer = useRef<NodeJS.Timeout | null>(null);

  // Animation for smooth transitions
  useEffect(() => {
    // Reset all progress bars
    progressValues.forEach((value, index) => {
      if (index < currentSlide) {
        // Completed slides - instantly full
        value.setValue(1);
      } else if (index === currentSlide) {
        // Current slide - animate from 0 to 1
        value.setValue(0);
        
        if (autoProgress) {
          // Start auto-progress animation
          Animated.timing(value, {
            toValue: 1,
            duration: progressDuration,
            useNativeDriver: false,
          }).start(({ finished }) => {
            if (finished && currentSlide < totalSlides - 1) {
              onSlideChange(currentSlide + 1);
            }
          });
        } else {
          // Manual control - instantly show as empty
          value.setValue(0);
        }
      } else {
        // Future slides - empty
        value.setValue(0);
      }
    });

    // Cleanup auto-progress timer
    return () => {
      if (autoProgressTimer.current) {
        clearTimeout(autoProgressTimer.current);
      }
    };
  }, [currentSlide, totalSlides, autoProgress, progressDuration, onSlideChange, progressValues]);

  // Manual slide change handler
  const handleSlidePress = (slideIndex: number) => {
    // Stop any ongoing animations
    progressValues.forEach(value => value.stopAnimation());
    
    // Change slide
    onSlideChange(slideIndex);
  };

  return (
    <View style={tw`flex-row absolute top-4 left-4 right-4 z-10 gap-1.5`}>
      {Array.from({ length: totalSlides }, (_, index) => (
        <TouchableOpacity
          key={index}
          style={tw`flex-1 h-0.75 rounded-sm bg-white/30 overflow-hidden`}
          onPress={() => handleSlidePress(index)}
          activeOpacity={0.7}
        >
          {/* Background bar */}
          <View style={tw`absolute inset-0 bg-white/30`} />
          
          {/* Animated progress fill */}
          <Animated.View
            style={[
              tw`absolute inset-0 bg-white rounded-sm`,
              {
                opacity: index <= currentSlide ? 
                  (index < currentSlide ? 0.8 : 1) : 0.3,
                transform: [
                  {
                    scaleX: index < currentSlide ? 1 : 
                           index === currentSlide ? progressValues[index] : 0
                  }
                ],
                transformOrigin: 'left'
              }
            ]}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default StoryProgressBar;