// SearchQueryData.ts - Process CSV data into search queries with hotels (minimum 5 hotels per query)
import { BeautifulHotel } from '../components/InitalSearch/BeautifulHotelCard';

// Raw hotel data structure from CSV
interface RawHotelData {
  Category: string;
  'Search Query': string;
  'Hotel Name': string;
  City: string;
  Country: string;
  Price: string;
  Currency: string;
  Stars: string;
  'Main Photo': string;
  'Google Maps Link': string;
}

// Sample data extracted from the CSV
const rawHotelData: RawHotelData[] = [
  
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Luxury safari lodges in Kenya with pools",
    'Hotel Name': "Nairobi Serena Hotel",
    City: "Nairobi",
    Country: "ke",
    Price: "230.7",
    Currency: "USD",
    Stars: "5",
    'Main Photo': "https://static.cupid.travel/hotels/249783997.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Nairobi%20Serena%20Hotel%20Nairobi%20ke&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Luxury safari lodges in Kenya with pools",
    'Hotel Name': "Safari Park Hotel",
    City: "Nairobi",
    Country: "ke",
    Price: "204.08",
    Currency: "USD",
    Stars: "",
    'Main Photo': "https://static.cupid.travel/hotels/295038135.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Safari%20Park%20Hotel%20Nairobi%20ke&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Luxury safari lodges in Kenya with pools",
    'Hotel Name': "Sarova Whitesands Beach Resort & Spa",
    City: "Mombasa",
    Country: "KE",
    Price: "241.76",
    Currency: "USD",
    Stars: "4",
    'Main Photo': "https://static.cupid.travel/hotels/ex_3f86a264_z.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Sarova%20Whitesands%20Beach%20Resort%20%26%20Spa%20Mombasa%20KE&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Luxury safari lodges in Kenya with pools",
    'Hotel Name': "Sarova Stanley",
    City: "Nairobi",
    Country: "ke",
    Price: "156.01",
    Currency: "USD",
    Stars: "5",
    'Main Photo': "https://static.cupid.travel/hotels/178620791.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Sarova%20Stanley%20Nairobi%20ke&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Luxury safari lodges in Kenya with pools",
    'Hotel Name': "Sarova Panafric Hotel",
    City: "Nairobi",
    Country: "ke",
    Price: "196.03",
    Currency: "USD",
    Stars: "4",
    'Main Photo': "https://static.cupid.travel/hotels/511186132.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Sarova%20Panafric%20Hotel%20Nairobi%20ke&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Luxury safari lodges in Kenya with pools",
    'Hotel Name': "Nairobi Safari Club by Swiss-Belhotel",
    City: "Nairobi",
    Country: "ke",
    Price: "85.22",
    Currency: "USD",
    Stars: "4",
    'Main Photo': "https://static.cupid.travel/hotels/282142132.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Nairobi%20Safari%20Club%20by%20Swiss-Belhotel%20Nairobi%20ke&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Boutique hotels in Kyoto with gardens",
    'Hotel Name': "Rihga Royal Hotel Tokyo",
    City: "Tokyo",
    Country: "jp",
    Price: "97.25",
    Currency: "USD",
    Stars: "4",
    'Main Photo': "https://static.cupid.travel/hotels/58323680.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Rihga%20Royal%20Hotel%20Tokyo%20Tokyo%20jp&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Boutique hotels in Kyoto with gardens",
    'Hotel Name': "Grand Prince Hotel Osaka Bay",
    City: "Osaka",
    Country: "jp",
    Price: "210.55",
    Currency: "USD",
    Stars: "5",
    'Main Photo': "https://static.cupid.travel/hotels/475180211.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Grand%20Prince%20Hotel%20Osaka%20Bay%20Osaka%20jp&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Boutique hotels in Kyoto with gardens",
    'Hotel Name': "Renaissance Okinawa Resort",
    City: "Onna",
    Country: "jp",
    Price: "460",
    Currency: "USD",
    Stars: "5",
    'Main Photo': "https://static.cupid.travel/hotels/140022715.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Renaissance%20Okinawa%20Resort%20Onna%20jp&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Boutique hotels in Kyoto with gardens",
    'Hotel Name': "Rose Hotel Yokohama, The Distinctive Collection By WORLDHOTELS",
    City: "Yokohama",
    Country: "jp",
    Price: "95.17",
    Currency: "USD",
    Stars: "4",
    'Main Photo': "https://static.cupid.travel/hotels/566734819.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Rose%20Hotel%20Yokohama%2C%20The%20Distinctive%20Collection%20By%20WORLDHOTELS%20Yokohama%20jp&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Boutique hotels in Kyoto with gardens",
    'Hotel Name': "Keio Plaza Hotel Tokyo",
    City: "Tokyo",
    Country: "jp",
    Price: "281.98",
    Currency: "USD",
    Stars: "5",
    'Main Photo': "https://static.cupid.travel/hotels/388091787.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Keio%20Plaza%20Hotel%20Tokyo%20Tokyo%20jp&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Boutique hotels in Kyoto with gardens",
    'Hotel Name': "ANA Crowne Plaza Osaka, an IHG Hotel",
    City: "Osaka",
    Country: "jp",
    Price: "290.62",
    Currency: "USD",
    Stars: "5",
    'Main Photo': "https://static.cupid.travel/hotels/273383421.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=ANA%20Crowne%20Plaza%20Osaka%2C%20an%20IHG%20Hotel%20Osaka%20jp&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Lake-view hotels in Banff National Park",
    'Hotel Name': "Best Western Plus Siding 29 Lodge",
    City: "Banff",
    Country: "ca",
    Price: "432.06",
    Currency: "USD",
    Stars: "3",
    'Main Photo': "https://static.cupid.travel/hotels/599682891.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Best%20Western%20Plus%20Siding%2029%20Lodge%20Banff%20ca&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Lake-view hotels in Banff National Park",
    'Hotel Name': "Royal Canadian Lodge",
    City: "Banff",
    Country: "ca",
    Price: "491.06",
    Currency: "USD",
    Stars: "4",
    'Main Photo': "https://static.cupid.travel/hotels/599046660.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Royal%20Canadian%20Lodge%20Banff%20ca&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Lake-view hotels in Banff National Park",
    'Hotel Name': "Banff Park Lodge",
    City: "Banff",
    Country: "ca",
    Price: "464.54",
    Currency: "USD",
    Stars: "3",
    'Main Photo': "https://static.cupid.travel/hotels/421771295.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Banff%20Park%20Lodge%20Banff%20ca&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Lake-view hotels in Banff National Park",
    'Hotel Name': "Banff Caribou Lodge and Spa",
    City: "Banff",
    Country: "ca",
    Price: "394.83",
    Currency: "USD",
    Stars: "3",
    'Main Photo': "https://static.cupid.travel/hotels/197393610.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Banff%20Caribou%20Lodge%20and%20Spa%20Banff%20ca&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Lake-view hotels in Banff National Park",
    'Hotel Name': "Banff Ptarmigan Inn",
    City: "Banff",
    Country: "ca",
    Price: "365.5",
    Currency: "USD",
    Stars: "3",
    'Main Photo': "https://static.cupid.travel/hotels/44789839.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Banff%20Ptarmigan%20Inn%20Banff%20ca&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  {
    Category: "🌍 Scenic + Luxury",
    'Search Query': "Lake-view hotels in Banff National Park",
    'Hotel Name': "Charltons Banff",
    City: "Banff",
    Country: "ca",
    Price: "375.75",
    Currency: "USD",
    Stars: "3",
    'Main Photo': "https://static.cupid.travel/hotels/599033584.jpg",
    'Google Maps Link': "https://www.google.com/maps/search/?api=1&query=Charltons%20Banff%20Banff%20ca&hotel_dates=2025-09-07,2025-09-08&hotel_adults=2"
  },
  
];

