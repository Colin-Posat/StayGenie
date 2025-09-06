const fs = require('fs');
const https = require('https');

const API_KEY = 'PUT KEY HERE';
const API_BASE = 'https://api.liteapi.travel/v3.0';

// Set default dates (check-in tomorrow, check-out day after)
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter = new Date();
dayAfter.setDate(dayAfter.getDate() + 2);

const checkinDate = tomorrow.toISOString().split('T')[0];
const checkoutDate = dayAfter.toISOString().split('T')[0];

const searchQueries = [
    // Scenic + Luxury
    { category: "🌍 Scenic + Luxury", query: "Ocean-view resorts in Santorini under $400", search: "ocean view resort Santorini", countryCode: "GR", cityName: "Santorini" },
    { category: "🌍 Scenic + Luxury", query: "Luxury safari lodges in Kenya with pools", search: "luxury safari lodge pool", countryCode: "KE" },
    { category: "🌍 Scenic + Luxury", query: "Boutique hotels in Kyoto with gardens", search: "boutique hotel garden Kyoto", countryCode: "JP", cityName: "Kyoto" },
    { category: "🌍 Scenic + Luxury", query: "Lake-view hotels in Banff National Park", search: "lake view hotel Banff", countryCode: "CA", cityName: "Banff" },
    { category: "🌍 Scenic + Luxury", query: "Stay with a balcony facing Machu Picchu", search: "hotel balcony Machu Picchu", countryCode: "PE" },
    { category: "🌍 Scenic + Luxury", query: "Cliffside Amalfi Coast resorts under $350", search: "cliffside resort Amalfi Coast", countryCode: "IT" },
    { category: "🌍 Scenic + Luxury", query: "Beach resorts in the Maldives with overwater views", search: "beach resort overwater", countryCode: "MV" },
    { category: "🌍 Scenic + Luxury", query: "Rooftop hotels in Barcelona near the Gothic Quarter", search: "rooftop hotel Gothic Quarter", countryCode: "ES", cityName: "Barcelona" },
    { category: "🌍 Scenic + Luxury", query: "Hotels in Paris with Eiffel Tower views", search: "hotel Eiffel Tower view", countryCode: "FR", cityName: "Paris" },
    { category: "🌍 Scenic + Luxury", query: "Lakefront resorts in Lake Como under $300", search: "lakefront resort Lake Como", countryCode: "IT" },
    
    // Affordable but Stunning
    { category: "🏝️ Affordable but Stunning", query: "Treehouse-style hotels in Bali under $100", search: "treehouse hotel Bali", countryCode: "ID" },
    { category: "🏝️ Affordable but Stunning", query: "Beachfront resorts in Phuket under $80", search: "beachfront resort Phuket", countryCode: "TH", cityName: "Phuket" },
    { category: "🏝️ Affordable but Stunning", query: "Riads in Marrakech with courtyards under $90", search: "riad courtyard Marrakech", countryCode: "MA", cityName: "Marrakech" },
    { category: "🏝️ Affordable but Stunning", query: "Hotels in Chiang Mai with mountain views under $70", search: "hotel mountain view Chiang Mai", countryCode: "TH", cityName: "Chiang Mai" },
    { category: "🏝️ Affordable but Stunning", query: "Jungle lodges in Costa Rica with rivers nearby", search: "jungle lodge river Costa Rica", countryCode: "CR" },
    
    // AI-Friendly "Wow" Combos
    { category: "✨ AI-Friendly Wow Combos", query: "Skyline-view hotels in Dubai with infinity pools", search: "skyline hotel infinity pool Dubai", countryCode: "AE", cityName: "Dubai" },
    { category: "✨ AI-Friendly Wow Combos", query: "Beach resorts in Hawaii under $300 with ocean views", search: "beach resort ocean view Hawaii", countryCode: "US" },
    { category: "✨ AI-Friendly Wow Combos", query: "All-inclusive resorts in Cancun under $250", search: "all inclusive resort Cancun", countryCode: "MX", cityName: "Cancun" },
    { category: "✨ AI-Friendly Wow Combos", query: "City-center hotels in Istanbul with Bosphorus views", search: "city center hotel Bosphorus view Istanbul", countryCode: "TR", cityName: "Istanbul" },
    { category: "✨ AI-Friendly Wow Combos", query: "Eco-lodges in Tulum near the beach under $150", search: "eco lodge beach Tulum", countryCode: "MX", cityName: "Tulum" }
];


// Helper function to generate Google Maps link
function generateGoogleMapsLink(hotel, checkin, checkout, adults = 2, children = 0) {
    const locationText = hotel.city && hotel.country 
        ? `${hotel.name} ${hotel.city} ${hotel.country}`
        : hotel.address 
        ? `${hotel.name} ${hotel.address}`
        : hotel.name;
    
    const query = encodeURIComponent(locationText);
    let url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    
    if (checkin && checkout) {
        const checkinStr = checkin.toISOString().split('T')[0];
        const checkoutStr = checkout.toISOString().split('T')[0];
        url += `&hotel_dates=${checkinStr},${checkoutStr}`;
        url += `&hotel_adults=${adults}`;
        if (children > 0) {
            url += `&hotel_children=${children}`;
        }
    }
    
    return url;
}

