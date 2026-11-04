import mongoose from 'mongoose';
import { env } from './env';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trustlayer';

export async function connectDB(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected successfully to ${MONGO_URI}`);
  } catch (error) {
    console.error(`[MongoDB] Initial connection error:`, error);
    setTimeout(connectDB, 5000);
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection lost. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Connection re-established.');
});