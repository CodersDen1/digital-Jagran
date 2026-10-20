const indexes = {
  articles: [
    {
      key: { slug: 1 },
      options: { name: "slug_1", unique: true, sparse: true },
    },
    {
      key: { status: 1, publishedAt: -1, _id: 1 },
      options: { name: "newsroom_publication" },
    },
    {
      key: { category: 1, status: 1, publishedAt: -1, _id: 1 },
      options: { name: "newsroom_section" },
    },
    { key: { updatedAt: -1, _id: 1 }, options: { name: "newsroom_recent" } },
  ],
  newslettersubscribers: [
    { key: { email: 1 }, options: { name: "email_1", unique: true } },
    {
      key: { createdAt: -1, _id: 1 },
      options: { name: "newsroom_subscriber_recent" },
    },
  ],
  newsroom_idempotency: [
    {
      key: { expiresAt: 1 },
      options: { name: "newsroom_idempotency_ttl", expireAfterSeconds: 0 },
    },
  ],
  newsroom_sessions: [
    {
      key: { expiresAt: 1 },
      options: { name: "newsroom_sessions_ttl", expireAfterSeconds: 0 },
    },
  ],
  newsroom_rates: [
    {
      key: { expiresAt: 1 },
      options: { name: "newsroom_rates_ttl", expireAfterSeconds: 0 },
    },
  ],
};
async function migrate() {
  if (!process.env.MONGODB_URI)
    throw new Error(
      "Supply MONGODB_URI explicitly. This command does not read .env.",
    );
  const mongoose = require("mongoose");
  const connection = await mongoose
    .createConnection(process.env.MONGODB_URI, {
      autoIndex: false,
      autoCreate: false,
      serverSelectionTimeoutMS: 5000,
    })
    .asPromise();
  try {
    const hello = await connection.db.admin().command({ hello: 1 });
    if (!hello.setName) throw new Error("A Mongo replica set is required.");
    const apply = process.argv.includes("--apply");
    for (const [name, specs] of Object.entries(indexes))
      for (const spec of specs) {
        console.log(
          JSON.stringify({
            event: apply ? "create_index" : "planned_index",
            collection: name,
            ...spec,
          }),
        );
        if (apply)
          await connection.db
            .collection(name)
            .createIndex(spec.key, spec.options);
      }
    console.log(
      JSON.stringify({
        event: process.argv.includes("--apply")
          ? "index_migration_complete"
          : "index_migration_dry_run",
        schemaVersion: 2,
      }),
    );
  } finally {
    await connection.close();
  }
}
if (require.main === module)
  migrate().catch((e) => {
    console.error(
      JSON.stringify({
        event: "index_migration_failed",
        code: e.code || "CONFIG",
        error:
          e.code === 11000
            ? "Duplicate indexed values; reconcile duplicate slugs/emails before applying indexes."
            : e.message,
      }),
    );
    process.exitCode = 1;
  });
module.exports = { indexes };
