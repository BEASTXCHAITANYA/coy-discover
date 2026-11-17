/**
 * Mock profiles for the Discover demo.
 *
 * `likesYou` marks profiles that have already liked the logged-in user, so a
 * match can happen during a demo. This flag is only used to seed the `swipes`
 * table; it is never exposed through any API.
 */
export type SeedProfile = {
  name: string;
  age: number;
  college: string;
  city: string;
  bio: string;
  interests: string[];
  likesYou: boolean;
};

export const CURRENT_USER = {
  name: "You",
  age: 21,
  college: "Delhi University",
  city: "New Delhi",
  bio: "The logged-in demo user.",
  interests: ["Music", "Coffee"],
};

export const SEED_PROFILES: SeedProfile[] = [
  { name: "Ananya", age: 21, college: "Delhi University", city: "New Delhi", bio: "Library by day, open mics by night. Will judge your chai order.", interests: ["Poetry", "Chai", "Indie music"], likesYou: true },
  { name: "Rohan", age: 22, college: "IIT Bombay", city: "Mumbai", bio: "Building robots that mostly fall over. Ask me about my plant collection.", interests: ["Robotics", "Plants", "Football"], likesYou: false },
  { name: "Meera", age: 20, college: "Christ University", city: "Bengaluru", bio: "Film photography nerd. Currently out of film and patience.", interests: ["Photography", "Cafés", "Thrifting"], likesYou: true },
  { name: "Kabir", age: 23, college: "BITS Pilani", city: "Pilani", bio: "Hostel chef. My Maggi has a fan club of four.", interests: ["Cooking", "Basketball", "Anime"], likesYou: false },
  { name: "Ishita", age: 21, college: "St. Xavier's College", city: "Mumbai", bio: "Debate team captain. I will win this argument about pineapple pizza.", interests: ["Debating", "Pizza", "Travel"], likesYou: false },
  { name: "Arjun", age: 22, college: "NIT Trichy", city: "Tiruchirappalli", bio: "Guitar, gym, and getting lost on purpose.", interests: ["Guitar", "Gym", "Road trips"], likesYou: true },
  { name: "Sana", age: 20, college: "Jamia Millia Islamia", city: "New Delhi", bio: "Sketchbook always in my bag. Let me draw you badly.", interests: ["Sketching", "Museums", "K-drama"], likesYou: false },
  { name: "Vihaan", age: 21, college: "Manipal Institute", city: "Manipal", bio: "Sunrise runs and sunset beach cricket.", interests: ["Running", "Cricket", "Beaches"], likesYou: false },
  { name: "Diya", age: 22, college: "Symbiosis", city: "Pune", bio: "Marketing student who can't stop rebranding my friends.", interests: ["Branding", "Dance", "Brunch"], likesYou: true },
  { name: "Aditya", age: 23, college: "IIT Delhi", city: "New Delhi", bio: "Chess, coffee, and pretending to understand quantum physics.", interests: ["Chess", "Coffee", "Physics"], likesYou: false },
  { name: "Tara", age: 20, college: "Lady Shri Ram College", city: "New Delhi", bio: "Bookstore wanderer. Recommend me something that will make me cry.", interests: ["Books", "Theatre", "Baking"], likesYou: false },
  { name: "Neil", age: 22, college: "VIT Vellore", city: "Vellore", bio: "Making beats in my hostel room. Neighbours are thrilled.", interests: ["Music production", "Gaming", "Biryani"], likesYou: true },
  { name: "Riya", age: 21, college: "Miranda House", city: "New Delhi", bio: "Bharatanatyam and bad puns, in that order.", interests: ["Dance", "Puns", "Street food"], likesYou: false },
  { name: "Aarav", age: 20, college: "Ashoka University", city: "Sonipat", bio: "Philosophy major. Yes, I will ask what you mean by 'fine'.", interests: ["Philosophy", "Podcasts", "Hiking"], likesYou: false },
  { name: "Kavya", age: 22, college: "IIIT Hyderabad", city: "Hyderabad", bio: "Hackathon regular. I debug better after midnight.", interests: ["Coding", "Hackathons", "Irani chai"], likesYou: true },
  { name: "Dev", age: 23, college: "SRCC", city: "New Delhi", bio: "Spreadsheets by day, stand-up comedy by night.", interests: ["Comedy", "Finance", "Badminton"], likesYou: false },
  { name: "Nisha", age: 21, college: "Loyola College", city: "Chennai", bio: "Marine biology dreams, filter coffee reality.", interests: ["Ocean", "Filter coffee", "Swimming"], likesYou: false },
  { name: "Yash", age: 22, college: "COEP", city: "Pune", bio: "Trekking every monsoon. Sahyadris are my therapy.", interests: ["Trekking", "Monsoons", "Photography"], likesYou: false },
  { name: "Aisha", age: 20, college: "Presidency University", city: "Kolkata", bio: "Rabindra Sangeet and rosogolla loyalist.", interests: ["Singing", "Sweets", "Literature"], likesYou: true },
  { name: "Karan", age: 21, college: "Thapar Institute", city: "Patiala", bio: "Football on weekdays, FIFA on weekends.", interests: ["Football", "Gaming", "Bhangra"], likesYou: false },
  { name: "Pooja", age: 22, college: "NIFT", city: "New Delhi", bio: "Designing clothes nobody asked for but everyone needs.", interests: ["Fashion", "Sewing", "Flea markets"], likesYou: false },
  { name: "Siddharth", age: 23, college: "IIM Ahmedabad", city: "Ahmedabad", bio: "Case studies and kite festivals.", interests: ["Strategy", "Kites", "Jazz"], likesYou: false },
  { name: "Zoya", age: 21, college: "Aligarh Muslim University", city: "Aligarh", bio: "Urdu poetry and astronomy club. Look up more.", interests: ["Astronomy", "Urdu poetry", "Calligraphy"], likesYou: true },
  { name: "Rahul", age: 22, college: "Jadavpur University", city: "Kolkata", bio: "Quizzing champ. Ask me anything except directions.", interests: ["Quizzing", "History", "Fish curry"], likesYou: false },
  { name: "Priya", age: 20, college: "Mount Carmel College", city: "Bengaluru", bio: "Yoga at 6 am, dosa at 6:30.", interests: ["Yoga", "Dosa", "Volunteering"], likesYou: false },
  { name: "Aryan", age: 21, college: "DTU", city: "New Delhi", bio: "Cars, code, and very loud playlists.", interests: ["Cars", "Coding", "EDM"], likesYou: false },
  { name: "Simran", age: 22, college: "Panjab University", city: "Chandigarh", bio: "Sunday cycling around Sukhna Lake. Join me?", interests: ["Cycling", "Lassi", "Painting"], likesYou: true },
  { name: "Om", age: 20, college: "MIT World Peace University", city: "Pune", bio: "Amateur astronomer, professional overthinker.", interests: ["Stars", "Sci-fi", "Board games"], likesYou: false },
  { name: "Fatima", age: 21, college: "Osmania University", city: "Hyderabad", bio: "Med student. I'll remind you to drink water.", interests: ["Medicine", "Haleem", "Reading"], likesYou: false },
  { name: "Nikhil", age: 23, college: "IISc Bengaluru", city: "Bengaluru", bio: "Researching batteries. Mine is always at 3%.", interests: ["Research", "Climbing", "Craft coffee"], likesYou: false },
  { name: "Tanvi", age: 20, college: "Fergusson College", city: "Pune", bio: "Theatre kid who never left the stage.", interests: ["Theatre", "Improv", "Vada pav"], likesYou: false },
  { name: "Ayaan", age: 22, college: "Christ University", city: "Bengaluru", bio: "Dog dad to a very dramatic beagle.", interests: ["Dogs", "Skateboarding", "Indie films"], likesYou: true },
];
