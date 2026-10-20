const { createHash } = require("node:crypto");
const { HttpError } = require("./domain");
function imageRights(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new HttpError(422, "Image rights metadata is required.");
  const out = {};
  for (const field of ["license", "credit", "sourceUrl", "licenseUrl"]) {
    const value = input[field];
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > 2000 ||
      /[\u0000-\u001f\u007f]/.test(value)
    )
      throw new HttpError(422, `Provide image ${field}.`);
    out[field] = value.trim();
  }
  if (input.creator != null) {
    if (typeof input.creator !== "string" || input.creator.length > 300)
      throw new HttpError(422, "Provide a valid image creator.");
    out.creator = input.creator.trim();
  }
  for (const field of ["sourceUrl", "licenseUrl"]) {
    let u;
    try {
      u = new URL(out[field]);
    } catch {}
    if (
      !u ||
      !["http:", "https:"].includes(u.protocol) ||
      u.username ||
      u.password
    )
      throw new HttpError(
        422,
        "Image rights URLs must be HTTP(S) without credentials.",
      );
    out[field] = u.href;
  }
  return out;
}
let active = 0;
async function validateMedia(input) {
  const rights = imageRights(input);
  if (!["image/png", "image/jpeg", "image/webp"].includes(input.contentType))
    throw new HttpError(
      422,
      "Only PNG, JPEG and WebP reference images are accepted.",
    );
  if (
    typeof input.base64 !== "string" ||
    input.base64.length > 6990508 ||
    input.base64.length % 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      input.base64,
    )
  )
    throw new HttpError(422, "Provide valid base64 image bytes up to 5MiB.");
  const bytes = Buffer.from(input.base64, "base64");
  if (!bytes.length || bytes.length > 5 * 1024 * 1024)
    throw new HttpError(422, "Image bytes must be between 1byte and 5MiB.");
  const signature = bytes.subarray(0, 12);
  const detected = signature
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? "image/png"
    : signature[0] === 255 && signature[1] === 216 && signature[2] === 255
      ? "image/jpeg"
      : signature.toString("ascii", 0, 4) === "RIFF" &&
          signature.toString("ascii", 8, 12) === "WEBP"
        ? "image/webp"
        : null;
  if (detected !== input.contentType)
    throw new HttpError(
      422,
      "Image signature does not match the supplied content type.",
    );
  if (active >= 2)
    throw new HttpError(
      503,
      "Image processing is busy. Retry with the same key.",
    );
  active++;
  try {
    const sharp = require("sharp");
    const options = {
      limitInputPixels: 24000000,
      failOn: "warning",
      animated: false,
    };
    const metadata = await sharp(bytes, options).metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > 10000 ||
      metadata.height > 10000 ||
      (metadata.pages || 1) > 1
    )
      throw new Error("Unsupported image dimensions or animation.");
    const normalized = await sharp(bytes, options)
      .rotate()
      .webp({ quality: 85 })
      .timeout({ seconds: 5 })
      .toBuffer({ resolveWithObject: true });
    const buffer = normalized.data;
    if (buffer.length > 5 * 1024 * 1024)
      throw new Error("Normalized image is too large.");
    return {
      hash: createHash("sha256").update(buffer).digest("hex"),
      buffer,
      contentType: "image/webp",
      extension: "webp",
      width: normalized.info.width,
      height: normalized.info.height,
      rights,
    };
  } catch (error) {
    throw new HttpError(
      422,
      "Image bytes could not be safely decoded as a bounded still image.",
    );
  } finally {
    active--;
  }
}
module.exports = { validateMedia, imageRights };
