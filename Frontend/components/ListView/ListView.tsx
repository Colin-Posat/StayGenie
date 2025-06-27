// ListView.tsx
import React from 'react';
import {
  ScrollView,
} from 'react-native';
import tw from 'twrnc';
import HotelCard from './HotelCard';

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
  aiExcerpt?: string;
}

interface ListViewProps {
  hotels: Hotel[];
  onHotelPress?: (hotel: Hotel) => void;
  onBookNow?: (hotel: Hotel) => void;
}

const ListView: React.FC<ListViewProps> = ({ hotels, onHotelPress, onBookNow }) => {
  return (
    <ScrollView 
      style={tw`flex-1 px-6`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={tw`pb-5`}
    >
      {hotels.map((hotel) => (
        <HotelCard 
          key={hotel.id}
          hotel={hotel}
          onPress={onHotelPress}
          onBookNow={onBookNow}
        />
      ))}
    </ScrollView>
  );
};

export default ListView;