// Make HTTP request helper
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                }
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

async function searchHotels(searchQuery) {
    try {
        console.log(`🔍 Searching: ${searchQuery.query}`);
        
        // Try multiple search strategies
        const searchStrategies = [
            // Strategy 1: Full search with all parameters
            () => {
                const params = new URLSearchParams();
                params.append('limit', '50');
                
                if (searchQuery.countryCode) {
                    params.append('countryCode', searchQuery.countryCode);
                }
                if (searchQuery.cityName) {
                    params.append('cityName', searchQuery.cityName);
                }
                if (searchQuery.search) {
                    params.append('aiSearch', searchQuery.search);
                }
                return params;
            },
            
            // Strategy 2: Just country code + AI search (no city)
            () => {
                if (!searchQuery.countryCode) return null;
                const params = new URLSearchParams();
                params.append('limit', '50');
                params.append('countryCode', searchQuery.countryCode);
                if (searchQuery.search) {
                    params.append('aiSearch', searchQuery.search);
                }
                return params;
            },
            
            // Strategy 3: Just country code (broadest search)
            () => {
                if (!searchQuery.countryCode) return null;
                const params = new URLSearchParams();
                params.append('limit', '50');
                params.append('countryCode', searchQuery.countryCode);
                return params;
            },
            
            // Strategy 4: Just city name if available
            () => {
                if (!searchQuery.cityName) return null;
                const params = new URLSearchParams();
                params.append('limit', '50');
                params.append('cityName', searchQuery.cityName);
                return params;
            }
        ];

        let hotels = [];
        let strategyUsed = 0;
        
        // Try each strategy until we find hotels
        for (let i = 0; i < searchStrategies.length && hotels.length === 0; i++) {
            const params = searchStrategies[i]();
            if (!params) continue;
            
            strategyUsed = i + 1;
            console.log(`   🎯 Trying search strategy ${strategyUsed}...`);
            
            const hotelsUrl = `${API_BASE}/data/hotels?${params}`;
            const hotelsResponse = await makeRequest(hotelsUrl, {
                method: 'GET',
                headers: {
                    'X-API-Key': API_KEY,
                    'accept': 'application/json'
                }
            });

            if (hotelsResponse.statusCode === 200) {
                hotels = hotelsResponse.data.data || [];
                if (hotels.length > 0) {
                    console.log(`   📋 Strategy ${strategyUsed} found ${hotels.length} hotels, getting rates...`);
                    break;
                }
            } else {
                console.log(`   ⚠️  Strategy ${strategyUsed} API error: ${hotelsResponse.statusCode}`);
            }
        }
        
        if (hotels.length === 0) {
            console.log(`   ❌ No hotels found with any strategy for "${searchQuery.query}"`);
            return [];
        }

        // Get rates for these hotels (try multiple batches if needed)
        const hotelIds = hotels.slice(0, 30).map(h => h.id); // Try more hotels
        let hotelsWithRates = [];
        
        // Try different batch sizes to avoid timeouts
        const batchSizes = [10, 15, 20];
        
        for (const batchSize of batchSizes) {
            if (hotelsWithRates.length >= 6) break;
            
            for (let i = 0; i < hotelIds.length && hotelsWithRates.length < 6; i += batchSize) {
                const batch = hotelIds.slice(i, i + batchSize);
                
                const ratesPayload = {
                    hotelIds: batch,
                    occupancies: [{ adults: 2, children: [] }],
                    currency: 'USD',
                    guestNationality: 'US',
                    checkin: checkinDate,
                    checkout: checkoutDate,
                    timeout: 8,
                    maxRatesPerHotel: 1
                };

                try {
                    const ratesUrl = `${API_BASE}/hotels/rates`;
                    const ratesResponse = await makeRequest(ratesUrl, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': API_KEY,
                            'Content-Type': 'application/json',
                            'accept': 'application/json'
                        },
                        body: JSON.stringify(ratesPayload)
                    });

                    if (ratesResponse.statusCode === 200) {
                        const hotelRates = ratesResponse.data.data || [];
                        
                        // Combine hotel data with rates
                        for (const rateHotel of hotelRates) {
                            if (rateHotel.roomTypes && rateHotel.roomTypes.length > 0) {
                                const hotel = hotels.find(h => h.id === rateHotel.hotelId);
                                if (hotel && hotelsWithRates.length < 6) {
                                    const rate = rateHotel.roomTypes[0];
                                    const checkin = new Date(checkinDate);
                                    const checkout = new Date(checkoutDate);
                                    
                                    hotelsWithRates.push({
                                        category: searchQuery.category,
                                        query: searchQuery.query,
                                        hotelId: hotel.id,
                                        name: hotel.name,
                                        city: hotel.city,
                                        country: hotel.country,
                                        address: hotel.address,
                                        stars: hotel.stars,
                                        main_photo: hotel.main_photo || hotel.thumbnail,
                                        price: rate.offerRetailRate?.amount || 0,
                                        currency: rate.offerRetailRate?.currency || 'USD',
                                        googleMapsLink: generateGoogleMapsLink(hotel, checkin, checkout)
                                    });
                                }
                            }
                        }
                        
                        if (hotelsWithRates.length > 0) {
                            console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: Found ${hotelRates.length} rates, total collected: ${hotelsWithRates.length}`);
                            break; // Found some rates, stop trying smaller batches
                        }
                    } else {
                        console.log(`   ⚠️  Rates batch API error: ${ratesResponse.statusCode}, trying smaller batch...`);
                    }
                } catch (rateError) {
                    console.log(`   ⚠️  Rates batch error: ${rateError.message}, trying smaller batch...`);
                }
                
                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            if (hotelsWithRates.length > 0) break;
        }

        if (hotelsWithRates.length === 0) {
            console.log(`   ⚠️  Found ${hotels.length} hotels but no rates available`);
        } else {
            console.log(`   ✅ Successfully found ${hotelsWithRates.length} hotels with rates`);
        }
        
        return hotelsWithRates.slice(0, 6);
        
    } catch (error) {
        console.error(`   ❌ Error searching "${searchQuery.query}":`, error.message);
        return [];
    }
}

async function searchAllHotels() {
    console.log('🏨 Starting hotel search...');
    console.log(`📅 Check-in: ${checkinDate}, Check-out: ${checkoutDate}`);
    console.log(`🔎 Searching ${searchQueries.length} categories for hotels with rates...\n`);
    
    const allHotelsData = [];
    let completed = 0;
    
    for (const searchQuery of searchQueries) {
        const hotels = await searchAllHotels(searchQuery);
        allHotelsData.push(...hotels);
        
        completed++;
        console.log(`📊 Progress: ${completed}/${searchQueries.length} searches completed\n`);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return allHotelsData;
}

function generateCSV(hotelsData) {
    const headers = [
        'Category',
        'Search Query', 
        'Hotel Name',
        'City',
        'Country',
        'Price',
        'Currency',
        'Stars',
        'Main Photo',
        'Google Maps Link'
    ];
    
    const csvRows = [
        headers.join(','),
        ...hotelsData.map(hotel => [
            `"${hotel.category}"`,
            `"${hotel.query}"`,
            `"${hotel.name.replace(/"/g, '""')}"`, // Escape quotes
            `"${hotel.city || ''}"`,
            `"${hotel.country || ''}"`,
            hotel.price,
            hotel.currency,
            hotel.stars || '',
            `"${hotel.main_photo || ''}"`,
            `"${hotel.googleMapsLink}"`
        ].join(','))
    ];
    
    return csvRows.join('\n');
}

