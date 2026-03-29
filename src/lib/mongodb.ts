import { MongoClient, type Db } from "mongodb";

import { getServerEnv } from "@/lib/env";

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

let mongoClientPromise: Promise<MongoClient> | undefined;

function createMongoClient(uri: string) {
  return new MongoClient(uri, {
    appName: "getownerinfo-web",
    maxPoolSize: 10,
  });
}

function getMongoClientPromise() {
  if (process.env.NODE_ENV === "production") {
    if (!mongoClientPromise) {
      const { MONGODB_URI } = getServerEnv();
      mongoClientPromise = createMongoClient(MONGODB_URI).connect();
    }

    return mongoClientPromise;
  }

  if (!global.mongoClientPromise) {
    const { MONGODB_URI } = getServerEnv();
    global.mongoClientPromise = createMongoClient(MONGODB_URI).connect();
  }

  return global.mongoClientPromise;
}

export async function getMongoClient() {
  return getMongoClientPromise();
}

export async function getDatabase(): Promise<Db> {
  const { MONGODB_DB } = getServerEnv();
  const client = await getMongoClient();
  return client.db(MONGODB_DB);
}
