// Sample itinerary data in the new format
const sampleItinerary = {
  title: "Ludhiana to Kasauli - Hill Station Getaway",
  destination: "Kasauli, Himachal Pradesh",
  startDate: new Date("2024-04-15"),
  endDate: new Date("2024-04-18"),
  duration: "4 Days / 3 Nights",
  budget: 15000,
  description: "A perfect hill station getaway from Ludhiana to the serene town of Kasauli. Experience panoramic Himalayan views, colonial architecture, and peaceful mountain walks.",
  dailyPlan: [
    {
      day: 1,
      title: "Ludhiana → Kasauli (Travel + Local Walk)",
      activities: [
        {
          time: "6:00 AM",
          activity: "Departure from Ludhiana",
          description: "Start journey by car/bus",
          location: "Ludhiana"
        },
        {
          time: "8:30 AM",
          activity: "Breakfast",
          description: "Stop near Chandigarh - Paratha, curd, tea ☕",
          location: "En route"
        },
        {
          time: "11:00 AM",
          activity: "Arrival in Kasauli",
          description: "Check-in to hotel and rest",
          location: "Kasauli"
        },
        {
          time: "1:30 PM",
          activity: "Lunch",
          description: "Local Himachali thali or simple North Indian meal 🍛",
          location: "Hotel/Local restaurant"
        },
        {
          time: "3:30 PM",
          activity: "Sightseeing",
          description: "Visit Christ Church & Walk on Mall Road",
          location: "Kasauli town"
        },
        {
          time: "7:30 PM",
          activity: "Dinner",
          description: "Soup, roti, paneer/veg curry 🍲",
          location: "Hotel/Restaurant"
        },
        {
          time: "9:30 PM",
          activity: "Rest",
          description: "Relax and prepare for next day",
          location: "Hotel"
        }
      ]
    },
    {
      day: 2,
      title: "Sightseeing Day",
      activities: [
        {
          time: "8:00 AM",
          activity: "Breakfast",
          description: "Bread omelette / sandwich + tea",
          location: "Hotel"
        },
        {
          time: "9:30 AM",
          activity: "Visit Monkey Point",
          description: "Panoramic Himalayan views",
          location: "Monkey Point"
        },
        {
          time: "1:30 PM",
          activity: "Lunch",
          description: "Rice, dal, vegetables",
          location: "Local restaurant"
        },
        {
          time: "3:00 PM",
          activity: "Sunset Point & Gilbert Trail",
          description: "Scenic views and nature walk",
          location: "Sunset Point"
        },
        {
          time: "7:30 PM",
          activity: "Dinner",
          description: "Local food / noodles / momos",
          location: "Mall Road"
        }
      ]
    },
    {
      day: 3,
      title: "Nearby Exploration",
      activities: [
        {
          time: "8:00 AM",
          activity: "Breakfast",
          description: "Hotel breakfast",
          location: "Hotel"
        },
        {
          time: "9:30 AM",
          activity: "Drive to Solan",
          description: "Visit nearby town (25 km drive)",
          location: "Solan"
        },
        {
          time: "10:30 AM",
          activity: "Explore Solan",
          description: "Shoolini Temple & Local market",
          location: "Solan"
        },
        {
          time: "1:30 PM",
          activity: "Lunch in Solan",
          description: "Local cuisine",
          location: "Solan"
        },
        {
          time: "4:00 PM",
          activity: "Return to Kasauli",
          description: "Drive back to Kasauli",
          location: "Kasauli"
        },
        {
          time: "6:30 PM",
          activity: "Leisure walk & shopping",
          description: "Mall Road souvenirs",
          location: "Mall Road"
        },
        {
          time: "8:00 PM",
          activity: "Dinner",
          description: "Farewell dinner",
          location: "Hotel/Restaurant"
        }
      ]
    },
    {
      day: 4,
      title: "Return Journey",
      activities: [
        {
          time: "8:00 AM",
          activity: "Breakfast",
          description: "Final breakfast at hotel",
          location: "Hotel"
        },
        {
          time: "9:30 AM",
          activity: "Hotel checkout",
          description: "Pack and check out",
          location: "Hotel"
        },
        {
          time: "10:00 AM",
          activity: "Depart for Ludhiana",
          description: "Begin return journey",
          location: "Kasauli"
        },
        {
          time: "1:30 PM",
          activity: "Lunch stop",
          description: "Meal break near Chandigarh",
          location: "En route"
        },
        {
          time: "3:30-4:00 PM",
          activity: "Arrival in Ludhiana",
          description: "End of trip",
          location: "Ludhiana"
        }
      ]
    }
  ],
  tripSummary: {
    totalDistance: "~165 km one way",
    travelTime: "4–5 hours",
    mealsIncluded: ["Breakfast", "Lunch", "Dinner daily"],
    highlights: [
      "Panoramic Himalayan views from Monkey Point",
      "Colonial architecture at Christ Church",
      "Peaceful walks on Mall Road",
      "Scenic Sunset Point and Gilbert Trail",
      "Day trip to historic Solan",
      "Shopping for local souvenirs"
    ]
  }
};

module.exports = sampleItinerary;