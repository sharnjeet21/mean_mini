const mongoose = require('mongoose');

const AffiliateClickSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  provider: {
    type: String,
    required: true,
    enum: ['booking.com', 'agoda', 'skyscanner', 'expedia', 'other']
  },
  targetType: {
    type: String,
    required: true,
    enum: ['hotel', 'flight', 'activity', 'insurance']
  },
  targetId: {
    type: String,
    required: false
  },
  targetName: {
    type: String,
    required: false
  },
  destination: {
    type: String,
    required: false
  },
  sourceUrl: {
    type: String,
    required: false
  },
  ipAddress: {
    type: String,
    required: false,
    select: false // Hash or exclude in real system, basic tracking here
  },
  userAgent: {
    type: String,
    required: false
  },
  clickedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AffiliateClick', AffiliateClickSchema);
