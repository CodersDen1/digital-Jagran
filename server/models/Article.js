const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema({
  schemaVersion: { type: Number },
  // New newsroom fields are additive: legacy documents and custom layout data remain intact.
  translations: { type: mongoose.Schema.Types.Mixed },
  category: { type: String },
  status: { type: String },
  publishedAt: { type: Date },
  image: { type: String },
  imageAlt: { type: String },
  imageCredit: { type: String },
  authorBio: { type: String },
  featured: { type: Boolean, default: false },
  breaking: { type: Boolean, default: false },
  sources: [{ label: String, url: String }],
  correction: { type: String },
  // English Fields
  article_header_en: { type: String },
  metadata_en: { type: String },
  keywords_en: { type: [String] },
  summary_en: { type: String },
  body_en: { type: String }, // Can store HTML or Markdown
  tags_en: { type: [String] },

  // Hindi Fields (to be auto-translated or manually entered)
  article_header: { type: String },
  metadata: { type: String }, // Assuming this mapping based on requirement "metadata"
  keywords: { type: [String] },
  summary: { type: String },
  body: { type: String },
  tags: { type: [String] },

  // Element-specific content for custom layouts (maps element ID to content)
  // This allows multiple elements of the same type to have different content
  elementContent: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  elementContent_en: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Common Fields
  photos: { type: [String] }, // Array of image URLs
  video: { type: String }, // Video URL

  // Layout Template Reference
  layoutTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LayoutTemplate",
  },

  is_Published: { type: Boolean, default: false },
  is_Drafted: { type: Boolean, default: true },
  published_language: { type: String, default: "en" }, // 'en', 'hi', or 'both'
  author: { type: String, default: "Nisha Mishra" },
  isTranslating: { type: Boolean, default: false },

  // View tracking for trending
  views: { type: Number, default: 0 },

  // SEO Fields
  slug: { type: String, unique: true, sparse: true }, // Auto-generated URL-friendly string
  metaTitle: { type: String },
  metaDescription: { type: String },
  metaKeywords: { type: [String] },
  canonicalUrl: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

articleSchema.pre("validate", function () {
  if (!this.article_header_en && !this.article_header) {
    this.invalidate(
      "article_header_en",
      "Either English or Hindi header is required",
    );
    this.invalidate(
      "article_header",
      "Either English or Hindi header is required",
    );
  }
});

module.exports = mongoose.model("Article", articleSchema);
