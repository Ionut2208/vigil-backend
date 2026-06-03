const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  sender: String,
  text: String,
  role: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatMessage', chatSchema);