import { NhostClient } from "@nhost/nhost-js";

const nhostConfig = {
  authUrl: process.env.NEXT_PUBLIC_NHOST_AUTH_URL,
  graphqlUrl: process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL,
  storageUrl: process.env.NEXT_PUBLIC_NHOST_STORAGE_URL,
  functionsUrl: process.env.NEXT_PUBLIC_NHOST_FUNCTIONS_URL,
  subdomain: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN,
  region: process.env.NEXT_PUBLIC_NHOST_REGION,
};

const filteredConfig = Object.fromEntries(
  Object.entries(nhostConfig).filter(([, value]) => typeof value === "string" && value.length > 0)
);

export const nhost = new NhostClient(filteredConfig as Record<string, string>);
