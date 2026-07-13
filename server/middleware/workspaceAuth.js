const Organization = require('../models/Organization');

/**
 * Middleware to check if the user belongs to the requested organization.
 * Expects req.params.orgId or req.body.organization to be present.
 */
async function requireWorkspaceAccess(req, res, next) {
  try {
    const orgId = req.params.orgId || req.body.organization || req.query.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const userId = req.user._id || req.user.id;
    const isOwner = org.owner.toString() === userId.toString();
    const isMember = org.members.some(member => member.user.toString() === userId.toString());

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'You do not have access to this workspace' });
    }

    req.organization = org;
    next();
  } catch (err) {
    console.error('[workspaceAuth] Error checking workspace access:', err.message);
    res.status(500).json({ message: 'Internal server error checking workspace access' });
  }
}

module.exports = {
  requireWorkspaceAccess
};
