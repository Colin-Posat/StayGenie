// FavoritesScreen.tsx - Updated to match HomeScreen aesthetic
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Animated,
  LayoutAnimation,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import OptionsPopup from '../components/OptionsPopup'; // Import the popup component

const { width: screenWidth } = Dimensions.get('window');

interface Hotel {
  id: number;
  name: string;
  image: string;
  price: number;
  originalPrice: number;
  priceComparison: string;
  rating: number;
  reviews: number;
  safetyRating: number;
  transitDistance: string;
  tags: string[];
  location: string;
  features: string[];
  addedToFavorites?: Date;
  aiExcerpt?: string;
}

interface TripFolder {
  id: string;
  name: string;
  destination: string;
  dateRange: string;
  hotels: Hotel[];
  color: string;
  icon: string;
  createdAt: Date;
}

// Mock trip folders data
const mockTripFolders: TripFolder[] = [
  {
    id: 'trip1',
    name: 'Our Summer Vancouver Trip',
    destination: 'California Coast',
    dateRange: 'Jul 15-22, 2025',
    color: '#FF6B6B',
    icon: 'sunny',
    createdAt: new Date(2024, 11, 15),
    hotels: [
      {
        id: 1,
        name: "Beachfront Paradise",
        image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
        price: 245,
        originalPrice: 280,
        priceComparison: "12% below average",
        rating: 4.7,
        reviews: 1567,
        safetyRating: 9.1,
        transitDistance: "Beach access",
        tags: ["Beachfront", "Water sports", "Sunset view"],
        location: "Coastal Bay",
        features: ["Beach access", "Water sports", "Spa"],
        addedToFavorites: new Date(2024, 11, 15),
        aiExcerpt: "Ultimate beach destination with direct ocean access and water activities"
      },
      {
        id: 2,
        name: "Luxury Riverside Resort",
        image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
        price: 295,
        originalPrice: 275,
        priceComparison: "7% above average",
        rating: 4.8,
        reviews: 2156,
        safetyRating: 9.5,
        transitDistance: "8 min walk",
        tags: ["Luxury", "Spa", "Fine dining"],
        location: "Riverside",
        features: ["Spa", "Restaurant", "Concierge"],
        addedToFavorites: new Date(2024, 11, 15),
        aiExcerpt: "Luxury experience with stunning river views and world-class spa facilities"
      }
    ]
  },
  {
    id: 'trip2',
    name: 'NYC Work Trip',
    destination: 'New York City',
    dateRange: 'Aug 10-14, 2025',
    color: '#4ECDC4',
    icon: 'business',
    createdAt: new Date(2024, 11, 10),
    hotels: [
      {
        id: 3,
        name: "Grand Plaza Downtown",
        image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80",
        price: 189,
        originalPrice: 220,
        priceComparison: "15% below average",
        rating: 4.6,
        reviews: 1248,
        safetyRating: 9.2,
        transitDistance: "2 min walk",
        tags: ["Pet-friendly", "Business center", "Gym"],
        location: "Downtown Core",
        features: ["Free WiFi", "Pool", "Parking"],
        addedToFavorites: new Date(2024, 11, 10),
        aiExcerpt: "Perfect for business travelers with excellent downtown location and modern amenities"
      },
      {
        id: 4,
        name: "Urban Boutique Suite",
        image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80",
        price: 198,
        originalPrice: 225,
        priceComparison: "12% below average",
        rating: 4.6,
        reviews: 756,
        safetyRating: 9.0,
        transitDistance: "1 min walk",
        tags: ["Modern", "Design", "Rooftop"],
        location: "Arts Quarter",
        features: ["Rooftop bar", "Design hotel", "Modern suites"],
        addedToFavorites: new Date(2024, 11, 10),
        aiExcerpt: "Contemporary design hotel with artistic flair and rooftop amenities"
      }
    ]
  },
  {
    id: 'trip3',
    name: 'Colorado Mountain Escape',
    destination: 'Colorado Rockies',
    dateRange: 'Sep 5-12, 2025',
    color: '#45B7D1',
    icon: 'mountain',
    createdAt: new Date(2024, 11, 8),
    hotels: [
      {
        id: 5,
        name: "Cozy Mountain Lodge",
        image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
        price: 129,
        originalPrice: 145,
        priceComparison: "11% below average",
        rating: 4.4,
        reviews: 892,
        safetyRating: 8.7,
        transitDistance: "5 min walk",
        tags: ["Mountain view", "Fireplace", "Hiking"],
        location: "Mountain Peak",
        features: ["Free Breakfast", "WiFi", "Hiking trails"],
        addedToFavorites: new Date(2024, 11, 8),
        aiExcerpt: "Peaceful mountain retreat with breathtaking views and hiking access"
      }
    ]
  },
  {
    id: 'trip4',
    name: 'Boston Weekend Getaway',
    destination: 'Historic Boston',
    dateRange: 'Oct 20-25, 2025',
    color: '#96CEB4',
    icon: 'library',
    createdAt: new Date(2024, 11, 5),
    hotels: [
      {
        id: 6,
        name: "Historic City Center Hotel",
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
        price: 167,
        originalPrice: 190,
        priceComparison: "8% below average",
        rating: 4.5,
        reviews: 934,
        safetyRating: 8.9,
        transitDistance: "3 min walk",
        tags: ["Historic", "Architecture", "Culture"],
        location: "Old Town",
        features: ["Historic charm", "City views", "Restaurant"],
        addedToFavorites: new Date(2024, 11, 5),
        aiExcerpt: "Rich historical charm in the heart of the cultural district"
      }
    ]
  }
];

