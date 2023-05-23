const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  media: [String],
  created: {
    type: Date,
    default: Date.now()
  }
});

module.exports = mongoose.model('Post', postSchema);