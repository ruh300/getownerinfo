import { MongoClient, type Db } from "mongodb";

import { env } from "@/lib/env";

const uri = env.MONGODB_URI;
const dbName = env.MONGODB_DB;

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

function createMongoClient() {
  return new MongoClient(uri, {
    appName: "getownerinfo-web",
    maxPoolSize: 10,
  });
}

const clientPromise =
  global.mongoClientPromise ??
  createMongoClient().connect().then((client) => {
    if (process.env.NODE_ENV !== "production") {
      global.mongoClientPromise = Promise.resolve(client);
    }

    return client;
  });

if (process.env.NODE_ENV !== "production" && !global.mongoClientPromise) {
  global.mongoClientPromise = clientPromise;
}

export async function getMongoClient() {
  return clientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}
