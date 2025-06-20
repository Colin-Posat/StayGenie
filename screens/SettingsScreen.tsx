import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const mockHotels = [
  {
    id: 1,
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
    features: ["Free WiFi", "Pool", "Parking"]
  },
  {
    id: 2,
    name: "Cozy Family Inn",
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
    price: 129,
    originalPrice: 145,
    priceComparison: "11% below average",
    rating: 4.4,
    reviews: 892,
    safetyRating: 8.7,
    transitDistance: "5 min walk",
    tags: ["Family-friendly", "Kitchen", "Laundry"],
    location: "Arts District",
    features: ["Free Breakfast", "WiFi", "Family rooms"]
  },
  {
    id: 3,
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
    features: ["Spa", "Restaurant", "Concierge"]
  }
];

const filters = ["Price", "Rating", "Distance", "Amenities"];

const SettingsScreen = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showMap, setShowMap] = useState(false);

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const SearchHeader = () => (
    <View style={styles.searchHeader}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search hotels..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={() => setShowLogin(true)}>
          <Ionicons name="person-circle-outline" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const FilterBar = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterBar}
      contentContainerStyle={styles.filterBarContent}
    >
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterButton,
            selectedFilters.includes(filter) && styles.filterButtonActive
          ]}
          onPress={() => toggleFilter(filter)}
        >
          <Text style={[
            styles.filterText,
            selectedFilters.includes(filter) && styles.filterTextActive
          ]}>
            {filter}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const DateSelector = () => (
    <View style={styles.dateSelector}>
      <TouchableOpacity style={styles.dateButton}>
        <Text style={styles.dateLabel}>Check-in</Text>
        <Text style={styles.dateValue}>Jan 4</Text>
      </TouchableOpacity>
      <View style={styles.dateSeparator} />
      <TouchableOpacity style={styles.dateButton}>
        <Text style={styles.dateLabel}>Check-out</Text>
        <Text style={styles.dateValue}>Jan 7</Text>
      </TouchableOpacity>
    </View>
  );

  const HotelCard = ({ hotel }: { hotel: typeof mockHotels[0] }) => (
    <TouchableOpacity style={styles.hotelCard}>
      <Image source={{ uri: hotel.image }} style={styles.hotelImage} />
      <View style={styles.hotelInfo}>
        <View style={styles.hotelHeader}>
          <Text style={styles.hotelName}>{hotel.name}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.rating}>{hotel.rating}</Text>
            <Text style={styles.reviews}>({hotel.reviews})</Text>
          </View>
        </View>
        
        <Text style={styles.location}>{hotel.location}</Text>
        
        <View style={styles.tagsContainer}>
          {hotel.tags.slice(0, 2).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${hotel.price}</Text>
            <Text style={styles.originalPrice}>${hotel.originalPrice}</Text>
          </View>
          <Text style={styles.priceComparison}>{hotel.priceComparison}</Text>
        </View>
        
        <View style={styles.bottomRow}>
          <View style={styles.safetyContainer}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={styles.safetyText}>Safety {hotel.safetyRating}</Text>
          </View>
          <Text style={styles.transitDistance}>{hotel.transitDistance}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const LoginModal = () => (
    <Modal
      visible={showLogin}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Login</Text>
            <TouchableOpacity onPress={() => setShowLogin(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalText}>Login functionality would go here</Text>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <SearchHeader />
      <FilterBar />
      
      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <View style={styles.resultsRow}>
          <Text style={styles.resultsCount}>
            {mockHotels.length} hotels found
          </Text>
          <TouchableOpacity 
            style={styles.mapToggle}
            onPress={() => setShowMap(!showMap)}
          >
            <Ionicons 
              name={showMap ? "list" : "map"} 
              size={20} 
              color="#007AFF" 
            />
            <Text style={styles.mapToggleText}>
              {showMap ? "List" : "Map"}
            </Text>
          </TouchableOpacity>
        </View>
        <DateSelector />
      </View>

      {/* Content */}
      {showMap ? (
        <View style={styles.mapContainer}>
          <Text style={styles.mapPlaceholder}>Map View</Text>
          <Text style={styles.mapSubtext}>Map integration would go here</Text>
        </View>
      ) : (
        <ScrollView style={styles.hotelList} showsVerticalScrollIndicator={false}>
          {mockHotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} />
          ))}
        </ScrollView>
      )}

      <LoginModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  filterBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  resultsHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  mapToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mapToggleText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  dateSelector: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dateButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  dateSeparator: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  dateLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  hotelList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  hotelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hotelImage: {
    width: '100%',
    height: 200,
  },
  hotelInfo: {
    padding: 16,
  },
  hotelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  hotelName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 2,
  },
  reviews: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 2,
  },
  location: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#374151',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  priceComparison: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  safetyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyText: {
    fontSize: 12,
    color: '#10b981',
    marginLeft: 4,
    fontWeight: '500',
  },
  transitDistance: {
    fontSize: 12,
    color: '#6b7280',
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  mapPlaceholder: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  mapSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    minHeight: 200,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default SettingsScreen;