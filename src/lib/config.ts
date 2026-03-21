export const ANTHROPIC_API_KEY = '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'

// Spotify Developer app — create at https://developer.spotify.com/dashboard
// Redirect URI to register: exp://localhost:8082/--/spotify (Expo Go dev)
// For production build: tether://spotify
export const SPOTIFY_CLIENT_ID = 'd509acd4400544aebe2ca31efd012658'  // ← paste your Spotify client ID here

export const ADJECTIVES = [
  'Cosmic', 'Feral', 'Savage', 'Mighty', 'Silent', 'Wild', 'Blazing', 'Iron',
  'Golden', 'Rogue', 'Stormy', 'Neon', 'Ancient', 'Rapid', 'Fierce', 'Lunar',
  'Phantom', 'Thunder', 'Crispy', 'Absolute', 'Chaotic', 'Legendary', 'Sneaky',
  'Unstoppable', 'Electric', 'Frozen', 'Radiant', 'Cursed', 'Sacred', 'Frosty'
];

export const NOUNS = [
  'Wombat', 'Falcon', 'Kraken', 'Badger', 'Phoenix', 'Marmot', 'Wolverine',
  'Narwhal', 'Platypus', 'Goblin', 'Viking', 'Titan', 'Specter', 'Panda',
  'Raccoon', 'Coyote', 'Mammoth', 'Banshee', 'Pegasus', 'Yeti', 'Sphinx',
  'Dingo', 'Otter', 'Moose', 'Raven', 'Cobra', 'Jackal', 'Bison', 'Lemur', 'Gecko'
];

export function generateUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}${noun}${num}`;
}