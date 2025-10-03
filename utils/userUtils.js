import { get, ref } from "firebase/database";
import { database } from "../hooks/config";

/**
 * Get user UID (User ID) from email address
 * @param {string} email - The email address to search for
 * @param {boolean} exactMatch - Whether to do exact match (default: true) or partial match (false)
 * @returns {Promise<string|null>} - Returns the UID if found, null if not found
 */
export const getUidFromEmail = async (email, exactMatch = true) => {
  try {
    const snapshot = await get(ref(database, "users-details"));
    
    if (!snapshot.exists()) {
      return null;
    }

    const searchEmail = email.trim().toLowerCase();
    
    for (const [uid, userData] of Object.entries(snapshot.val())) {
      const userEmail = userData?.details?.email?.toLowerCase();
      
      if (userEmail) {
        const isMatch = exactMatch 
          ? userEmail === searchEmail 
          : userEmail.includes(searchEmail);
          
        if (isMatch) {
          return uid;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error getting UID from email:", error);
    return null;
  }
};

/**
 * Get all UIDs that match a partial email address
 * @param {string} email - The partial email address to search for
 * @returns {Promise<Array>} - Returns array of objects with uid and email
 */
export const getAllUidsFromPartialEmail = async (email) => {
  try {
    const snapshot = await get(ref(database, "users-details"));
    
    if (!snapshot.exists()) {
      return [];
    }

    const searchEmail = email.trim().toLowerCase();
    const matches = [];
    
    for (const [uid, userData] of Object.entries(snapshot.val())) {
      const userEmail = userData?.details?.email?.toLowerCase();
      
      if (userEmail && userEmail.includes(searchEmail)) {
        matches.push({
          uid,
          email: userData.details.email,
          phoneNumber: userData.details.phoneNumber
        });
      }
    }
    
    return matches;
  } catch (error) {
    console.error("Error getting UIDs from partial email:", error);
    return [];
  }
};

/**
 * Get user details from UID
 * @param {string} uid - The user ID
 * @returns {Promise<Object|null>} - Returns user details if found, null if not found
 */
export const getUserDetailsFromUid = async (uid) => {
  try {
    const snapshot = await get(ref(database, `users-details/${uid}`));
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return snapshot.val();
  } catch (error) {
    console.error("Error getting user details from UID:", error);
    return null;
  }
};

/**
 * Get user email from UID (with caching)
 */
const uidEmailCache = new Map();

export const getEmailFromUid = async (uid) => {
  if (uidEmailCache.has(uid)) {
    return uidEmailCache.get(uid);
  }

  try {
    const snapshot = await get(ref(database, `users-details/${uid}/details/email`));
    const email = snapshot.exists() ? snapshot.val() : null;
    uidEmailCache.set(uid, email);
    return email;
  } catch (error) {
    console.error(`Failed to fetch email for UID ${uid}`, error);
    return null;
  }
};
