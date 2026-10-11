export interface Player {
  id: number
  name: string
  country: string
  role: string
  battingStyle: string
  bowlingStyle: string
  basePrice: number
  rating: number
  experience: number
  recentForm: string
  speciality: string
}

export const cricketPlayers: Player[] = [
  // Batsmen
  {
    id: 1,
    name: "Virat Kohli",
    country: "India",
    role: "Batsman",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm medium",
    basePrice: 200000,
    rating: 95,
    experience: 15,
    recentForm: "Excellent",
    speciality: "Chase Master"
  },
  {
    id: 2,
    name: "Babar Azam",
    country: "Pakistan",
    role: "Batsman",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm off-break",
    basePrice: 180000,
    rating: 92,
    experience: 8,
    recentForm: "Excellent",
    speciality: "Consistent Scorer"
  },
  {
    id: 3,
    name: "Steve Smith",
    country: "Australia",
    role: "Batsman",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm leg-break",
    basePrice: 190000,
    rating: 94,
    experience: 14,
    recentForm: "Good",
    speciality: "Test Specialist"
  },
  {
    id: 4,
    name: "Joe Root",
    country: "England",
    role: "Batsman",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm off-break",
    basePrice: 170000,
    rating: 91,
    experience: 12,
    recentForm: "Good",
    speciality: "Anchor"
  },
  {
    id: 5,
    name: "Kane Williamson",
    country: "New Zealand",
    role: "Batsman",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm off-break",
    basePrice: 175000,
    rating: 90,
    experience: 13,
    recentForm: "Average",
    speciality: "Captain"
  },
  {
    id: 6,
    name: "Rohit Sharma",
    country: "India",
    role: "Batsman",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm off-break",
    basePrice: 185000,
    rating: 89,
    experience: 16,
    recentForm: "Good",
    speciality: "Opener"
  },
  {
    id: 7,
    name: "David Warner",
    country: "Australia",
    role: "Batsman",
    battingStyle: "Left-hand",
    bowlingStyle: "Right-arm leg-break",
    basePrice: 160000,
    rating: 87,
    experience: 14,
    recentForm: "Average",
    speciality: "Aggressive Opener"
  },
  {
    id: 8,
    name: "Quinton de Kock",
    country: "South Africa",
    role: "Wicket-keeper Batsman",
    battingStyle: "Left-hand",
    bowlingStyle: "None",
    basePrice: 150000,
    rating: 86,
    experience: 10,
    recentForm: "Good",
    speciality: "Wicket-keeper"
  },
  
  // All-rounders
  {
    id: 9,
    name: "Ben Stokes",
    country: "England",
    role: "All-rounder",
    battingStyle: "Left-hand",
    bowlingStyle: "Right-arm fast-medium",
    basePrice: 220000,
    rating: 93,
    experience: 11,
    recentForm: "Excellent",
    speciality: "Match Winner"
  },
  {
    id: 10,
    name: "Ravindra Jadeja",
    country: "India",
    role: "All-rounder",
    battingStyle: "Left-hand",
    bowlingStyle: "Left-arm orthodox",
    basePrice: 170000,
    rating: 88,
    experience: 13,
    recentForm: "Good",
    speciality: "Spin All-rounder"
  },
  {
    id: 11,
    name: "Shakib Al Hasan",
    country: "Bangladesh",
    role: "All-rounder",
    battingStyle: "Left-hand",
    bowlingStyle: "Left-arm orthodox",
    basePrice: 140000,
    rating: 85,
    experience: 16,
    recentForm: "Good",
    speciality: "Experienced All-rounder"
  },
  {
    id: 12,
    name: "Jason Holder",
    country: "West Indies",
    role: "All-rounder",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm fast-medium",
    basePrice: 130000,
    rating: 84,
    experience: 11,
    recentForm: "Average",
    speciality: "Tall All-rounder"
  },
  {
    id: 13,
    name: "Mitchell Starc",
    country: "Australia",
    role: "Bowler",
    battingStyle: "Left-hand",
    bowlingStyle: "Left-arm fast",
    basePrice: 160000,
    rating: 91,
    experience: 12,
    recentForm: "Excellent",
    speciality: "Death Bowler"
  },
  
  // Fast Bowlers
  {
    id: 14,
    name: "Jasprit Bumrah",
    country: "India",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm fast",
    basePrice: 180000,
    rating: 94,
    experience: 8,
    recentForm: "Excellent",
    speciality: "Yorker Specialist"
  },
  {
    id: 15,
    name: "Pat Cummins",
    country: "Australia",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm fast",
    basePrice: 170000,
    rating: 92,
    experience: 12,
    recentForm: "Excellent",
    speciality: "Captain Bowler"
  },
  {
    id: 16,
    name: "Kagiso Rabada",
    country: "South Africa",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm fast",
    basePrice: 165000,
    rating: 90,
    experience: 8,
    recentForm: "Good",
    speciality: "Express Pace"
  },
  {
    id: 17,
    name: "Shaheen Afridi",
    country: "Pakistan",
    role: "Bowler",
    battingStyle: "Left-hand",
    bowlingStyle: "Left-arm fast",
    basePrice: 155000,
    rating: 89,
    experience: 5,
    recentForm: "Excellent",
    speciality: "Young Talent"
  },
  {
    id: 18,
    name: "Trent Boult",
    country: "New Zealand",
    role: "Bowler",
    battingStyle: "Left-hand",
    bowlingStyle: "Left-arm fast-medium",
    basePrice: 150000,
    rating: 88,
    experience: 12,
    recentForm: "Good",
    speciality: "Swing Bowler"
  },
  {
    id: 19,
    name: "James Anderson",
    country: "England",
    role: "Bowler",
    battingStyle: "Left-hand",
    bowlingStyle: "Right-arm fast-medium",
    basePrice: 120000,
    rating: 86,
    experience: 20,
    recentForm: "Average",
    speciality: "Swing Master"
  },
  {
    id: 20,
    name: "Josh Hazlewood",
    country: "Australia",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm fast-medium",
    basePrice: 140000,
    rating: 87,
    experience: 11,
    recentForm: "Good",
    speciality: "Line & Length"
  },
  
  // Spinners
  {
    id: 21,
    name: "Rashid Khan",
    country: "Afghanistan",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm leg-break",
    basePrice: 175000,
    rating: 92,
    experience: 7,
    recentForm: "Excellent",
    speciality: "Mystery Spinner"
  },
  {
    id: 22,
    name: "Ravichandran Ashwin",
    country: "India",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm off-break",
    basePrice: 140000,
    rating: 87,
    experience: 14,
    recentForm: "Good",
    speciality: "Off-spinner"
  },
  {
    id: 23,
    name: "Nathan Lyon",
    country: "Australia",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm off-break",
    basePrice: 130000,
    rating: 85,
    experience: 13,
    recentForm: "Good",
    speciality: "Test Specialist"
  },
  {
    id: 24,
    name: "Adil Rashid",
    country: "England",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm leg-break",
    basePrice: 110000,
    rating: 82,
    experience: 8,
    recentForm: "Average",
    speciality: "Leg-spinner"
  },
  
  // More Batsmen
  {
    id: 25,
    name: "AB de Villiers",
    country: "South Africa",
    role: "Batsman",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm medium",
    basePrice: 190000,
    rating: 93,
    experience: 17,
    recentForm: "Retired",
    speciality: "360-degree Player"
  },
  {
    id: 26,
    name: "Chris Gayle",
    country: "West Indies",
    role: "Batsman",
    battingStyle: "Left-hand",
    bowlingStyle: "Right-arm off-break",
    basePrice: 140000,
    rating: 84,
    experience: 22,
    recentForm: "Average",
    speciality: "Power Hitter"
  },
  {
    id: 27,
    name: "KL Rahul",
    country: "India",
    role: "Wicket-keeper Batsman",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm medium",
    basePrice: 160000,
    rating: 86,
    experience: 9,
    recentForm: "Good",
    speciality: "Versatile Keeper"
  },
  {
    id: 28,
    name: "Jos Buttler",
    country: "England",
    role: "Wicket-keeper Batsman",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm medium",
    basePrice: 170000,
    rating: 88,
    experience: 10,
    recentForm: "Excellent",
    speciality: "Explosive Keeper"
  },
  {
    id: 29,
    name: "Martin Guptill",
    country: "New Zealand",
    role: "Batsman",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm medium",
    basePrice: 120000,
    rating: 81,
    experience: 14,
    recentForm: "Average",
    speciality: "Opener"
  },
  {
    id: 30,
    name: "Faf du Plessis",
    country: "South Africa",
    role: "Batsman",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm medium",
    basePrice: 145000,
    rating: 84,
    experience: 13,
    recentForm: "Good",
    speciality: "Captain"
  },
  
  // More All-rounders
  {
    id: 31,
    name: "Andre Russell",
    country: "West Indies",
    role: "All-rounder",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm fast",
    basePrice: 165000,
    rating: 87,
    experience: 12,
    recentForm: "Good",
    speciality: "Power All-rounder"
  },
  {
    id: 32,
    name: "Glenn Maxwell",
    country: "Australia",
    role: "All-rounder",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm off-break",
    basePrice: 155000,
    rating: 85,
    experience: 11,
    recentForm: "Average",
    speciality: "Big Show"
  },
  {
    id: 33,
    name: "Hardik Pandya",
    country: "India",
    role: "All-rounder",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm fast-medium",
    basePrice: 160000,
    rating: 86,
    experience: 7,
    recentForm: "Good",
    speciality: "Pace All-rounder"
  },
  {
    id: 34,
    name: "Moeen Ali",
    country: "England",
    role: "All-rounder",
    battingStyle: "Left-hand",
    bowlingStyle: "Right-arm off-break",
    basePrice: 125000,
    rating: 82,
    experience: 9,
    recentForm: "Average",
    speciality: "Spin All-rounder"
  },
  
  // More Fast Bowlers
  {
    id: 35,
    name: "Lockie Ferguson",
    country: "New Zealand",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm fast",
    basePrice: 135000,
    rating: 83,
    experience: 6,
    recentForm: "Good",
    speciality: "Express Pace"
  },
  {
    id: 36,
    name: "Anrich Nortje",
    country: "South Africa",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm fast",
    basePrice: 145000,
    rating: 85,
    experience: 4,
    recentForm: "Excellent",
    speciality: "Raw Pace"
  },
  {
    id: 37,
    name: "Mustafizur Rahman",
    country: "Bangladesh",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Left-arm fast-medium",
    basePrice: 115000,
    rating: 81,
    experience: 8,
    recentForm: "Good",
    speciality: "Cutter Master"
  },
  {
    id: 38,
    name: "Mohammad Shami",
    country: "India",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm fast",
    basePrice: 140000,
    rating: 85,
    experience: 11,
    recentForm: "Good",
    speciality: "Test Specialist"
  },
  
  // More Spinners & Others
  {
    id: 39,
    name: "Yuzvendra Chahal",
    country: "India",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm leg-break",
    basePrice: 120000,
    rating: 83,
    experience: 6,
    recentForm: "Good",
    speciality: "Leg-spinner"
  },
  {
    id: 40,
    name: "Tabraiz Shamsi",
    country: "South Africa",
    role: "Bowler",
    battingStyle: "Left-hand",
    bowlingStyle: "Left-arm chinaman",
    basePrice: 105000,
    rating: 80,
    experience: 5,
    recentForm: "Good",
    speciality: "Chinaman"
  },
  {
    id: 41,
    name: "Adam Zampa",
    country: "Australia",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm leg-break",
    basePrice: 110000,
    rating: 81,
    experience: 7,
    recentForm: "Average",
    speciality: "Leg-spinner"
  },
  {
    id: 42,
    name: "Ish Sodhi",
    country: "New Zealand",
    role: "Bowler",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm leg-break",
    basePrice: 95000,
    rating: 78,
    experience: 8,
    recentForm: "Average",
    speciality: "Leg-spinner"
  },
  {
    id: 43,
    name: "Liam Livingstone",
    country: "England",
    role: "All-rounder",
    battingStyle: "Right-hand",
    bowlingStyle: "Right-arm leg-break",
    basePrice: 130000,
    rating: 82,
    experience: 3,
    recentForm: "Good",
    speciality: "Young All-rounder"
  },
  {
    id: 44,
    name: "Nicholas Pooran",
    country: "West Indies",
    role: "Wicket-keeper Batsman",
    battingStyle: "Left-hand",
    bowlingStyle: "None",
    basePrice: 125000,
    rating: 81,
    experience: 5,
    recentForm: "Good",
    speciality: "Young Keeper"
  }
]
