import app from "./app.js";
import { connectToDatabase } from "./config/db.js";
import { env } from "./config/env.js";

const start = async () => {
  await connectToDatabase();
  app.listen(env.port, () => {
    console.log(`${env.serviceName} listening on port ${env.port}`);
  });
};

start().catch((error) => {
  console.error("users-service startup failed:", error);
  process.exit(1);
});
