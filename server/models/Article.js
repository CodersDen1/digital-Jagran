const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  // English Fields
  article_header_en: { type: String, required: true },
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

  // Common Fields
  photos: { type: [String] }, // Array of image URLs
  video: { type: String }, // Video URL

  // Layout Template Reference
  layoutTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'LayoutTemplate' },

  is_Published: { type: Boolean, default: false },
  is_Drafted: { type: Boolean, default: true },
  published_language: { type: String, default: 'en' }, // 'en', 'hi', or 'both'
  author: { type: String, default: 'Nisha Mishra' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Article', articleSchema);
