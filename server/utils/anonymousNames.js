const ADJECTIVES = [
  "Happy", "Clever", "Brave", "Calm", "Eager",
  "Fancy", "Gentle", "Jolly", "Kind", "Lively",
  "Merry", "Nice", "Polite", "Proud", "Sharp",
  "Smart", "Sweet", "Wise", "Zany", "Bold",
  "Cool", "Dapper", "Fierce", "Fast", "Bouncy",
  "Chill", "Cosmic", "Epic", "Goofy", "Hyper",
  "Icy", "Lucky", "Neon", "Prime", "Rad",
  "Swift", "Turbo", "Ultra", "Vivid", "Zen",
  "Blaze", "Coral", "Dewy", "Frost", "Glow",
  "Hollow", "Lush", "Misty", "Patch", "Rough",
  "Shiny", "Silly", "Soft", "Sunny", "Tasty",
  "Tiny", "Warm", "Weird", "Wild", "Witty",
  "Fuzzy", "Gloomy", "Hopper", "Jumpy", "Kooky",
  "Muddy", "Peppy", "Quiet", "Rowdy", "Sassy",
  "Slim", "Spicy", "Steady", "Tricky", "Vast",
  "Wavy", "Zesty", "Amiable", "Brisk", "Candid",
  "Dandy", "Fabled", "Gaunt", "Hale", "Keen",
]
const NOUNS = [
  "Panda", "Tiger", "Eagle", "Fox", "Wolf",
  "Bear", "Hawk", "Lion", "Deer", "Owl",
  "Salmon", "Seal", "Dove", "Goat", "Moth",
  "Newt", "Lynx", "Frog", "Crow", "Hare",
  "Pup", "Cub", "Kit", "Hen", "Ram",
  "Bee", "Ant", "Bat", "Crab", "Elk",
  "Gem", "Leaf", "Core", "Spark", "Bloom",
  "Drift", "Frost", "Glow", "Haze", "Mint",
  "Nova", "Petal", "Quartz", "Ripple", "Shade",
  "Stone", "Wave", "Zephyr", "Bolt", "Crest",
  "Dew", "Ember", "Flare", "Gleam", "Jet",
  "Orb", "Peak", "Rune", "Surge", "Thorn",
  "Vale", "Wisp", "Ash", "Dusk", "Fang",
  "Jade", "Mist", "Pine", "Rift", "Sage",
  "Tide", "Vine", "Yew", "Briar", "Cliff",
];

const NAMES_PER_ADJECTIVE = NOUNS.length;
const TARGET_POOL_SIZE = 1000;

function generateAllNames() {
  const names = [];
  for (const adj of ADJECTIVES) {
    for (const noun of NOUNS) {
      names.push(`${adj}${noun}`);
    }
  }
  return names;
}

function getRandomizedPool() {
  const allNames = generateAllNames();
  const shuffled = allNames.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, TARGET_POOL_SIZE);
}

module.exports = {
  generateAllNames,
  getRandomizedPool,
  TARGET_POOL_SIZE,
};
