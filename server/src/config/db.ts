import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/chess-app';

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}
