// Get random item from an array
export const getRandomItem = <T>(array: T[]): T => 
    array[Math.floor(Math.random() * array.length)];
  
  // Get random date within a given range
  export const getRandomDate = (daysAgo: number = 7): Date => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return new Date(pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime()));
  };