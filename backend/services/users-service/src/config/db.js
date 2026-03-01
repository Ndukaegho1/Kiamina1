import mongoose from "mongoose";
import { env } from "./env.js";

let isConnected = false;

export const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDbName
  });

  isConnected = true;
  console.log(`${env.serviceName} connected to MongoDB (${env.mongoDbName})`);
};
