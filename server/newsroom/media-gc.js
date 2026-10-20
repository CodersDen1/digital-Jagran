const mongoose = require("mongoose");
async function mediaGc() {
  if (!process.env.MONGODB_URI)
    throw new Error("Supply MONGODB_URI explicitly; .env is not read.");
  const connection = await mongoose
    .createConnection(process.env.MONGODB_URI, {
      autoIndex: false,
      autoCreate: false,
      serverSelectionTimeoutMS: 5000,
      timeoutMS: 10000,
      socketTimeoutMS: 10000,
      waitQueueTimeoutMS: 2000,
      maxPoolSize: 2,
    })
    .asPromise();
  try {
    const db = connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: "newsroom_media_bytes",
    });
    const cutoff = new Date(Date.now() - 48 * 3600000);
    const cursor = db.collection("newsroom_media_bytes.files").aggregate(
      [
        { $match: { uploadDate: { $lt: cutoff } } },
        {
          $lookup: {
            from: "newsroom_media",
            localField: "_id",
            foreignField: "gridFsId",
            as: "references",
          },
        },
        { $match: { references: { $size: 0 } } },
        { $project: { _id: 1 } },
      ],
      { maxTimeMS: 5000 },
    );
    const apply = process.argv.includes("--apply");
    let count = 0;
    for await (const file of cursor) {
      if (apply) await bucket.delete(file._id);
      count++;
    }
    console.log(
      JSON.stringify({
        event: apply ? "orphan_media_deleted" : "orphan_media_dry_run",
        count,
        olderThan: cutoff.toISOString(),
      }),
    );
  } finally {
    await connection.close();
  }
}
if (require.main === module)
  mediaGc().catch((error) => {
    console.error(
      JSON.stringify({
        event: "media_gc_failed",
        name: error.name,
        code: error.code,
      }),
    );
    process.exitCode = 1;
  });
module.exports = { mediaGc };
