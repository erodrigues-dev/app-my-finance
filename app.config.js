const path = require("path");
const fs = require("fs");

require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const appJsonPath = path.resolve(process.cwd(), "app.json");
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));

const firebaseFromEnv = {
  apiKey: process.env.FIREBASE_API_KEY ?? "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.FIREBASE_APP_ID ?? "",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID ?? "",
};

module.exports = {
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      googleServicesFile: path.resolve(process.cwd(), "google-services.json"),
    },
    extra: {
      ...appJson.expo.extra,
      firebase: firebaseFromEnv,
    },
  },
};
