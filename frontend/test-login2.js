const { NhostClient } = require("@nhost/nhost-js");

const nhostConfig = {
  authUrl: "http://localhost:4000/v1",
  graphqlUrl: "http://localhost:8080/v1/graphql",
  storageUrl: "http://localhost:5001/v1",
  functionsUrl: "http://localhost:3001/v1",
  subdomain: "local",
  region: "local",
};

const filteredConfig = Object.fromEntries(
  Object.entries(nhostConfig).filter(([, value]) => typeof value === "string" && value.length > 0)
);

const nhost = new NhostClient(filteredConfig);

async function test() {
  try {
    const result = await nhost.auth.signInEmailPassword({
      email: "ownerA@test.com",
      password: "password123"
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();