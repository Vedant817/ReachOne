import { startIdle } from './lib/imap';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      console.log('Starting email sync process...');
      await startIdle();
    } catch (error) {
      console.error('Error starting email sync process:', error);
    }
  }
}
