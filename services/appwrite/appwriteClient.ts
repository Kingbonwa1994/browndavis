// Singleton client initialization
import * as apw from "appwrite";
import { Platform } from "react-native";
import { Storage as aprnStorage } from "react-native-appwrite/src/services/storage";
import { Account as aprnAccount } from "react-native-appwrite/src/services/account";
import { Databases as aprnDatabase } from "react-native-appwrite";
import * as aprn from "react-native-appwrite/src";

interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  bundleId?: string;
}

interface AppwriteClient {
  storage: apw.Storage | aprnStorage;
  account: apw.Account | aprnAccount;
  database: apw.Databases | aprnDatabase;
}

/**
 * Factory class for creating platform-specific Appwrite clients
 * @class
 */
export class AppwriteClientFactory {
  /**
   * Singleton instance of the Appwrite client
   * @private
   * @static
   */
  private static instance: AppwriteClient;

  private constructor() {} // Prevent direct construction

  /**
   * Validates the Appwrite configuration
   * @returns {AppwriteConfig} The validated Appwrite configuration
   * @throws {Error} If required environment variables are not set
   */
  private static validateConfig(): AppwriteConfig {
    const endpoint = "https://cloud.appwrite.io/v1";
    const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!;
    const bundleId = process.env.EXPO_PUBLIC_APPWRITE_BUNDLE_ID!;

    if (!endpoint || !projectId) {
      throw new Error("Missing required Appwrite configuration");
    }

    if (Platform.OS !== "web" && !bundleId) {
      throw new Error("Missing required for bundleID Appwrite configuration");
    }

    return { endpoint, projectId, bundleId };
  }

  /**
   * Gets or creates a singleton instance of the Appwrite client
   * @returns {AppwriteClient} Platform-specific Appwrite client instance
   * @throws {Error} If environment variables are not set
   */
  static getInstance(): AppwriteClient {
    if (!this.instance) {
      const config = this.validateConfig();

      if (Platform.OS === "web") {
        const client = new apw.Client();
        client.setEndpoint(config.endpoint).setProject(config.projectId);
        this.instance = {
          storage: new apw.Storage(client),
          account: new apw.Account(client),
          database: new apw.Databases(client),
        };
      } else {
        const client = new aprn.Client();
        client
          .setEndpoint(config.endpoint)
          .setProject(config.projectId)
          .setPlatform(config.bundleId!);
        this.instance = {
          storage: new aprnStorage(client),
          account: new aprnAccount(client),
          database: new aprnDatabase(client as unknown as import("react-native-appwrite/types/client").Client),
        };
      }
    }
    return this.instance;
  }
}