// utils/carouselData.ts

export interface CarouselHotel {
  searchQuery: string;
  hotelId: string;
  name: string;
  image: string;
  price: number;
  priceDisplay: string;
  rating: number;
  location: string;
  city: string;
  country: string;
  fullAddress: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export const carouselData: CarouselHotel[] = [
  

  {
    searchQuery: "Hotels in Los Angeles with rooftop pools",
    hotelId: "lp2fed9",
    name: "Loews Hollywood Hotel",
    image: "https://static.cupid.travel/hotels/433893685.jpg",
    price: 259,
    priceDisplay: "$259/night",
    rating: 8.8,
    location: "1755 North Highland Avenue",
    city: "Los Angeles",
    country: "us",
    fullAddress: "1755 North Highland Avenue",
    coordinates: { latitude: 34.103301, longitude: -118.338836 }
  },
  {
    searchQuery: "Hotels in Los Angeles with rooftop pools",
    hotelId: "lp1db2ba",
    name: "The Godfrey Hotel Hollywood",
    image: "https://static.cupid.travel/hotels/496968162.jpg",
    price: 230,
    priceDisplay: "$230/night",
    rating: 7.9,
    location: "1400 Cahuenga Blvd",
    city: "Los Angeles",
    country: "us",
    fullAddress: "1400 Cahuenga Blvd",
    coordinates: { latitude: 34.096443, longitude: -118.329141 }
  },
  {
    searchQuery: "Hotels in Los Angeles with rooftop pools",
    hotelId: "lp913cb",
    name: "Dream Hollywood, by Hyatt",
    image: "https://static.cupid.travel/hotels/568783347.jpg",
    price: 232,
    priceDisplay: "$232/night",
    rating: 9,
    location: "6417 Selma Avenue",
    city: "Los Angeles",
    country: "us",
    fullAddress: "6417 Selma Avenue",
    coordinates: { latitude: 34.099919, longitude: -118.330173 }
  },
  {
    searchQuery: "Hotels in Los Angeles with rooftop pools",
    hotelId: "lp19e30",
    name: "Andaz West Hollywood, By Hyatt",
    image: "https://static.cupid.travel/hotels/149158363.jpg",
    price: 380,
    priceDisplay: "$380/night",
    rating: 8.8,
    location: "8401 W Sunset Blvd",
    city: "Los Angeles",
    country: "us",
    fullAddress: "8401 W Sunset Blvd",
    coordinates: { latitude: 34.09531, longitude: -118.372941 }
  },
  {
    searchQuery: "Hotels in Los Angeles with rooftop pools",
    hotelId: "lp1ad99",
    name: "Montrose at Beverly Hills",
    image: "https://static.cupid.travel/hotels/298872585.jpg",
    price: 399,
    priceDisplay: "$399/night",
    rating: 9.4,
    location: "900 Hammond St",
    city: "Los Angeles",
    country: "us",
    fullAddress: "900 Hammond St",
    coordinates: { latitude: 34.087833, longitude: -118.387556 }
  },

  {
    searchQuery: "Hotels with over the water bungalows in Bora Bora",
    hotelId: "lp4080b",
    name: "Four Seasons Resort Bora Bora",
    image: "https://static.cupid.travel/hotels/51610543.jpg",
    price: 2096,
    priceDisplay: "$2096/night",
    rating: 9.6,
    location: "Motu Tehotu",
    city: "Bora Bora",
    country: "pf",
    fullAddress: "Motu Tehotu",
    coordinates: { latitude: -16.472003, longitude: -151.707298 }
  },
  {
    searchQuery: "Hotels with over the water bungalows in Bora Bora",
    hotelId: "lp3a7b5",
    name: "The St. Regis Bora Bora Resort",
    image: "https://static.cupid.travel/hotels/370077361.jpg",
    price: 2302,
    priceDisplay: "$2302/night",
    rating: 9.6,
    location: "Motu Ome'e BP 506",
    city: "Bora Bora",
    country: "pf",
    fullAddress: "Motu Ome'e BP 506",
    coordinates: { latitude: -16.48644, longitude: -151.69821 }
  },
  {
    searchQuery: "Hotels with over the water bungalows in Bora Bora",
    hotelId: "lp410e2",
    name: "InterContinental Bora Bora & Thalasso Spa by IHG",
    image: "https://static.cupid.travel/hotels/508602240.jpg",
    price: 1240,
    priceDisplay: "$1240/night",
    rating: 9.4,
    location: "Motu Piti Aau",
    city: "Bora Bora",
    country: "pf",
    fullAddress: "Motu Piti Aau",
    coordinates: { latitude: -16.503105, longitude: -151.702808 }
  },
  {
    searchQuery: "Hotels with over the water bungalows in Bora Bora",
    hotelId: "lp21e08",
    name: "Westin Bora Bora Resort & Spa",
    image: "https://static.cupid.travel/hotels/596019029.jpg",
    price: 1152,
    priceDisplay: "$1152/night",
    rating: 9.5,
    location: "Motu Tape, BP 190",
    city: "Bora Bora",
    country: "pf",
    fullAddress: "Motu Tape, BP 190",
    coordinates: { latitude: -16.497144, longitude: -151.701828 }
  },
  {
    searchQuery: "Hotels with over the water bungalows in Bora Bora",
    hotelId: "lp2f3a2",
    name: "Le Bora Bora by Pearl Resorts",
    image: "https://static.cupid.travel/hotels/ex_ccef1a9f_z.jpg",
    price: 930,
    priceDisplay: "$930/night",
    rating: 9.4,
    location: "Motu Tevairoa",
    city: "Bora Bora",
    country: "PF",
    fullAddress: "Motu Tevairoa",
    coordinates: { latitude: -16.475875, longitude: -151.772637 }
  },

  {
    searchQuery: "Cliffside hotels in Santorini with infinity pools and sunset views",
    hotelId: "lp655a7aad",
    name: "Nefeles Luxury Suites",
    image: "https://static.cupid.travel/hotels/407906965.jpg",
    price: 296,
    priceDisplay: "$296/night",
    rating: 9.4,
    location: "Main Street",
    city: "Fira",
    country: "gr",
    fullAddress: "Main Street",
    coordinates: { latitude: 36.41931, longitude: 25.430802 }
  },
  {
    searchQuery: "Cliffside hotels in Santorini with infinity pools and sunset views",
    hotelId: "lpaa68c",
    name: "Keti Hotel",
    image: "https://static.cupid.travel/hotels/ex_ce5ad331_z.jpg",
    price: 306,
    priceDisplay: "$306/night",
    rating: 9.6,
    location: "Fira",
    city: "Santorini",
    country: "GR",
    fullAddress: "Fira",
    coordinates: { latitude: 36.416115, longitude: 25.430498 }
  },
  {
    searchQuery: "Cliffside hotels in Santorini with infinity pools and sunset views",
    hotelId: "lp655a63df",
    name: "Hotel Thireas",
    image: "https://static.cupid.travel/hotels/212083140.jpg",
    price: 205,
    priceDisplay: "$205/night",
    rating: 9.1,
    location: "Main Street",
    city: "Fira",
    country: "gr",
    fullAddress: "Main Street",
    coordinates: { latitude: 36.416338, longitude: 25.431062 }
  },
  {
    searchQuery: "Cliffside hotels in Santorini with infinity pools and sunset views",
    hotelId: "lpa85d2",
    name: "On the Cliff",
    image: "https://static.cupid.travel/hotels/ex_8f3f1792_z.jpg",
    price: 160,
    priceDisplay: "$160/night",
    rating: 8.4,
    location: "Fira",
    city: "Santorini",
    country: "GR",
    fullAddress: "Fira",
    coordinates: { latitude: 36.41912, longitude: 25.43129 }
  },
  {
    searchQuery: "Cliffside hotels in Santorini with infinity pools and sunset views",
    hotelId: "lp6557c359",
    name: "Aelia Luxury Suites",
    image: "https://static.cupid.travel/hotels/ex_f1b237d6_z.jpg",
    price: 172,
    priceDisplay: "$172/night",
    rating: 9.1,
    location: "Karterados",
    city: "Santorini",
    country: "GR",
    fullAddress: "Karterados",
    coordinates: { latitude: 36.411563, longitude: 25.446464 }
  },

  {
    searchQuery: "Luxury jungle resorts in Bali with private pools",
    hotelId: "lp39354",
    name: "Hanging Gardens of Bali",
    image: "https://static.cupid.travel/hotels/54784731.jpg",
    price: 1332,
    priceDisplay: "$1332/night",
    rating: 9.4,
    location: "Desa Buahan",
    city: "Payangan",
    country: "id",
    fullAddress: "Desa Buahan",
    coordinates: { latitude: -8.412748, longitude: 115.238809 }
  },
  {
    searchQuery: "Luxury jungle resorts in Bali with private pools",
    hotelId: "lpf86ce",
    name: "The Kayon Jungle Resort",
    image: "https://static.cupid.travel/hotels/163226397.jpg",
    price: 360,
    priceDisplay: "$360/night",
    rating: 10,
    location: "Br. Bresela, Payangan",
    city: "Ubud",
    country: "id",
    fullAddress: "Br. Bresela, Payangan",
    coordinates: { latitude: -8.422409, longitude: 115.275018 }
  },
  {
    searchQuery: "Luxury jungle resorts in Bali with private pools",
    hotelId: "lp655b51d7",
    name: "Jungle Retreat by Kupu Kupu Barong",
    image: "https://static.cupid.travel/hotels/115884116.jpg",
    price: 140,
    priceDisplay: "$140/night",
    rating: 8.5,
    location: "Kedewatan",
    city: "Ubud",
    country: "id",
    fullAddress: "Kedewatan",
    coordinates: { latitude: -8.481644, longitude: 115.246727 }
  },
  {
    searchQuery: "Luxury jungle resorts in Bali with private pools",
    hotelId: "lp3a7f0",
    name: "Nandini Jungle by Hanging Gardens",
    image: "https://static.cupid.travel/hotels/537333871.jpg",
    price: 145,
    priceDisplay: "$145/night",
    rating: 9.2,
    location: "Br. Susut, Desa Buahan",
    city: "Payangan",
    country: "id",
    fullAddress: "Br. Susut, Desa Buahan",
    coordinates: { latitude: -8.415006, longitude: 115.236148 }
  },
  {
    searchQuery: "Luxury jungle resorts in Bali with private pools",
    hotelId: "lp657654e4",
    name: "The Payogan Villa Resort and Spa",
    image: "https://static.cupid.travel/hotels/179602206.jpg",
    price: 129,
    priceDisplay: "$129/night",
    rating: 8.1,
    location: "Banjar Bunutan, Desa Kedewatan",
    city: "Ubud",
    country: "id",
    fullAddress: "Banjar Bunutan, Desa Kedewatan",
    coordinates: { latitude: -8.475163, longitude: 115.251474 }
  }
];

// ----------------------
// Helpers (unchanged)
// ----------------------

export const getHotelsByQuery = () => {
  const grouped: { [key: string]: CarouselHotel[] } = {};
  
  carouselData.forEach(hotel => {
    if (!grouped[hotel.searchQuery]) {
      grouped[hotel.searchQuery] = [];
    }
    grouped[hotel.searchQuery].push(hotel);
  });

  return grouped;
};

export const getAllSearchQueries = () => {
  return [...new Set(carouselData.map(hotel => hotel.searchQuery))];
};

export const getRandomCarousels = (count: number = 3) => {
  const grouped = getHotelsByQuery();
  const allQueries = getAllSearchQueries();
  
  const shuffledQueries = [...allQueries].sort(() => Math.random() - 0.5);
  
  return shuffledQueries.slice(0, count).map(query => ({
    searchQuery: query,
    hotels: grouped[query].map(h => ({
      id: h.hotelId,
      name: h.name,
      image: h.image,
      price: h.price,
      rating: h.rating,
      location: h.location,
      city: h.city,
      country: h.country,
      fullAddress: h.fullAddress
    }))
  }));
};

export const getCompleteCarousels = (maxCarousels: number = 3) => {
  return getRandomCarousels(Math.min(maxCarousels, 3));
};

export default carouselData;