// Trip Folder Component with HomeScreen-matching styling
interface TripFolderProps {
  folder: TripFolder;
  onPress: (folder: TripFolder) => void;
  onOptions: (folder: TripFolder, position: { x: number; y: number }) => void;
}

const TripFolderCard: React.FC<TripFolderProps> = ({ folder, onPress, onOptions }) => {
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnimation, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handleOptions = (e: any) => {
    e.stopPropagation();
    
    // Get the button position for popup placement
    e.target.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      onOptions(folder, { x: pageX, y: pageY });
    });
  };

  return (
    <Animated.View
      style={[
        tw`mb-4`,
        {
          opacity: fadeAnimation,
          transform: [
            {
              translateY: slideAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
            { scale: scaleAnimation },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={tw`bg-white rounded-xl p-4 border border-gray-100 shadow-sm`}
        onPress={() => onPress(folder)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Header */}
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <Text style={tw`text-[17px] font-semibold text-black leading-5`}>
            {folder.name}
          </Text>

          <TouchableOpacity
            style={tw`p-2 rounded-lg bg-gray-50 border border-gray-100`}
            onPress={handleOptions}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={14} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* Hotel Count */}
        <Text style={tw`text-[13px] font-medium text-gray-600 mb-3`}>
          {folder.hotels.length} saved hotel{folder.hotels.length > 1 ? 's' : ''}
        </Text>

        {/* Hotel Images Grid */}
        {folder.hotels.length > 0 && (
          <View style={tw`flex-row gap-2`}>
            {folder.hotels.slice(0, 4).map((hotel, index) => (
              <View key={hotel.id} style={tw`relative flex-1`}>
                <Image
                  source={{ uri: hotel.image }}
                  style={tw`w-full h-16 rounded-lg`}
                  resizeMode="cover"
                />
                {index === 3 && folder.hotels.length > 4 && (
                  <View style={tw`absolute inset-0 bg-black/60 rounded-lg items-center justify-center`}>
                    <Text style={tw`text-white text-xs font-semibold`}>
                      +{folder.hotels.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Enhanced Empty State matching HomeScreen aesthetic
const EmptyFavorites: React.FC<{ onExplore: () => void; onCreateTrip: () => void }> = ({
  onExplore,
  onCreateTrip
}) => {
  const bounceAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial fade in
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Bounce animation
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    bounceLoop.start();

    return () => bounceLoop.stop();
  }, []);

  const translateY = bounceAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  return (
    <Animated.View
      style={[
        tw`flex-1 items-center justify-center px-6`,
        { opacity: fadeAnimation }
      ]}
    >
      <Animated.View
        style={[
          tw`items-center mb-8`,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={tw`w-20 h-20 bg-gray-50 rounded-2xl items-center justify-center mb-5 border border-gray-100`}>
          <Ionicons name="folder-outline" size={32} color="#9CA3AF" />
        </View>

        <Text style={tw`text-xl font-semibold text-black text-center mb-2`}>
          No Trip Folders Yet
        </Text>

        <Text style={tw`text-[13px] text-gray-600 text-center leading-5 mb-6 max-w-xs`}>
          Create trip folders to organize your favorite hotels by destination and travel dates.
        </Text>
      </Animated.View>

      <View style={tw`flex-row gap-3`}>
        <TouchableOpacity
          style={tw`bg-black py-3 px-5 rounded-xl flex-row items-center shadow-sm`}
          onPress={onCreateTrip}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={tw`text-white font-semibold text-[15px] ml-2`}>
            Create Trip
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`bg-gray-50 py-3 px-5 rounded-xl flex-row items-center border border-gray-100`}
          onPress={onExplore}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={16} color="#666666" />
          <Text style={tw`text-gray-700 font-semibold text-[15px] ml-2`}>
            Explore
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const FavoritesScreen = () => {
  const [tripFolders, setTripFolders] = useState<TripFolder[]>(mockTripFolders);
  
  // Popup states
  const [showOptionsPopup, setShowOptionsPopup] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<TripFolder | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // Handlers
  const handleFolderPress = useCallback((folder: TripFolder) => {
    console.log('Trip folder pressed:', folder.name);
    // Navigate to folder details (hotels list)
  }, []);

  const handleRemoveFolder = useCallback((folder: TripFolder) => {
    Alert.alert(
      "Delete Trip",
      `Are you sure you want to delete "${folder.name}" and all its saved hotels?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (Platform.OS === 'ios') {
              LayoutAnimation.configureNext({
                duration: 300,
                create: {
                  type: LayoutAnimation.Types.easeInEaseOut,
                  property: LayoutAnimation.Properties.opacity,
                },
                update: {
                  type: LayoutAnimation.Types.easeInEaseOut,
                },
                delete: {
                  type: LayoutAnimation.Types.easeInEaseOut,
                  property: LayoutAnimation.Properties.opacity,
                },
              });
            }

            setTripFolders(prev => prev.filter(f => f.id !== folder.id));
            console.log('Removed trip folder:', folder.name);
          }
        }
      ]
    );
  }, []);

  const handleEditFolder = useCallback((folder: TripFolder) => {
    console.log('Edit trip folder:', folder.name);
    // Navigate to edit trip screen
  }, []);

  const handleFolderOptions = useCallback((folder: TripFolder, position: { x: number; y: number }) => {
    setSelectedFolder(folder);
    setPopupPosition(position);
    setShowOptionsPopup(true);
  }, []);

  const handleClosePopup = useCallback(() => {
    setShowOptionsPopup(false);
    setSelectedFolder(null);
  }, []);

  const handleEditFromPopup = useCallback(() => {
    if (selectedFolder) {
      handleEditFolder(selectedFolder);
    }
  }, [selectedFolder]);

  const handleDeleteFromPopup = useCallback(() => {
    if (selectedFolder) {
      handleRemoveFolder(selectedFolder);
    }
  }, [selectedFolder]);

  const handleExplore = useCallback(() => {
    console.log('Explore hotels pressed');
    // Navigate back to home screen or search
  }, []);

  const handleCreateTrip = useCallback(() => {
    console.log('Create trip pressed');
    // Navigate to create trip screen
  }, []);

  const handleBack = useCallback(() => {
    console.log('Back button pressed');
    // Navigate back to previous screen
  }, []);

  const totalHotels = tripFolders.reduce((acc, folder) => acc + folder.hotels.length, 0);

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* SIMPLIFIED HEADER */}
      <View style={tw`px-5 pt-3 pb-4 bg-white`}>
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-1 mr-3`}>
            <Text style={tw`text-xl font-semibold text-black`}>
              My Favorites
            </Text>
            <Text style={tw`text-[13px] text-gray-600 mt-0.5`}>
              {tripFolders.length > 0
                ? `${tripFolders.length} trip${tripFolders.length > 1 ? 's' : ''} • ${totalHotels} saved hotels`
                : "Organize your favorite hotels by trip"
              }
            </Text>
          </View>

          {tripFolders.length > 0 && (
            <TouchableOpacity
              style={tw`bg-black py-2.5 px-5 rounded-xl shadow-sm h-11`}
              onPress={handleCreateTrip}
              activeOpacity={0.7}
            >
              <View style={tw`flex-row items-center justify-center h-full`}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={tw`text-white font-semibold text-[13px] ml-1.5`}>
                  New Trip
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {tripFolders.length === 0 ? (
        <EmptyFavorites onExplore={handleExplore} onCreateTrip={handleCreateTrip} />
      ) : (
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`p-5`}
          showsVerticalScrollIndicator={false}
        >
          {tripFolders.map((folder) => (
            <TripFolderCard
              key={folder.id}
              folder={folder}
              onPress={handleFolderPress}
              onOptions={handleFolderOptions}
            />
          ))}

          {/* Add New Trip Button */}
          <TouchableOpacity
            style={tw`bg-gray-50 border border-dashed border-gray-200 rounded-xl p-5 items-center justify-center mb-4`}
            onPress={handleCreateTrip}
            activeOpacity={0.7}
          >
            <View style={tw`w-10 h-10 bg-gray-100 rounded-xl items-center justify-center mb-3`}>
              <Ionicons name="add" size={20} color="#9CA3AF" />
            </View>
            <Text style={tw`text-gray-700 font-semibold text-[15px] mb-1`}>
              Create New Trip
            </Text>
            <Text style={tw`text-[13px] text-gray-500 text-center leading-4`}>
              Add a new destination to organize your hotels
            </Text>
          </TouchableOpacity>

          {/* Bottom padding */}
          <View style={tw`h-4`} />
        </ScrollView>
      )}

      {/* Options Popup */}
      <OptionsPopup
        visible={showOptionsPopup}
        onClose={handleClosePopup}
        onEdit={handleEditFromPopup}
        onDelete={handleDeleteFromPopup}
        position={popupPosition}
        title={selectedFolder?.name || ''}
      />
    </SafeAreaView>
  );
};

export default FavoritesScreen;