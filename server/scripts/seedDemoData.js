const dotenv = require('dotenv');
const dns = require('node:dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Itinerary = require('../models/Itinerary');
const RoleRequest = require('../models/RoleRequest');

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

const DEMO_PASSWORD = 'TravelDemo123!';

const demoUsers = [
  { name: 'Aarav Mehta', email: 'aarav.demo@travel.com', role: 'user' },
  { name: 'Maya Kapoor', email: 'maya.demo@travel.com', role: 'user' },
  { name: 'Noah Williams', email: 'noah.demo@travel.com', role: 'user' },
  { name: 'Sofia Chen', email: 'sofia.demo@travel.com', role: 'user' },
  { name: 'Kabir Sharma', email: 'kabir.demo@travel.com', role: 'user' },
  { name: 'Demo Portfolio Admin', email: 'portfolio.admin@travel.com', role: 'admin' },
];

const activity = (time, name, description, location) => ({
  time,
  activity: name,
  description,
  location,
});

const day = (number, title, activities) => ({ day: number, title, activities });

const demoTrips = [
  {
    title: 'Kyoto Lanterns & Quiet Temples',
    destination: 'Kyoto, Japan',
    startDate: '2026-09-08',
    endDate: '2026-09-14',
    duration: '7 Days / 6 Nights',
    budget: 3400,
    travelerCount: 2,
    category: 'cultural',
    travelStyle: 'premium',
    transportMode: 'public_transport',
    accommodationType: 'hotel',
    budgetBreakdown: { transport: 520, accommodation: 1280, food: 670, activities: 580, contingency: 350 },
    description: 'A slow, design-led Kyoto journey balancing dawn temple visits, neighborhood food walks, craft traditions, and generous unscheduled evenings.',
    dailyPlan: [
      day(1, 'Arrival and Gion at dusk', [
        activity('2:00 PM', 'Machiya check-in', 'Settle into a restored townhouse near Gion.', 'Higashiyama'),
        activity('5:30 PM', 'Gion orientation walk', 'Explore Shirakawa Lane before dinner.', 'Gion'),
      ]),
      day(2, 'Eastern Kyoto temples', [
        activity('7:00 AM', 'Kiyomizu-dera at opening', 'Visit before the main crowds arrive.', 'Kiyomizu'),
        activity('11:30 AM', 'Nishiki Market tasting', 'Seasonal snacks and a casual lunch.', 'Downtown Kyoto'),
      ]),
      day(3, 'Arashiyama beyond the bamboo', [
        activity('7:30 AM', 'Bamboo grove and Tenryu-ji', 'Early garden visit followed by riverside coffee.', 'Arashiyama'),
        activity('2:00 PM', 'Okochi Sanso garden', 'A quieter landscape garden with mountain views.', 'Arashiyama'),
      ]),
      day(4, 'Tea and traditional craft', [
        activity('10:00 AM', 'Tea ceremony', 'Private introduction to seasonal tea practice.', 'Uji'),
        activity('3:00 PM', 'Kintsugi workshop', 'Learn the philosophy and basic repair technique.', 'Central Kyoto'),
      ]),
      day(5, 'Fushimi and sake district', [
        activity('6:30 AM', 'Fushimi Inari hike', 'Walk beyond the lower shrine gates to the quieter viewpoints.', 'Fushimi'),
        activity('1:30 PM', 'Sake brewery district', 'Guided tasting and canal walk.', 'Fushimi'),
      ]),
      day(6, 'Philosopher’s Path', [
        activity('9:00 AM', 'Nanzen-ji and canal aqueduct', 'Temple grounds and a relaxed northbound walk.', 'Sakyo'),
        activity('4:00 PM', 'Free evening', 'Time for shopping, a bathhouse, or revisiting a favorite lane.', 'Kyoto'),
      ]),
      day(7, 'Departure morning', [
        activity('8:30 AM', 'Seasonal breakfast', 'Final Japanese breakfast before checkout.', 'Kyoto Station area'),
      ]),
    ],
    tripSummary: {
      totalDistance: 'Approximately 95 km locally',
      travelTime: 'Mostly 15–40 minute transit legs',
      mealsIncluded: ['6 breakfasts', '2 guided tastings', '1 tea ceremony'],
      highlights: ['Kiyomizu-dera at dawn', 'Private tea ceremony', 'Kintsugi workshop', 'Fushimi sake district'],
    },
    isActive: true,
    createdDaysAgo: 21,
  },
  {
    title: 'Cyclades Slow-Island Escape',
    destination: 'Santorini & Paros, Greece',
    startDate: '2026-08-18',
    endDate: '2026-08-25',
    duration: '8 Days / 7 Nights',
    budget: 4850,
    travelerCount: 2,
    category: 'leisure',
    travelStyle: 'premium',
    transportMode: 'mixed',
    accommodationType: 'resort',
    budgetBreakdown: { transport: 1050, accommodation: 1850, food: 820, activities: 700, contingency: 430 },
    description: 'An unhurried Aegean route with caldera mornings, a small-group sailing day, Paros villages, and beaches chosen for atmosphere rather than crowds.',
    dailyPlan: [
      day(1, 'Santorini arrival', [
        activity('3:00 PM', 'Caldera hotel check-in', 'Settle in and keep the first evening deliberately light.', 'Imerovigli'),
        activity('7:00 PM', 'Clifftop dinner', 'Sunset dinner away from the busiest Oia terraces.', 'Imerovigli'),
      ]),
      day(2, 'Fira to Oia trail', [
        activity('7:30 AM', 'Caldera hike', 'Walk the volcanic rim before the heat.', 'Fira to Oia'),
        activity('4:30 PM', 'Oia lanes', 'Gallery browsing and a quiet terrace aperitif.', 'Oia'),
      ]),
      day(3, 'Volcanic sailing day', [
        activity('10:00 AM', 'Small-group catamaran', 'Hot springs, snorkeling, and lunch onboard.', 'Santorini caldera'),
      ]),
      day(4, 'Wine country', [
        activity('11:00 AM', 'Estate winery tasting', 'Assyrtiko tasting with vineyard lunch.', 'Pyrgos'),
        activity('5:00 PM', 'Pyrgos village walk', 'Blue hour among the hillside lanes.', 'Pyrgos'),
      ]),
      day(5, 'Ferry to Paros', [
        activity('10:30 AM', 'Fast ferry', 'Transfer to Paros and check in near Naousa.', 'Athinios to Parikia'),
        activity('6:00 PM', 'Naousa harbor evening', 'Easy seafood dinner by the old port.', 'Naousa'),
      ]),
      day(6, 'Paros coves', [
        activity('9:30 AM', 'Beach-hopping drive', 'Kolymbithres and one quieter northern cove.', 'North Paros'),
      ]),
      day(7, 'Lefkes and inland villages', [
        activity('9:00 AM', 'Byzantine trail', 'Short village-to-village walk and café lunch.', 'Lefkes'),
        activity('7:30 PM', 'Farewell dinner', 'Modern Cycladic menu in Naousa.', 'Naousa'),
      ]),
      day(8, 'Departure', [
        activity('9:00 AM', 'Harbor breakfast', 'Slow breakfast before airport or ferry transfer.', 'Parikia'),
      ]),
    ],
    tripSummary: {
      totalDistance: 'Two islands plus approximately 140 km locally',
      travelTime: 'One 2-hour ferry and short island transfers',
      mealsIncluded: ['7 breakfasts', 'Sailing lunch', 'Winery lunch'],
      highlights: ['Fira–Oia trail', 'Caldera sailing', 'Assyrtiko tasting', 'Lefkes villages'],
    },
    isActive: true,
    createdDaysAgo: 18,
  },
  {
    title: 'Ladakh High-Altitude Circuit',
    destination: 'Leh & Nubra Valley, India',
    startDate: '2026-09-20',
    endDate: '2026-09-27',
    duration: '8 Days / 7 Nights',
    budget: 2100,
    travelerCount: 4,
    category: 'adventure',
    travelStyle: 'balanced',
    transportMode: 'car',
    accommodationType: 'eco_lodge',
    budgetBreakdown: { transport: 620, accommodation: 610, food: 310, activities: 330, contingency: 230 },
    description: 'A carefully paced Ladakh circuit with a full acclimatization day, monastery visits, Nubra landscapes, Pangong Lake, and conservative driving windows.',
    dailyPlan: [
      day(1, 'Arrive and acclimatize', [
        activity('11:00 AM', 'Leh arrival', 'Hotel transfer and mandatory rest.', 'Leh'),
        activity('5:00 PM', 'Gentle market walk', 'Short low-effort orientation if everyone feels well.', 'Leh Market'),
      ]),
      day(2, 'Leh heritage day', [
        activity('9:30 AM', 'Leh Palace', 'Slow visit with frequent rest stops.', 'Leh'),
        activity('3:30 PM', 'Shanti Stupa', 'Sunset viewpoint by vehicle.', 'Leh'),
      ]),
      day(3, 'Indus monastery circuit', [
        activity('9:00 AM', 'Thiksey Monastery', 'Morning prayer hall and rooftop views.', 'Thiksey'),
        activity('1:00 PM', 'Hemis Monastery', 'Museum visit after lunch.', 'Hemis'),
      ]),
      day(4, 'Drive to Nubra Valley', [
        activity('8:00 AM', 'Khardung La crossing', 'Weather-dependent high pass with a brief stop.', 'Khardung La'),
        activity('3:00 PM', 'Hunder check-in', 'Rest at a valley eco-camp.', 'Hunder'),
      ]),
      day(5, 'Nubra exploration', [
        activity('9:30 AM', 'Diskit Monastery', 'Maitreya viewpoint and monastery visit.', 'Diskit'),
        activity('4:00 PM', 'Dune walk', 'Golden-hour walk among the cold-desert dunes.', 'Hunder'),
      ]),
      day(6, 'Pangong Lake', [
        activity('7:30 AM', 'Scenic transfer', 'Drive via Shyok with regular breaks.', 'Nubra to Pangong'),
        activity('5:00 PM', 'Lakeshore evening', 'Quiet viewpoint near the stay.', 'Pangong'),
      ]),
      day(7, 'Return to Leh', [
        activity('8:30 AM', 'Lake sunrise', 'Short sunrise walk before breakfast.', 'Pangong'),
        activity('10:30 AM', 'Drive to Leh', 'Return via Chang La.', 'Pangong to Leh'),
      ]),
      day(8, 'Fly onward', [
        activity('7:00 AM', 'Airport transfer', 'Early transfer with weather buffer.', 'Leh'),
      ]),
    ],
    tripSummary: {
      totalDistance: 'Approximately 620 km by road',
      travelTime: 'Four major driving days with acclimatization buffers',
      mealsIncluded: ['7 breakfasts', '5 dinners'],
      highlights: ['Khardung La', 'Nubra cold desert', 'Pangong Lake', 'Thiksey Monastery'],
    },
    isActive: true,
    createdDaysAgo: 15,
  },
  {
    title: 'Kerala Backwaters & Spice Hills',
    destination: 'Kochi, Munnar & Alleppey, India',
    startDate: '2026-11-05',
    endDate: '2026-11-11',
    duration: '7 Days / 6 Nights',
    budget: 1750,
    travelerCount: 3,
    category: 'wellness',
    travelStyle: 'balanced',
    transportMode: 'car',
    accommodationType: 'homestay',
    budgetBreakdown: { transport: 390, accommodation: 540, food: 270, activities: 310, contingency: 240 },
    description: 'A green, restorative Kerala route linking Fort Kochi’s history, Munnar tea country, local food, and a private overnight backwater cruise.',
    dailyPlan: [
      day(1, 'Fort Kochi arrival', [
        activity('2:00 PM', 'Heritage stay check-in', 'Settle into a restored property in Fort Kochi.', 'Fort Kochi'),
        activity('5:00 PM', 'Waterfront walk', 'Chinese fishing nets and colonial streets.', 'Fort Kochi'),
      ]),
      day(2, 'Kochi culture and food', [
        activity('9:00 AM', 'Mattancherry heritage walk', 'Palace, synagogue quarter, and spice warehouses.', 'Mattancherry'),
        activity('5:30 PM', 'Kathakali performance', 'Make-up demonstration followed by the performance.', 'Fort Kochi'),
      ]),
      day(3, 'Drive to Munnar', [
        activity('8:30 AM', 'Scenic hill transfer', 'Waterfall stops and a plantation lunch.', 'Kochi to Munnar'),
      ]),
      day(4, 'Tea country', [
        activity('8:00 AM', 'Tea estate walk', 'Guided plantation walk and factory tasting.', 'Munnar'),
        activity('3:30 PM', 'Top Station viewpoint', 'Weather-dependent valley views.', 'Top Station'),
      ]),
      day(5, 'Village and wellness day', [
        activity('10:00 AM', 'Spice garden visit', 'Cardamom, pepper, and cacao with a local guide.', 'Munnar'),
        activity('4:00 PM', 'Ayurvedic treatment', 'Optional consultation and restorative massage.', 'Munnar'),
      ]),
      day(6, 'Backwater houseboat', [
        activity('12:00 PM', 'Private houseboat boarding', 'Lunch onboard and afternoon cruise through village canals.', 'Alleppey'),
      ]),
      day(7, 'Disembark and depart', [
        activity('9:00 AM', 'Backwater breakfast', 'Final breakfast before the Kochi transfer.', 'Alleppey'),
      ]),
    ],
    tripSummary: {
      totalDistance: 'Approximately 410 km',
      travelTime: 'Three intercity transfers and one overnight cruise',
      mealsIncluded: ['6 breakfasts', 'Houseboat full board', 'Plantation lunch'],
      highlights: ['Fort Kochi heritage', 'Munnar tea walk', 'Ayurvedic wellness', 'Private houseboat'],
    },
    isActive: true,
    createdDaysAgo: 12,
  },
  {
    title: 'Swiss Lakes & Mountain Rail',
    destination: 'Lucerne, Interlaken & Zermatt, Switzerland',
    startDate: '2027-01-16',
    endDate: '2027-01-24',
    duration: '9 Days / 8 Nights',
    budget: 5900,
    travelerCount: 2,
    category: 'leisure',
    travelStyle: 'premium',
    transportMode: 'train',
    accommodationType: 'hotel',
    budgetBreakdown: { transport: 1260, accommodation: 2140, food: 980, activities: 930, contingency: 590 },
    description: 'A winter rail journey built around lakefront cities, panoramic trains, mountain villages, and enough weather flexibility for alpine viewpoints.',
    dailyPlan: [
      day(1, 'Zurich to Lucerne', [
        activity('1:00 PM', 'Rail to Lucerne', 'Direct airport train and lakefront check-in.', 'Lucerne'),
        activity('5:00 PM', 'Old Town walk', 'Chapel Bridge and riverside dinner.', 'Lucerne'),
      ]),
      day(2, 'Mount Rigi winter day', [
        activity('8:30 AM', 'Boat and cogwheel rail', 'Round trip via Vitznau with weather alternatives.', 'Mount Rigi'),
      ]),
      day(3, 'GoldenPass to Interlaken', [
        activity('10:00 AM', 'Panoramic rail journey', 'Reserved scenic seats through central Switzerland.', 'Lucerne to Interlaken'),
      ]),
      day(4, 'Lauterbrunnen valley', [
        activity('9:00 AM', 'Village rail and winter walk', 'Waterfall valley and Wengen lunch.', 'Lauterbrunnen'),
      ]),
      day(5, 'Jungfrau weather window', [
        activity('8:00 AM', 'Mountain excursion', 'Choose Jungfraujoch or Grindelwald First based on conditions.', 'Bernese Oberland'),
      ]),
      day(6, 'Rail to Zermatt', [
        activity('9:30 AM', 'Scenic transfer', 'Travel via Visp to the car-free village.', 'Interlaken to Zermatt'),
        activity('4:00 PM', 'Village orientation', 'Easy walk and Matterhorn viewpoint.', 'Zermatt'),
      ]),
      day(7, 'Gornergrat railway', [
        activity('9:00 AM', 'Gornergrat ascent', 'Panoramic railway with flexible return stops.', 'Zermatt'),
      ]),
      day(8, 'Free alpine day', [
        activity('10:00 AM', 'Choose-your-pace day', 'Spa, skiing, snowshoeing, or a long lunch.', 'Zermatt'),
      ]),
      day(9, 'Departure', [
        activity('8:30 AM', 'Rail to Zurich', 'Travel with a generous airport buffer.', 'Zermatt to Zurich'),
      ]),
    ],
    tripSummary: {
      totalDistance: 'Approximately 520 km by rail',
      travelTime: 'Five scenic rail sectors',
      mealsIncluded: ['8 breakfasts', '1 mountain lunch'],
      highlights: ['Mount Rigi', 'GoldenPass route', 'Lauterbrunnen', 'Gornergrat railway'],
    },
    isActive: true,
    createdDaysAgo: 9,
  },
  {
    title: 'Rajasthan Palaces & Desert Light',
    destination: 'Jaipur, Jodhpur & Jaisalmer, India',
    startDate: '2026-12-03',
    endDate: '2026-12-11',
    duration: '9 Days / 8 Nights',
    budget: 2600,
    travelerCount: 2,
    category: 'cultural',
    travelStyle: 'balanced',
    transportMode: 'mixed',
    accommodationType: 'hotel',
    budgetBreakdown: { transport: 520, accommodation: 870, food: 410, activities: 470, contingency: 330 },
    description: 'A heritage-focused Rajasthan itinerary with early fort visits, neighborhood food, boutique havelis, desert landscapes, and train travel between major cities.',
    dailyPlan: [
      day(1, 'Jaipur arrival', [
        activity('3:00 PM', 'Haveli check-in', 'Settle in and enjoy a rooftop sunset.', 'Jaipur'),
      ]),
      day(2, 'Amber and old Jaipur', [
        activity('7:30 AM', 'Amber Fort', 'Early entry and guided palace visit.', 'Amer'),
        activity('3:00 PM', 'City Palace quarter', 'City Palace, Jantar Mantar, and bazaar walk.', 'Jaipur'),
      ]),
      day(3, 'Craft and food day', [
        activity('10:00 AM', 'Block-printing workshop', 'Hands-on textile session with a family studio.', 'Sanganer'),
        activity('6:00 PM', 'Old city food walk', 'Small tastings across traditional shops.', 'Jaipur'),
      ]),
      day(4, 'Train to Jodhpur', [
        activity('8:00 AM', 'Intercity train', 'Morning rail journey and blue-city check-in.', 'Jaipur to Jodhpur'),
      ]),
      day(5, 'Mehrangarh and blue lanes', [
        activity('8:30 AM', 'Mehrangarh Fort', 'Museum and ramparts before midday.', 'Jodhpur'),
        activity('4:30 PM', 'Blue city walk', 'Resident-led neighborhood route.', 'Navchokiya'),
      ]),
      day(6, 'Drive to Jaisalmer', [
        activity('9:00 AM', 'Desert transfer', 'Private drive with an Osian temple stop.', 'Jodhpur to Jaisalmer'),
      ]),
      day(7, 'Living fort and havelis', [
        activity('8:00 AM', 'Jaisalmer Fort', 'Temple lanes and heritage architecture.', 'Jaisalmer'),
        activity('4:00 PM', 'Gadisar Lake', 'Golden-hour lakeside walk.', 'Jaisalmer'),
      ]),
      day(8, 'Thar desert night', [
        activity('2:00 PM', 'Low-impact desert camp', 'Dune walk, local music, and overnight camp.', 'Khuri'),
      ]),
      day(9, 'Return and depart', [
        activity('8:30 AM', 'Camp breakfast', 'Return to Jaisalmer for onward travel.', 'Khuri to Jaisalmer'),
      ]),
    ],
    tripSummary: {
      totalDistance: 'Approximately 920 km',
      travelTime: 'One train and two road transfers',
      mealsIncluded: ['8 breakfasts', 'Food walk tastings', 'Desert camp dinner'],
      highlights: ['Amber Fort', 'Block printing', 'Mehrangarh Fort', 'Thar desert camp'],
    },
    isActive: true,
    createdDaysAgo: 7,
  },
  {
    title: 'Bali Creative Coast & Highlands',
    destination: 'Ubud & Uluwatu, Indonesia',
    startDate: '2026-07-21',
    endDate: '2026-07-28',
    duration: '8 Days / 7 Nights',
    budget: 2850,
    travelerCount: 2,
    category: 'wellness',
    travelStyle: 'balanced',
    transportMode: 'car',
    accommodationType: 'resort',
    budgetBreakdown: { transport: 390, accommodation: 980, food: 480, activities: 620, contingency: 380 },
    description: 'A wellness and design route through Ubud and the Bukit Peninsula, combining rice-field mornings, independent studios, quiet beaches, and flexible recovery time.',
    dailyPlan: [
      day(1, 'Arrive in Ubud', [
        activity('3:00 PM', 'Jungle stay check-in', 'Pool time and a quiet first evening.', 'Ubud'),
      ]),
      day(2, 'Rice fields and studios', [
        activity('7:00 AM', 'Campuhan ridge walk', 'Cool morning walk before breakfast.', 'Ubud'),
        activity('1:30 PM', 'Independent design studios', 'Textile and ceramic studio visits.', 'Ubud'),
      ]),
      day(3, 'Temple and water', [
        activity('8:30 AM', 'Tirta Empul', 'Guided cultural visit with respectful context.', 'Tampaksiring'),
        activity('3:30 PM', 'Waterfall swim', 'Choose a quieter waterfall based on conditions.', 'Gianyar'),
      ]),
      day(4, 'Wellness day', [
        activity('8:00 AM', 'Yoga and breakfast', 'Gentle class followed by a slow morning.', 'Ubud'),
        activity('2:00 PM', 'Spa ritual', 'Balinese massage and flower bath.', 'Ubud'),
      ]),
      day(5, 'Transfer to Uluwatu', [
        activity('10:00 AM', 'Southbound transfer', 'Stop for lunch before coastal check-in.', 'Ubud to Uluwatu'),
      ]),
      day(6, 'Bukit beaches', [
        activity('9:00 AM', 'Quiet beach circuit', 'Two coves selected around tide and swell.', 'Bukit Peninsula'),
      ]),
      day(7, 'Clifftop culture', [
        activity('4:00 PM', 'Uluwatu Temple', 'Temple visit and Kecak performance.', 'Uluwatu'),
      ]),
      day(8, 'Departure', [
        activity('9:00 AM', 'Ocean breakfast', 'Final slow morning before airport transfer.', 'Uluwatu'),
      ]),
    ],
    tripSummary: {
      totalDistance: 'Approximately 230 km locally',
      travelTime: 'Private transfers with flexible stops',
      mealsIncluded: ['7 breakfasts', '1 studio lunch'],
      highlights: ['Campuhan Ridge', 'Creative studios', 'Wellness day', 'Uluwatu sunset'],
    },
    isActive: false,
    createdDaysAgo: 4,
  },
];

function engagementFor(index, users) {
  const travelerUsers = users.filter((user) => user.role === 'user');
  const reviewComments = [
    'The pacing felt thoughtful and left room for spontaneous discoveries.',
    'Clear budget breakdown and excellent neighborhood recommendations.',
    'Beautiful route overall. I would happily book a version of this trip.',
    'The transport plan is realistic and the daily structure is easy to follow.',
    'A strong itinerary with a good balance of signature sights and quieter moments.',
  ];
  const favoriteCount = Math.min(travelerUsers.length, 2 + (index % 4));
  const reviewCount = Math.min(travelerUsers.length, 2 + (index % 3));
  const bookingCount = Math.min(travelerUsers.length, 1 + (index % 4));

  return {
    favorites: travelerUsers.slice(0, favoriteCount).map((user) => user._id),
    reviews: travelerUsers.slice(0, reviewCount).map((user, reviewIndex) => ({
      userId: user._id,
      rating: [5, 4, 5, 4, 5][(index + reviewIndex) % 5],
      comment: reviewComments[(index + reviewIndex) % reviewComments.length],
      createdAt: new Date(Date.now() - (index + reviewIndex + 2) * 86400000),
      updatedAt: new Date(Date.now() - (index + reviewIndex + 1) * 86400000),
    })),
    bookings: travelerUsers.slice(0, bookingCount).map((user, bookingIndex) => ({
      userId: user._id,
      bookedAt: new Date(Date.now() - (index + bookingIndex + 3) * 86400000),
      status: ['confirmed', 'pending', 'confirmed', 'cancelled'][(index + bookingIndex) % 4],
    })),
  };
}

async function seedDemoData({ connect = true, log = console.log } = {}) {
  if (connect) {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
    });
  }
  log(`Connected to ${mongoose.connection.name}`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = [];

  for (const demoUser of demoUsers) {
    const user = await User.findOneAndUpdate(
      { email: demoUser.email },
      {
        $set: {
          name: demoUser.name,
          role: demoUser.role,
          isActive: true,
        },
        $setOnInsert: {
          email: demoUser.email,
          password: passwordHash,
          createdAt: new Date(Date.now() - 45 * 86400000),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    users.push(user);
  }

  const admins = users.filter((user) => user.role === 'admin');
  const creators = [admins[0], ...users.filter((user) => user.role === 'user')];

  for (const [index, trip] of demoTrips.entries()) {
    const { createdDaysAgo, ...tripData } = trip;
    const engagement = engagementFor(index, users);
    await Itinerary.findOneAndUpdate(
      { title: trip.title },
      {
        $set: {
          ...tripData,
          startDate: new Date(trip.startDate),
          endDate: new Date(trip.endDate),
          createdBy: creators[index % creators.length]._id,
          ...engagement,
          createdAt: new Date(Date.now() - createdDaysAgo * 86400000),
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );
  }

  const requestUser = users.find((user) => user.email === 'kabir.demo@travel.com');
  const reviewer = admins[0];
  await RoleRequest.findOneAndUpdate(
    { userId: requestUser._id, requestedRole: 'admin' },
    {
      $set: {
        reason: 'I coordinate community group trips and would like to help curate and moderate published itineraries.',
        status: 'pending',
        reviewNotes: '',
        createdAt: new Date(Date.now() - 2 * 86400000),
      },
      $unset: { reviewedBy: 1, reviewedAt: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const approvedUser = users.find((user) => user.email === 'maya.demo@travel.com');
  await RoleRequest.findOneAndUpdate(
    { userId: approvedUser._id, requestedRole: 'admin' },
    {
      $set: {
        reason: 'I run a small travel club and want to publish carefully researched cultural routes.',
        status: 'approved',
        reviewedBy: reviewer._id,
        reviewedAt: new Date(Date.now() - 6 * 86400000),
        reviewNotes: 'Approved for the demonstration portfolio.',
        createdAt: new Date(Date.now() - 12 * 86400000),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const [userCount, itineraryCount, roleRequestCount] = await Promise.all([
    User.countDocuments(),
    Itinerary.countDocuments(),
    RoleRequest.countDocuments(),
  ]);

  const analytics = await Itinerary.aggregate([
    {
      $group: {
        _id: null,
        bookings: { $sum: { $size: { $ifNull: ['$bookings', []] } } },
        favorites: { $sum: { $size: { $ifNull: ['$favorites', []] } } },
        reviews: { $sum: { $size: { $ifNull: ['$reviews', []] } } },
      },
    },
  ]);

  log(`Users: ${userCount}`);
  log(`Itineraries: ${itineraryCount}`);
  log(`Role requests: ${roleRequestCount}`);
  log(`Engagement: ${JSON.stringify(analytics[0] || {})}`);
  log(`Demo user: aarav.demo@travel.com / ${DEMO_PASSWORD}`);
  log(`Demo admin: portfolio.admin@travel.com / ${DEMO_PASSWORD}`);
}

if (require.main === module) {
  seedDemoData()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Demo seed failed:', error);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    });
}

module.exports = { seedDemoData, DEMO_PASSWORD };
