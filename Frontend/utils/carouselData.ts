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
    searchQuery: "Beachfront hotels in Maldives with infinity pools",
    hotelId: "lp9a44c",
    name: "Alaika Maafushi",
    image: "https://static.cupid.travel/hotels/ex_e608780f_z.jpg",
    price: 74,
    priceDisplay: "$74/night",
    rating: 8.995001832558458,
    location: "Falak/Noonu",
    city: "Maafushi",
    country: "MV",
    fullAddress: "Falak/Noonu",
    coordinates: { latitude: 3.938676, longitude: 73.489142 }
  },
  {
    searchQuery: "Beachfront hotels in Maldives with infinity pools",
    hotelId: "lp214770",
    name: "iCom Marina Sea View",
    image: "https://static.cupid.travel/hotels/ex_28c16e21_z.jpg",
    price: 298,
    priceDisplay: "$298/night",
    rating: 8.906120403363333,
    location: "Maafushi, Maldives",
    city: "Maafushi",
    country: "MV",
    fullAddress: "Maafushi, Maldives",
    coordinates: { latitude: 3.941251, longitude: 73.48962 }
  },
  {
    searchQuery: "Beachfront hotels in Maldives with infinity pools",
    hotelId: "lpa262c",
    name: "Kaani Grand Seaview",
    image: "https://static.cupid.travel/hotels/134061431.jpg",
    price: 148,
    priceDisplay: "$148/night",
    rating: 8.71571410544395,
    location: "Aabaadhee Hingun Road",
    city: "Maafushi",
    country: "mv",
    fullAddress: "Aabaadhee Hingun Road",
    coordinates: { latitude: 3.94513, longitude: 73.49113 }
  },
  {
    searchQuery: "Beachfront hotels in Maldives with infinity pools",
    hotelId: "lpb9407",
    name: "Seven Corals",
    image: "https://static.cupid.travel/hotels/ex_ffedcfe3_z.jpg",
    price: 107,
    priceDisplay: "$107/night",
    rating: 8.672224343730742,
    location: "Maafushi",
    city: "Maafushi",
    country: "MV",
    fullAddress: "Maafushi",
    coordinates: { latitude: 3.9409, longitude: 73.48954 }
  },
  {
    searchQuery: "Beachfront hotels in Maldives with infinity pools",
    hotelId: "lp89073",
    name: "Nala Island Village",
    image: "https://static.cupid.travel/hotels/ex_9700bb4a_z.jpg",
    price: 109,
    priceDisplay: "$109/night",
    rating: 8.319281581572461,
    location: "Handhuvaree Hingun",
    city: "Maafushi",
    country: "MV",
    fullAddress: "Handhuvaree Hingun",
    coordinates: { latitude: 3.94421, longitude: 73.49226 }
  },
  {
    searchQuery: "Modern beach hotels in Tulum with rooftop pools",
    hotelId: "lp52b8d",
    name: "Cabanas Tulum- Beach Hotel & Spa",
    image: "https://static.cupid.travel/hotels/611097131.jpg",
    price: 461,
    priceDisplay: "$461/night",
    rating: 9.3,
    location: "Carretera Cancun-Tulum Bocapalia Km 7",
    city: "Tulum",
    country: "mx",
    fullAddress: "Carretera Cancun-Tulum Bocapalia Km 7",
    coordinates: { latitude: 20.15629, longitude: -87.45612 }
  },
  {
    searchQuery: "Modern beach hotels in Tulum with rooftop pools",
    hotelId: "lp6d9db",
    name: "The Beach Tulum Hotel",
    image: "https://static.cupid.travel/hotels/500232930.jpg",
    price: 622,
    priceDisplay: "$622/night",
    rating: 9,
    location: "Road Tulum-Boca Paila km7",
    city: "Tulum",
    country: "mx",
    fullAddress: "Road Tulum-Boca Paila km7",
    coordinates: { latitude: 20.15648, longitude: -87.45563 }
  },
  {
    searchQuery: "Modern beach hotels in Tulum with rooftop pools",
    hotelId: "lp6a8a3",
    name: "Villas H2O",
    image: "https://static.cupid.travel/hotels/177337075.jpg",
    price: 97,
    priceDisplay: "$97/night",
    rating: 9,
    location: "Calle Chichen Itza, Mz 24, Lt 001",
    city: "Tulum",
    country: "mx",
    fullAddress: "Calle Chichen Itza, Mz 24, Lt 001",
    coordinates: { latitude: 20.20949, longitude: -87.47402 }
  },
  {
    searchQuery: "Modern beach hotels in Tulum with rooftop pools",
    hotelId: "lp56d31",
    name: "Maison Tulum",
    image: "https://static.cupid.travel/hotels/341647360.jpg",
    price: 52,
    priceDisplay: "$52/night",
    rating: 9,
    location: "Calle Alfa Norte Esquina Con Sagitario",
    city: "Tulum",
    country: "mx",
    fullAddress: "Calle Alfa Norte Esquina Con Sagitario",
    coordinates: { latitude: 20.21232, longitude: -87.46414 }
  },
  {
    searchQuery: "Modern beach hotels in Tulum with rooftop pools",
    hotelId: "lp5337c",
    name: "Be Tulum Beach & Spa Resort",
    image: "https://static.cupid.travel/hotels/518699559.jpg",
    price: 441,
    priceDisplay: "$441/night",
    rating: 8.610856989950005,
    location: "Carretera Tulum-Boca Paila Km.10",
    city: "Tulum",
    country: "mx",
    fullAddress: "Carretera Tulum-Boca Paila Km.10",
    coordinates: { latitude: 20.1367, longitude: -87.46364 }
  },
  {
    searchQuery: "Mountain view hotels in Swiss Alps with glass facades",
    hotelId: "lp54c63",
    name: "Tradition Julen Hotel",
    image: "https://static.cupid.travel/hotels/303273882.jpg",
    price: 513,
    priceDisplay: "$513/night",
    rating: 9.3,
    location: "Riedstrasse 2",
    city: "Zermatt",
    country: "ch",
    fullAddress: "Riedstrasse 2",
    coordinates: { latitude: 46.01848, longitude: 7.74878 }
  },
  {
    searchQuery: "Mountain view hotels in Swiss Alps with glass facades",
    hotelId: "lp5f94c",
    name: "Alpine Lodge",
    image: "https://static.cupid.travel/hotels/63917895.jpg",
    price: 312,
    priceDisplay: "$312/night",
    rating: 9.3,
    location: "Bahnhofstrasse 14",
    city: "Zermatt",
    country: "ch",
    fullAddress: "Bahnhofstrasse 14",
    coordinates: { latitude: 46.02286, longitude: 7.74744 }
  },
  {
    searchQuery: "Mountain view hotels in Swiss Alps with glass facades",
    hotelId: "lp46918",
    name: "Wellness Hotel Alpenhof",
    image: "https://static.cupid.travel/hotels/406366813.jpg",
    price: 518,
    priceDisplay: "$518/night",
    rating: 9.1,
    location: "Matterstrasse 43",
    city: "Zermatt",
    country: "ch",
    fullAddress: "Matterstrasse 43",
    coordinates: { latitude: 46.02339, longitude: 7.75134 }
  },
  {
    searchQuery: "Mountain view hotels in Swiss Alps with glass facades",
    hotelId: "lp5e636",
    name: "Backstage Boutique SPA Hotel",
    image: "https://static.cupid.travel/hotels/25392759.jpg",
    price: 432,
    priceDisplay: "$432/night",
    rating: 9,
    location: "Hofmattstrasse 4",
    city: "Zermatt",
    country: "ch",
    fullAddress: "Hofmattstrasse 4",
    coordinates: { latitude: 46.022, longitude: 7.74785 }
  },
  {
    searchQuery: "Mountain view hotels in Swiss Alps with glass facades",
    hotelId: "lp342bb",
    name: "Hotel Pollux",
    image: "https://static.cupid.travel/hotels/604065236.jpg",
    price: 383,
    priceDisplay: "$383/night",
    rating: 8.9,
    location: "Bahnhofstrasse 28",
    city: "Zermatt",
    country: "ch",
    fullAddress: "Bahnhofstrasse 28",
    coordinates: { latitude: 46.02208, longitude: 7.74714 }
  },
  {
    searchQuery: "Ski hotels in Aspen with panoramic windows",
    hotelId: "lp41e31",
    name: "Limelight Hotel Aspen",
    image: "https://static.cupid.travel/hotels/25119362.jpg",
    price: 377,
    priceDisplay: "$377/night",
    rating: 9.2,
    location: "355 S. Monarch St",
    city: "Aspen",
    country: "us",
    fullAddress: "355 S. Monarch St",
    coordinates: { latitude: 39.18925, longitude: -106.8213 }
  },
  {
    searchQuery: "Ski hotels in Aspen with panoramic windows",
    hotelId: "lp2a9a8",
    name: "Hotel Jerome, An Auberge Resort",
    image: "https://static.cupid.travel/hotels/571160698.jpg",
    price: 810,
    priceDisplay: "$810/night",
    rating: 8.745368084396574,
    location: "330 E Main Street",
    city: "Aspen",
    country: "us",
    fullAddress: "330 E Main Street",
    coordinates: { latitude: 39.19082, longitude: -106.81951 }
  },
  {
    searchQuery: "Ski hotels in Aspen with panoramic windows",
    hotelId: "lp38374",
    name: "Chateau Chaumont & Dumont Condominiums by Frias",
    image: "https://static.cupid.travel/hotels/ex_294ddfe7_z.jpg",
    price: 673,
    priceDisplay: "$673/night",
    rating: 8.68668262834257,
    location: "730 E Durant Ave",
    city: "Aspen",
    country: "US",
    fullAddress: "730 E Durant Ave",
    coordinates: { latitude: 39.186811, longitude: -106.815809 }
  },
  {
    searchQuery: "Ski hotels in Aspen with panoramic windows",
    hotelId: "lp22768",
    name: "St. Regis Aspen Resort",
    image: "https://static.cupid.travel/hotels/448684704.jpg",
    price: 1046,
    priceDisplay: "$1046/night",
    rating: 8.66574562801799,
    location: "315 East Dean St.",
    city: "Aspen",
    country: "us",
    fullAddress: "315 East Dean St.",
    coordinates: { latitude: 39.18659, longitude: -106.82123 }
  },
  {
    searchQuery: "Ski hotels in Aspen with panoramic windows",
    hotelId: "lp86db0",
    name: "Shadow Mountain Lodge",
    image: "https://static.cupid.travel/hotels/37270292.jpg",
    price: 268,
    priceDisplay: "$268/night",
    rating: 8.3,
    location: "232 W. Hyman Ave",
    city: "Aspen",
    country: "us",
    fullAddress: "232 W. Hyman Ave",
    coordinates: { latitude: 39.19042, longitude: -106.82551 }
  },
  {
    searchQuery: "Boutique mountain hotels in Banff with lake views",
    hotelId: "lp36f63",
    name: "Banff Rocky Mountain Resort",
    image: "https://static.cupid.travel/hotels/165503738.jpg",
    price: 103,
    priceDisplay: "$103/night",
    rating: 8.998458115171426,
    location: "1029 Banff Ave",
    city: "Banff",
    country: "ca",
    fullAddress: "1029 Banff Ave",
    coordinates: { latitude: 51.19999, longitude: -115.5361 }
  },
  {
    searchQuery: "Boutique mountain hotels in Banff with lake views",
    hotelId: "lp3b340",
    name: "Moxy Banff",
    image: "https://static.cupid.travel/hotels/560792470.jpg",
    price: 171,
    priceDisplay: "$171/night",
    rating: 8.977957119287328,
    location: "555 Banff Ave",
    city: "Banff",
    country: "ca",
    fullAddress: "555 Banff Ave",
    coordinates: { latitude: 51.18549, longitude: -115.55714 }
  },
  {
    searchQuery: "Boutique mountain hotels in Banff with lake views",
    hotelId: "lp31b76",
    name: "Brewster Mountain Lodge",
    image: "https://static.cupid.travel/hotels/30627714.jpg",
    price: 128,
    priceDisplay: "$128/night",
    rating: 8.972067555938676,
    location: "208 Caribou Street",
    city: "Banff",
    country: "ca",
    fullAddress: "208 Caribou Street",
    coordinates: { latitude: 51.17674, longitude: -115.57216 }
  },
  {
    searchQuery: "Boutique mountain hotels in Banff with lake views",
    hotelId: "lp31917",
    name: "High Country Inn",
    image: "https://static.cupid.travel/hotels/ex_0e643aa9_z.jpg",
    price: 188,
    priceDisplay: "$188/night",
    rating: 8.970465429922163,
    location: "419 Banff Ave",
    city: "Banff",
    country: "CA",
    fullAddress: "419 Banff Ave",
    coordinates: { latitude: 51.18183, longitude: -115.567579 }
  },
  {
    searchQuery: "Boutique mountain hotels in Banff with lake views",
    hotelId: "lp2229b",
    name: "Banff Caribou Lodge and Spa",
    image: "https://static.cupid.travel/hotels/197393610.jpg",
    price: 103,
    priceDisplay: "$103/night",
    rating: 8.810218580814128,
    location: "521 Banff Ave",
    city: "Banff",
    country: "ca",
    fullAddress: "521 Banff Ave",
    coordinates: { latitude: 51.18418, longitude: -115.56046 }
  },
  {
    searchQuery: "Rooftop pool hotels in Singapore with city skylines",
    hotelId: "lp1be26",
    name: "Village Hotel Changi by Far East Hospitality",
    image: "https://static.cupid.travel/hotels/284732036.jpg",
    price: 136,
    priceDisplay: "$136/night",
    rating: 8.868803954086252,
    location: "1 Netheravon Road",
    city: "Singapore",
    country: "sg",
    fullAddress: "1 Netheravon Road",
    coordinates: { latitude: 1.39056, longitude: 103.98615 }
  },
  {
    searchQuery: "Rooftop pool hotels in Singapore with city skylines",
    hotelId: "lp20606",
    name: "Copthorne King's Hotel Singapore on Havelock",
    image: "https://static.cupid.travel/hotels/147514431.jpg",
    price: 123,
    priceDisplay: "$123/night",
    rating: 8.82803211735595,
    location: "403 Havelock Road",
    city: "Singapore",
    country: "sg",
    fullAddress: "403 Havelock Road",
    coordinates: { latitude: 1.28825, longitude: 103.83677 }
  },
  {
    searchQuery: "Rooftop pool hotels in Singapore with city skylines",
    hotelId: "lp235eb",
    name: "PARKROYAL COLLECTION Marina Bay, Singapore",
    image: "https://static.cupid.travel/hotels/252066931.jpg",
    price: 332,
    priceDisplay: "$332/night",
    rating: 8.774635545110174,
    location: "6 Raffles Boulevard Marina Square",
    city: "Singapore",
    country: "sg",
    fullAddress: "6 Raffles Boulevard Marina Square",
    coordinates: { latitude: 1.29147, longitude: 103.85739 }
  },
  {
    searchQuery: "Rooftop pool hotels in Singapore with city skylines",
    hotelId: "lp19c06",
    name: "Shangri-La Singapore",
    image: "https://static.cupid.travel/hotels/176487374.jpg",
    price: 308,
    priceDisplay: "$308/night",
    rating: 8.767288898877045,
    location: "22 Orange Grove Road",
    city: "Singapore",
    country: "sg",
    fullAddress: "22 Orange Grove Road",
    coordinates: { latitude: 1.31124, longitude: 103.82652 }
  },
  {
    searchQuery: "Rooftop pool hotels in Singapore with city skylines",
    hotelId: "lp1c24d",
    name: "Amara Singapore - Newly Renovated",
    image: "https://static.cupid.travel/hotels/562283193.jpg",
    price: 270,
    priceDisplay: "$270/night",
    rating: 8.557541406615428,
    location: "165 Tanjong Pagar Road",
    city: "Singapore",
    country: "sg",
    fullAddress: "165 Tanjong Pagar Road",
    coordinates: { latitude: 1.27511, longitude: 103.84353 }
  },
  {
    searchQuery: "Tower hotels in Tokyo with Mount Fuji views",
    hotelId: "lp1dd8c",
    name: "The Okura Tokyo",
    image: "https://static.cupid.travel/hotels/345532366.jpg",
    price: 883,
    priceDisplay: "$883/night",
    rating: 9.5,
    location: "2-10-4 Toranomon, Minato-ku",
    city: "Tokyo",
    country: "jp",
    fullAddress: "2-10-4 Toranomon, Minato-ku",
    coordinates: { latitude: 35.66716, longitude: 139.74414 }
  },
  {
    searchQuery: "Tower hotels in Tokyo with Mount Fuji views",
    hotelId: "lp2f87d",
    name: "Cerulean Tower Tokyu Hotel",
    image: "https://static.cupid.travel/hotels/ex_0c7be535_z.jpg",
    price: 477,
    priceDisplay: "$477/night",
    rating: 8.963481759662278,
    location: "26-1 Sakuragaoka-cho, Shibuya-ku",
    city: "Tokyo",
    country: "JP",
    fullAddress: "26-1 Sakuragaoka-cho, Shibuya-ku",
    coordinates: { latitude: 35.65656, longitude: 139.699463 }
  },
  {
    searchQuery: "Tower hotels in Tokyo with Mount Fuji views",
    hotelId: "lp1cb6a",
    name: "Shinagawa Prince Hotel",
    image: "https://static.cupid.travel/hotels/510892103.jpg",
    price: 196,
    priceDisplay: "$196/night",
    rating: 8.734070485695874,
    location: "4-10-30 Takanawa Minato-ku",
    city: "Tokyo",
    country: "jp",
    fullAddress: "4-10-30 Takanawa Minato-ku",
    coordinates: { latitude: 35.62796, longitude: 139.73639 }
  },
  {
    searchQuery: "Tower hotels in Tokyo with Mount Fuji views",
    hotelId: "lp1b8d5",
    name: "Hotel New Otani Tokyo The Main",
    image: "https://static.cupid.travel/hotels/452607638.jpg",
    price: 378,
    priceDisplay: "$378/night",
    rating: 8.732088976898359,
    location: "4-1 Kioi-cho Chiyoda-ku",
    city: "Tokyo",
    country: "jp",
    fullAddress: "4-1 Kioi-cho Chiyoda-ku",
    coordinates: { latitude: 35.6809, longitude: 139.73357 }
  },
  {
    searchQuery: "Tower hotels in Tokyo with Mount Fuji views",
    hotelId: "lp1d4b3",
    name: "InterContinental Tokyo Bay, an IHG Hotel",
    image: "https://static.cupid.travel/hotels/619238700.jpg",
    price: 298,
    priceDisplay: "$298/night",
    rating: 8.703509440890752,
    location: "1-16-2 Kaigan",
    city: "Tokyo",
    country: "jp",
    fullAddress: "1-16-2 Kaigan",
    coordinates: { latitude: 35.65304, longitude: 139.76199 }
  },
  {
    searchQuery: "Garden resort hotels in Ubud with rice terrace views",
    hotelId: "lp3c245",
    name: "Viceroy Bali",
    image: "https://static.cupid.travel/hotels/390328260.jpg",
    price: 652,
    priceDisplay: "$652/night",
    rating: 9.4,
    location: "Jalan Lanyahan, Banjar Nagi",
    city: "Ubud",
    country: "id",
    fullAddress: "Jalan Lanyahan, Banjar Nagi",
    coordinates: { latitude: -8.49396, longitude: 115.27769 }
  },
  {
    searchQuery: "Garden resort hotels in Ubud with rice terrace views",
    hotelId: "lp58bc5",
    name: "Chapung Sebali",
    image: "https://static.cupid.travel/hotels/215388709.jpg",
    price: 223,
    priceDisplay: "$223/night",
    rating: 9.4,
    location: "Jl. Raya Sebali No. 5 Keliki",
    city: "Ubud",
    country: "id",
    fullAddress: "Jl. Raya Sebali No. 5 Keliki",
    coordinates: { latitude: -8.47965, longitude: 115.26014 }
  },
  {
    searchQuery: "Garden resort hotels in Ubud with rice terrace views",
    hotelId: "lp3b3a8",
    name: "COMO Uma Ubud",
    image: "https://static.cupid.travel/hotels/530242148.jpg",
    price: 300,
    priceDisplay: "$300/night",
    rating: 9.2,
    location: "Jalan Raya Sanggingan,Banjar Lungsiakan",
    city: "Ubud",
    country: "id",
    fullAddress: "Jalan Raya Sanggingan,Banjar Lungsiakan",
    coordinates: { latitude: -8.49189, longitude: 115.2538 }
  },
  {
    searchQuery: "Garden resort hotels in Ubud with rice terrace views",
    hotelId: "lp55a98",
    name: "Nick's Hidden Cottages",
    image: "https://static.cupid.travel/hotels/ex_6f145248_z.jpg",
    price: 36,
    priceDisplay: "$36/night",
    rating: 8.938297826123273,
    location: "Jl. Bisma",
    city: "Ubud",
    country: "ID",
    fullAddress: "Jl. Bisma",
    coordinates: { latitude: -8.511146, longitude: 115.258281 }
  },
  {
    searchQuery: "Garden resort hotels in Ubud with rice terrace views",
    hotelId: "lp37c33",
    name: "The Royal Pita Maha",
    image: "https://static.cupid.travel/hotels/25870946.jpg",
    price: 324,
    priceDisplay: "$324/night",
    rating: 8.7,
    location: "Desa Kedewatan",
    city: "Ubud",
    country: "id",
    fullAddress: "Desa Kedewatan",
    coordinates: { latitude: -8.47496, longitude: 115.24467 }
  }
];

// Group hotels by search query for easy access
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

// Get all unique search queries
export const getAllSearchQueries = () => {
  const queries = [...new Set(carouselData.map(hotel => hotel.searchQuery))];
  return queries;
};

// Get 3 random unique search queries with their hotels
export const getRandomCarousels = (count: number = 3) => {
  const grouped = getHotelsByQuery();
  const allQueries = getAllSearchQueries();
  
  // Shuffle the queries array to get random selection
  const shuffledQueries = [...allQueries].sort(() => Math.random() - 0.5);
  
  // Take the first 'count' queries and return with their hotels
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

// Legacy function for backward compatibility - now returns random 3 carousels
export const getCompleteCarousels = (maxCarousels: number = 3) => {
  return getRandomCarousels(Math.min(maxCarousels, 3));
};

export default carouselData;