// Function to convert raw data to BeautifulHotel format
const convertToBeautifulHotel = (rawHotel: RawHotelData, index: number): BeautifulHotel => {
  const countryCode = rawHotel.Country?.toLowerCase() || '';
  const location = `${rawHotel.City}, ${rawHotel.Country?.toUpperCase()}`;
  
  return {
    id: `hotel-${index}-${rawHotel['Hotel Name'].replace(/\s+/g, '-').toLowerCase()}`,
    name: rawHotel['Hotel Name'],
    image: rawHotel['Main Photo'],
    images: [rawHotel['Main Photo']],
    price: parseFloat(rawHotel.Price) || 0,
    rating: parseFloat(rawHotel.Stars) || 4.0,
    location,
    theme: rawHotel.Category,
    city: rawHotel.City,
    country: countryCode,
    features: [],
    topAmenities: [],
    description: `Beautiful ${rawHotel.Stars}-star hotel in ${rawHotel.City}`,
    fullDescription: `Experience luxury and comfort at ${rawHotel['Hotel Name']} in ${rawHotel.City}. This ${rawHotel.Stars}-star property offers exceptional amenities and service.`,
  };
};

// Interface for search query with hotels
export interface SearchQueryWithHotels {
  searchQuery: string;
  hotels: BeautifulHotel[];
}

// Process raw data into search queries with hotels (minimum 5 hotels per query)
const processSearchQueryData = (): SearchQueryWithHotels[] => {
  const searchQueryMap = new Map<string, BeautifulHotel[]>();
  
  // Group hotels by search query
  rawHotelData.forEach((rawHotel, index) => {
    const query = rawHotel['Search Query'];
    const hotel = convertToBeautifulHotel(rawHotel, index);
    
    if (!searchQueryMap.has(query)) {
      searchQueryMap.set(query, []);
    }
    searchQueryMap.get(query)!.push(hotel);
  });
  
  // Filter to only include queries with 5 or more hotels, then convert to array format
  return Array.from(searchQueryMap.entries())
    .filter(([query, hotels]) => hotels.length >= 5)
    .map(([query, hotels]) => ({
      searchQuery: query,
      hotels: hotels.slice(0, 6) // Limit to 6 hotels per query for display
    }));
};

// Get all available search queries with hotels (only those with 5+ hotels)
export const getAllSearchQueries = (): SearchQueryWithHotels[] => {
  return processSearchQueryData();
};

// Get random search queries for the initial screen
export const getRandomSearchQueries = (count: number = 4): SearchQueryWithHotels[] => {
  const allQueries = getAllSearchQueries();
  const shuffled = [...allQueries].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Get hotels for a specific search query
export const getHotelsForQuery = (searchQuery: string): BeautifulHotel[] => {
  const allQueries = getAllSearchQueries();
  const foundQuery = allQueries.find(q => q.searchQuery === searchQuery);
  return foundQuery ? foundQuery.hotels : [];
};