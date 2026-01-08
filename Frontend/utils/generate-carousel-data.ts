import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

// ✅ Fix for ESM (__dirname not defined)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/**
 * IMPORTANT:
 * This uses the SAME backend your app uses — NOT SSE.
 * Make sure your backend is running locally.
 */
const BASE_URL = "http://localhost:3003";

/**
 * Output file
 */
const OUTPUT_FILE = path.resolve(
  __dirname,
  "../utils/generatedCarouselData.json"
);

/**
 * Carousel queries (final)
 */
const CAROUSEL_QUERIES = [
  "Ski hotels in Aspen with panoramic windows",
  "Hotels in Los Angeles with rooftop pools",
  "Hotels with over the water bungalows in Bora Bora",
  "Cliffside hotels in Santorini with infinity pools and sunset views",
  "Luxury jungle resorts in Bali with private plunge pools"
];

/**
 * Expected backend response shape (partial)
 */
interface SearchResponse {
  hotels?: any[];
  recommendations?: any[];
}

/**
 * Call StayGenie backend (non-streaming)
 */
async function searchHotels(query: string): Promise<any[]> {
  console.log(`🔍 Searching: ${query}`);

  const res = await fetch(`${BASE_URL}/api/hotels/search-and-match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userInput: query,
      q: query,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Search failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as SearchResponse;

  return data.hotels || data.recommendations || [];
}

/**
 * Normalize hotel into CarouselHotel shape
 */
function normalizeHotel(hotel: any, searchQuery: string) {
  const price =
    hotel.pricePerNight?.amount ??
    hotel.price ??
    Math.round(150 + Math.random() * 300);

  const image =
    hotel.firstRoomImage ||
    hotel.secondRoomImage ||
    hotel.photoGalleryImages?.[0] ||
    hotel.images?.[0] ||
    "";

  return {
    searchQuery,
    hotelId: hotel.hotelId || hotel.id,
    name: hotel.name,
    image,
    price: Math.round(price),
    priceDisplay: `$${Math.round(price)}/night`,
    rating: hotel.starRating || hotel.rating || 4.5,
    location: hotel.address || hotel.summarizedInfo?.location || "",
    city: hotel.city || hotel.summarizedInfo?.city || "",
    country: hotel.country || hotel.summarizedInfo?.country || "",
    fullAddress:
      hotel.fullAddress ||
      hotel.address ||
      hotel.summarizedInfo?.location ||
      "",
    coordinates: {
      latitude: hotel.latitude ?? hotel.coordinates?.latitude ?? 0,
      longitude: hotel.longitude ?? hotel.coordinates?.longitude ?? 0,
    },
  };
}

/**
 * Main generator
 */
async function run() {
  const allHotels: any[] = [];

  for (const query of CAROUSEL_QUERIES) {
    const hotels = await searchHotels(query);

    if (!hotels.length) {
      console.warn(`⚠️ No hotels returned for "${query}"`);
      continue;
    }

    // Take top 5 per query
    const selected = hotels.slice(0, 5);

    for (const hotel of selected) {
      allHotels.push(normalizeHotel(hotel, query));
    }

    console.log(`✅ Collected ${selected.length} hotels for "${query}"`);
  }

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(allHotels, null, 2),
    "utf-8"
  );

  console.log(`\n🎉 Done! Generated ${allHotels.length} hotels.`);
  console.log(`📄 Output file: ${OUTPUT_FILE}`);
}

run().catch(err => {
  console.error("💥 Generator failed:", err);
  process.exit(1);
});