async function main() {
    try {
        const startTime = Date.now();
        
        // Search all hotels
        const allHotelsData = [];
        let completed = 0;
        
        for (const searchQuery of searchQueries) {
            const hotels = await searchHotels(searchQuery);
            allHotelsData.push(...hotels);
            
            completed++;
            console.log(`📊 Progress: ${completed}/${searchQueries.length} searches completed\n`);
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 SEARCH COMPLETE!');
        console.log('='.repeat(60));
        console.log(`⏱️  Total time: ${duration} seconds`);
        console.log(`🏨 Total hotels found: ${allHotelsData.length}`);
        
        if (allHotelsData.length > 0) {
            const avgPrice = (allHotelsData.reduce((sum, h) => sum + h.price, 0) / allHotelsData.length).toFixed(2);
            const categories = [...new Set(allHotelsData.map(h => h.category))];
            
            console.log(`💰 Average price: $${avgPrice} USD`);
            console.log(`📂 Categories covered: ${categories.length}`);
            
            // Generate and save CSV
            const csvContent = generateCSV(allHotelsData);
            const filename = `hotel_search_results_${checkinDate}_${checkoutDate}.csv`;
            
            fs.writeFileSync(filename, csvContent, 'utf8');
            
            console.log(`📄 CSV saved as: ${filename}`);
            console.log(`📁 File location: ${process.cwd()}/${filename}`);
            
            // Display sample data
            console.log('\n📋 Sample hotels found:');
            allHotelsData.slice(0, 5).forEach((hotel, i) => {
                console.log(`${i + 1}. ${hotel.name} (${hotel.city}, ${hotel.country}) - $${hotel.price} ${hotel.currency}`);
            });
            
        } else {
            console.log('❌ No hotels with rates were found.');
        }
        
        console.log('\n✨ Search completed successfully!');
        
    } catch (error) {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    }
}

// Run the extraction
if (require.main === module) {
    console.log('🚀 Hotel Search CSV Extractor Starting...\n');
    main();
}

module.exports = { searchHotels, generateCSV, generateGoogleMapsLink };