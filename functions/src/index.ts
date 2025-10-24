import {setGlobalOptions} from "firebase-functions";
import {initializeApp} from "firebase-admin/app";

// Initialize Firebase Admin
initializeApp();

// For cost control, set the maximum number of containers
setGlobalOptions({maxInstances: 10});

// Export handlers
export {onUserCreate} from "./handlers/authHandlers";
export {saveGitHubToken} from "./handlers/serviceTokenHandlers";
