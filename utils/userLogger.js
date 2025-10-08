import { 
  collection, 
  doc,
  setDoc, 
  updateDoc,
  getDoc,
  getDocs,
  query, 
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { firestore } from '../hooks/config';

/**
 * Get device type from user agent
 */
export const getDeviceType = () => {
  const ua = navigator.userAgent;
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

/**
 * Get device info
 */
export const getDeviceInfo = (userEmail = null) => {
  return {
    device: getDeviceType(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    email: userEmail,
  };
};

/**
 * Get date range (start and end of day) for queries
 * @param {Date} date - The date to get range for
 * @returns {Object} - { start: timestamp, end: timestamp }
 */
export const getDateRange = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  return {
    start: start.getTime(),
    end: end.getTime()
  };
};

/**
 * Format epoch timestamp to readable date
 * @param {number} epoch - Unix epoch timestamp in milliseconds
 * @returns {string} - Formatted date string
 */
export const formatEpochDate = (epoch) => {
  if (!epoch) return 'N/A';
  
  return new Date(epoch).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Create a new session
 * @param {string} userId - User ID
 * @param {string} userEmail - User email (optional)
 * @returns {Promise<string>} - Session key
 */
export const createSession = async (userId, userEmail = null) => {
  try {
    const now = Date.now();
    const dateRange = getDateRange(new Date());
    
    // Generate unique session key
    const sessionKey = `${userId}_${now}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sessionData = {
      uid: userId,
      createdAt: now,
      lastActive: now,
      dateKey: dateRange.start,
      info: getDeviceInfo(userEmail),
    };
    
    // Create session in main collection
    const sessionRef = doc(firestore, 'sessions', sessionKey);
    await setDoc(sessionRef, sessionData);
    
    // Create reverse index in user's subcollection
    const userSessionRef = doc(firestore, 'users', userId, 'sessions', sessionKey);
    await setDoc(userSessionRef, {
      dateKey: dateRange.start,
    });
    
    console.log('Session created:', sessionKey);
    return sessionKey;
    
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

/**
 * Update session's last active timestamp
 * @param {string} sessionKey - Session key
 */
export const updateSessionActivity = async (sessionKey) => {
  try {
    const sessionRef = doc(firestore, 'sessions', sessionKey);
    await updateDoc(sessionRef, {
      lastActive: Date.now(),
    });
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
};

/**
 * Log an event to a session
 * @param {string} sessionKey - Session key
 * @param {string} eventType - Event type/name
 * @param {Object} eventData - Additional event data (optional)
 */
export const logEvent = async (sessionKey, eventType, eventData = {}) => {
  try {
    const now = Date.now();
    
    // Create event document
    const eventRef = doc(collection(firestore, 'sessions', sessionKey, 'events'));
    await setDoc(eventRef, {
      type: eventType,
      timestamp: now,
      ...eventData,
    });
    
    // Update session's last active time
    await updateSessionActivity(sessionKey);
    
    console.log('Event logged:', eventType);
    
  } catch (error) {
    console.error('Error logging event:', error);
  }
};

/**
 * Get all sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of session objects
 */
export const getUserSessions = async (userId) => {
  try {
    const sessionsRef = collection(firestore, 'sessions');
    const q = query(
      sessionsRef,
      where('uid', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const sessions = [];
    
    snapshot.forEach(doc => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return sessions;
    
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
};

/**
 * Get session with all events
 * @param {string} sessionKey - Session key
 * @returns {Promise<Object>} - Session object with events array
 */
export const getSessionLogs = async (sessionKey) => {
  try {
    // Get session data
    const sessionRef = doc(firestore, 'sessions', sessionKey);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      throw new Error('Session not found');
    }
    
    const sessionData = {
      id: sessionDoc.id,
      ...sessionDoc.data(),
    };
    
    // Get all events
    const eventsRef = collection(firestore, 'sessions', sessionKey, 'events');
    const eventsSnapshot = await getDocs(eventsRef);
    
    const events = [];
    eventsSnapshot.forEach(doc => {
      events.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    // Sort events by timestamp
    events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    return {
      ...sessionData,
      events,
    };
    
  } catch (error) {
    console.error('Error getting session logs:', error);
    return null;
  }
};

/**
 * Get all sessions and events for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of session objects with events
 */
export const getAllUserLogs = async (userId) => {
  try {
    const sessions = await getUserSessions(userId);
    
    // Get events for each session
    const sessionsWithEvents = await Promise.all(
      sessions.map(async (session) => {
        const sessionWithEvents = await getSessionLogs(session.id);
        return sessionWithEvents;
      })
    );
    
    return sessionsWithEvents;
    
  } catch (error) {
    console.error('Error getting all user logs:', error);
    return [];
  }
};

/**
 * Get sessions for a specific date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Array of session objects
 */
export const getSessionsByDateRange = async (startDate, endDate) => {
  try {
    const startTimestamp = getDateRange(startDate).start;
    const endTimestamp = getDateRange(endDate).end;
    
    const sessionsRef = collection(firestore, 'sessions');
    const q = query(
      sessionsRef,
      where('dateKey', '>=', startTimestamp),
      where('dateKey', '<=', endTimestamp),
      orderBy('dateKey', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const sessions = [];
    
    snapshot.forEach(doc => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return sessions;
    
  } catch (error) {
    console.error('Error getting sessions by date range:', error);
    return [];
  }
};

/**
 * Get active sessions (last active within specified minutes)
 * @param {number} minutes - Minutes threshold (default: 15)
 * @returns {Promise<Array>} - Array of active session objects
 */
export const getActiveSessions = async (minutes = 15) => {
  try {
    const threshold = Date.now() - (minutes * 60 * 1000);
    
    const sessionsRef = collection(firestore, 'sessions');
    const q = query(
      sessionsRef,
      where('lastActive', '>=', threshold),
      orderBy('lastActive', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const sessions = [];
    
    snapshot.forEach(doc => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return sessions;
    
  } catch (error) {
    console.error('Error getting active sessions:', error);
    return [];
  }
};

/**
 * Calculate session duration in minutes
 * @param {number} startTime - Start timestamp
 * @param {number} endTime - End timestamp
 * @returns {number} - Duration in minutes
 */
export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  return Math.round((endTime - startTime) / (1000 * 60));
};

/**
 * Check if session is active (last active within specified minutes)
 * @param {number} lastActive - Last active timestamp
 * @param {number} minutes - Minutes threshold (default: 15)
 * @returns {boolean} - True if active
 */
export const isSessionActive = (lastActive, minutes = 15) => {
  if (!lastActive) return false;
  const threshold = Date.now() - (minutes * 60 * 1000);
  return lastActive >= threshold;
};

/**
 * Get analytics for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} - Analytics data
 */
export const getAnalytics = async (startDate, endDate) => {
  try {
    const sessions = await getSessionsByDateRange(startDate, endDate);
    
    // Calculate metrics
    const totalSessions = sessions.length;
    const uniqueUsers = new Set(sessions.map(s => s.uid)).size;
    const activeSessions = sessions.filter(s => isSessionActive(s.lastActive)).length;
    
    // Calculate average duration
    let totalDuration = 0;
    let validDurations = 0;
    sessions.forEach(session => {
      const duration = calculateDuration(session.createdAt, session.lastActive);
      if (duration > 0) {
        totalDuration += duration;
        validDurations++;
      }
    });
    const avgDuration = validDurations > 0 ? Math.round(totalDuration / validDurations) : 0;
    
    // Device breakdown
    const deviceCounts = {};
    sessions.forEach(session => {
      const device = session.info?.device || 'unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });
    
    // Platform breakdown
    const platformCounts = {};
    sessions.forEach(session => {
      const platform = session.info?.platform || 'unknown';
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });
    
    return {
      totalSessions,
      uniqueUsers,
      activeSessions,
      avgDuration,
      deviceBreakdown: deviceCounts,
      platformBreakdown: platformCounts,
    };
    
  } catch (error) {
    console.error('Error getting analytics:', error);
    return null;
  }
};

/**
 * Session Manager Class
 * Use this to manage a user's session throughout their visit
 */
export class SessionManager {
  constructor(userId, userEmail = null) {
    this.userId = userId;
    this.userEmail = userEmail;
    this.sessionKey = null;
    this.activityInterval = null;
  }
  
  /**
   * Start a new session
   */
  async startSession() {
    try {
      this.sessionKey = await createSession(this.userId, this.userEmail);
      
      // Log initial page view
      await this.logEvent('session_start', {
        page: window.location.pathname,
        referrer: document.referrer,
      });
      
      // Start activity tracking (update every 5 minutes)
      this.startActivityTracking();
      
      // Store session key in localStorage for recovery
      localStorage.setItem('sessionKey', this.sessionKey);
      
      return this.sessionKey;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  }
  
  /**
   * Log an event
   */
  async logEvent(eventType, eventData = {}) {
    if (!this.sessionKey) {
      console.warn('No active session. Call startSession() first.');
      return;
    }
    
    try {
      await logEvent(this.sessionKey, eventType, eventData);
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }
  
  /**
   * Start tracking user activity
   */
  startActivityTracking() {
    // Update session activity every 5 minutes
    this.activityInterval = setInterval(() => {
      if (this.sessionKey) {
        updateSessionActivity(this.sessionKey);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  /**
   * Stop activity tracking
   */
  stopActivityTracking() {
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
  }
  
  /**
   * End the session
   */
  async endSession() {
    if (!this.sessionKey) return;
    
    try {
      // Log session end event
      await this.logEvent('session_end', {
        page: window.location.pathname,
      });
      
      // Stop activity tracking
      this.stopActivityTracking();
      
      // Clear session key from localStorage
      localStorage.removeItem('sessionKey');
      
      this.sessionKey = null;
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }
  
  /**
   * Resume an existing session from localStorage
   */
  resumeSession(sessionKey = null) {
    const key = sessionKey || localStorage.getItem('sessionKey');
    if (key) {
      this.sessionKey = key;
      this.startActivityTracking();
      updateSessionActivity(key);
      return true;
    }
    return false;
  }
}

export default {
  createSession,
  updateSessionActivity,
  logEvent,
  getUserSessions,
  getSessionLogs,
  getAllUserLogs,
  getSessionsByDateRange,
  getActiveSessions,
  getDeviceType,
  getDeviceInfo,
  getDateRange,
  formatEpochDate,
  calculateDuration,
  isSessionActive,
  getAnalytics,
  SessionManager,
};
