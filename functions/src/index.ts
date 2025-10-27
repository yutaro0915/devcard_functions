import {setGlobalOptions} from "firebase-functions";
import {initializeApp} from "firebase-admin/app";

// Initialize Firebase Admin
initializeApp();

// For cost control, set the maximum number of containers
setGlobalOptions({maxInstances: 10});

// Export handlers
export {onUserCreate} from "./handlers/authHandlers";
export {saveGitHubToken} from "./handlers/serviceTokenHandlers";
export {
  saveCard,
  getSavedCards,
  savePrivateCard,
  markAsViewed,
  deleteSavedCard,
} from "./handlers/savedCardHandlers";
export {updateProfile} from "./handlers/profileHandlers";
export {
  updatePrivateCard,
  getPrivateCard,
  createExchangeToken,
} from "./handlers/privateCardHandlers";
export {getPublicCard} from "./handlers/publicCardHandlers";
export {manualSync} from "./handlers/syncHandlers";
export {addModerator} from "./handlers/moderatorHandlers";
export {
  createBadge,
  listBadges,
  grantBadge,
  revokeBadge,
  updateBadgeVisibility,
  getUserBadges,
} from "./handlers/badgeHandlers";
