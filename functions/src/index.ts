import {setGlobalOptions} from "firebase-functions/v2";
import {initializeApp} from "firebase-admin/app";

// Initialize Firebase Admin
initializeApp();

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  // Note: region is not set here to allow emulator to use us-central1
  // For production, specify region via firebase.json or deployment command
});

// Export handlers
export {onUserCreate} from "./handlers/authHandlers";
export {saveGitHubToken} from "./handlers/serviceTokenHandlers";
export {saveCard, getSavedCards} from "./handlers/savedCardHandlers";
export {manualSync} from "./handlers/syncHandlers";
export {updateProfile} from "./handlers/profileHandlers";
export {getPublicCard} from "./handlers/publicCardHandlers";
