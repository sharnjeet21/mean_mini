const mongoose = require("mongoose");

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      role: {
        type: String,
        enum: ["admin", "planner", "viewer"],
        default: "planner",
      },
    },
  ],
  branding: {
    logoUrl: String,
    primaryColor: String,
    website: String,
  },
  subscription: {
    tier: {
      type: String,
      enum: ["free", "professional", "agency"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "past_due", "canceled"],
      default: "active",
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Organization", OrganizationSchema);
