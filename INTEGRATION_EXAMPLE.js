/**
 * SESSION TRACKING INTEGRATION EXAMPLE
 * 
 * This file shows how to integrate the session tracking system
 * into your client application (NOT the admin dashboard).
 * 
 * Copy this code to your main client app.
 */

import { SessionManager } from './utils/userLogger';

// ============================================================
// EXAMPLE 1: React App with Authentication
// ============================================================

import { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth'; // Your auth hook

function App() {
  const { user } = useAuth(); // Your authentication state
  const [sessionManager, setSessionManager] = useState(null);

  // Initialize session when user logs in
  useEffect(() => {
    if (user) {
      const manager = new SessionManager(user.uid, user.email);
      
      // Try to resume existing session
      const resumed = manager.resumeSession();
      
      if (!resumed) {
        // No existing session, create new one
        manager.startSession();
      }
      
      setSessionManager(manager);
      
      // Log initial page view
      manager.logEvent('page_view', {
        page: window.location.pathname,
        referrer: document.referrer
      });
    } else {
      // User logged out, end session
      if (sessionManager) {
        sessionManager.endSession();
        setSessionManager(null);
      }
    }
    
    return () => {
      // Cleanup on unmount
      if (sessionManager) {
        sessionManager.stopActivityTracking();
      }
    };
  }, [user]);

  // Track page views
  useEffect(() => {
    if (sessionManager) {
      sessionManager.logEvent('page_view', {
        page: window.location.pathname,
        title: document.title
      });
    }
  }, [window.location.pathname, sessionManager]);

  return (
    <div>
      {/* Your app content */}
    </div>
  );
}

// ============================================================
// EXAMPLE 2: Next.js App Router Integration
// ============================================================

// In your layout.tsx or _app.js
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SessionManager } from '@/utils/userLogger';

let globalSessionManager = null;

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Initialize session
  useEffect(() => {
    if (user && !globalSessionManager) {
      globalSessionManager = new SessionManager(user.uid, user.email);
      globalSessionManager.startSession();
    } else if (!user && globalSessionManager) {
      globalSessionManager.endSession();
      globalSessionManager = null;
    }
  }, [user]);

  // Track page navigation
  useEffect(() => {
    if (globalSessionManager && pathname) {
      globalSessionManager.logEvent('page_view', {
        page: pathname,
        title: document.title
      });
    }
  }, [pathname]);

  return <html>{children}</html>;
}

// ============================================================
// EXAMPLE 3: Track Button Clicks
// ============================================================

import { useSession } from '@/hooks/useSession'; // Your session hook

function MyButton() {
  const { sessionManager } = useSession();

  const handleClick = () => {
    // Track the click
    sessionManager?.logEvent('button_click', {
      button: 'cta',
      label: 'Get Started',
      location: 'homepage'
    });
    
    // Your button logic
    console.log('Button clicked!');
  };

  return (
    <button onClick={handleClick}>
      Get Started
    </button>
  );
}

// ============================================================
// EXAMPLE 4: Track Form Submissions
// ============================================================

function ContactForm() {
  const { sessionManager } = useSession();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
      // Submit form
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      // Track successful submission
      sessionManager?.logEvent('form_submit', {
        form: 'contact',
        success: true,
        fields: Object.keys(data)
      });
      
    } catch (error) {
      // Track failed submission
      sessionManager?.logEvent('form_submit', {
        form: 'contact',
        success: false,
        error: error.message
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" />
      <input name="email" placeholder="Email" />
      <button type="submit">Submit</button>
    </form>
  );
}

// ============================================================
// EXAMPLE 5: Track Errors
// ============================================================

// Global error handler
window.addEventListener('error', (event) => {
  if (globalSessionManager) {
    globalSessionManager.logEvent('error', {
      type: 'javascript_error',
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack
    });
  }
});

// API error tracking
async function apiCall(endpoint, options) {
  try {
    const response = await fetch(endpoint, options);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
    
  } catch (error) {
    // Track API error
    globalSessionManager?.logEvent('api_error', {
      endpoint,
      method: options?.method || 'GET',
      status: error.status,
      message: error.message
    });
    
    throw error;
  }
}

// ============================================================
// EXAMPLE 6: Track User Journey (E-commerce)
// ============================================================

function ProductPage({ productId }) {
  const { sessionManager } = useSession();

  useEffect(() => {
    // Track product view
    sessionManager?.logEvent('product_view', {
      productId,
      category: 'electronics',
      price: 299.99
    });
  }, [productId]);

  const handleAddToCart = () => {
    // Track add to cart
    sessionManager?.logEvent('add_to_cart', {
      productId,
      quantity: 1,
      price: 299.99
    });
  };

  const handleAddToWishlist = () => {
    // Track wishlist addition
    sessionManager?.logEvent('add_to_wishlist', {
      productId
    });
  };

  return (
    <div>
      <button onClick={handleAddToCart}>Add to Cart</button>
      <button onClick={handleAddToWishlist}>Add to Wishlist</button>
    </div>
  );
}

function CheckoutPage() {
  const { sessionManager } = useSession();

  const handleCheckout = async () => {
    const startTime = Date.now();
    
    try {
      // Process checkout
      await processPayment();
      
      const duration = Date.now() - startTime;
      
      // Track successful checkout
      sessionManager?.logEvent('checkout_complete', {
        total: 299.99,
        items: 1,
        duration,
        paymentMethod: 'credit_card',
        success: true
      });
      
    } catch (error) {
      // Track failed checkout
      sessionManager?.logEvent('checkout_complete', {
        total: 299.99,
        items: 1,
        success: false,
        error: error.message
      });
    }
  };

  return (
    <button onClick={handleCheckout}>Complete Purchase</button>
  );
}

// ============================================================
// EXAMPLE 7: Track Search Behavior
// ============================================================

function SearchBar() {
  const { sessionManager } = useSession();
  const [query, setQuery] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    
    const startTime = Date.now();
    
    // Perform search
    const results = await searchAPI(query);
    
    const duration = Date.now() - startTime;
    
    // Track search
    sessionManager?.logEvent('search', {
      query,
      resultCount: results.length,
      duration,
      hasResults: results.length > 0
    });
  };

  return (
    <form onSubmit={handleSearch}>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <button type="submit">Search</button>
    </form>
  );
}

// ============================================================
// EXAMPLE 8: Track Feature Usage
// ============================================================

function ExportButton({ data }) {
  const { sessionManager } = useSession();

  const handleExport = () => {
    const startTime = Date.now();
    
    // Export data to CSV
    exportToCSV(data);
    
    const duration = Date.now() - startTime;
    
    // Track export
    sessionManager?.logEvent('feature_used', {
      feature: 'export_csv',
      recordCount: data.length,
      duration,
      format: 'csv'
    });
  };

  return (
    <button onClick={handleExport}>Export to CSV</button>
  );
}

function FilterPanel({ onFilter }) {
  const { sessionManager } = useSession();

  const handleApplyFilter = (filterType, value) => {
    // Apply filter
    onFilter(filterType, value);
    
    // Track filter usage
    sessionManager?.logEvent('feature_used', {
      feature: 'apply_filter',
      filterType,
      value: typeof value === 'object' ? JSON.stringify(value) : value
    });
  };

  return (
    <div>
      <button onClick={() => handleApplyFilter('date', 'last_7_days')}>
        Last 7 Days
      </button>
      <button onClick={() => handleApplyFilter('status', 'active')}>
        Active Only
      </button>
    </div>
  );
}

// ============================================================
// EXAMPLE 9: Custom Hook for Session Management
// ============================================================

// hooks/useSession.js
import { createContext, useContext, useEffect, useState } from 'react';
import { SessionManager } from '@/utils/userLogger';
import { useAuth } from './useAuth';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { user } = useAuth();
  const [sessionManager, setSessionManager] = useState(null);

  useEffect(() => {
    if (user) {
      const manager = new SessionManager(user.uid, user.email);
      const resumed = manager.resumeSession();
      
      if (!resumed) {
        manager.startSession();
      }
      
      setSessionManager(manager);
      
      return () => {
        manager.stopActivityTracking();
      };
    } else {
      if (sessionManager) {
        sessionManager.endSession();
        setSessionManager(null);
      }
    }
  }, [user]);

  return (
    <SessionContext.Provider value={{ sessionManager }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}

// Usage in _app.js or layout
function App({ Component, pageProps }) {
  return (
    <SessionProvider>
      <Component {...pageProps} />
    </SessionProvider>
  );
}

// ============================================================
// EXAMPLE 10: Track Time on Page
// ============================================================

function ArticlePage({ articleId }) {
  const { sessionManager } = useSession();
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Track when component mounts
    sessionManager?.logEvent('article_view_start', {
      articleId,
      timestamp: startTime
    });

    // Track when component unmounts (user leaves)
    return () => {
      const timeSpent = Date.now() - startTime;
      
      sessionManager?.logEvent('article_view_end', {
        articleId,
        timeSpent,
        readPercentage: calculateReadPercentage() // Your scroll tracking logic
      });
    };
  }, [articleId]);

  return (
    <article>
      {/* Article content */}
    </article>
  );
}

// ============================================================
// EXAMPLE 11: Track Video Playback
// ============================================================

function VideoPlayer({ videoId }) {
  const { sessionManager } = useSession();
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      sessionManager?.logEvent('video_play', {
        videoId,
        currentTime: video.currentTime,
        duration: video.duration
      });
    };

    const handlePause = () => {
      sessionManager?.logEvent('video_pause', {
        videoId,
        currentTime: video.currentTime,
        duration: video.duration
      });
    };

    const handleEnded = () => {
      sessionManager?.logEvent('video_complete', {
        videoId,
        duration: video.duration
      });
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoId]);

  return <video ref={videoRef} src={`/videos/${videoId}.mp4`} />;
}

// ============================================================
// EXAMPLE 12: Track User Preferences
// ============================================================

function SettingsPage() {
  const { sessionManager } = useSession();

  const handleThemeChange = (theme) => {
    // Apply theme
    applyTheme(theme);
    
    // Track preference change
    sessionManager?.logEvent('preference_change', {
      setting: 'theme',
      value: theme,
      previousValue: localStorage.getItem('theme')
    });
    
    localStorage.setItem('theme', theme);
  };

  const handleLanguageChange = (language) => {
    // Apply language
    changeLanguage(language);
    
    // Track preference change
    sessionManager?.logEvent('preference_change', {
      setting: 'language',
      value: language,
      previousValue: localStorage.getItem('language')
    });
    
    localStorage.setItem('language', language);
  };

  return (
    <div>
      <select onChange={(e) => handleThemeChange(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      
      <select onChange={(e) => handleLanguageChange(e.target.value)}>
        <option value="en">English</option>
        <option value="es">Spanish</option>
      </select>
    </div>
  );
}

// ============================================================
// NOTES & BEST PRACTICES
// ============================================================

/**
 * BEST PRACTICES:
 * 
 * 1. Session Lifecycle
 *    - Create session on login
 *    - Update activity periodically (every 5 min)
 *    - End session on logout
 *    - Store session key in localStorage for recovery
 * 
 * 2. Event Naming
 *    - Use snake_case: 'button_click', 'page_view'
 *    - Be descriptive: 'checkout_complete' not just 'checkout'
 *    - Be consistent across your app
 * 
 * 3. Event Data
 *    - Keep it small and structured
 *    - Don't log sensitive data (passwords, tokens)
 *    - Include relevant context (page, location, etc.)
 *    - Use consistent field names
 * 
 * 4. Performance
 *    - Batch similar events when possible
 *    - Don't log too frequently (debounce if needed)
 *    - Handle errors gracefully
 *    - Don't block user interactions
 * 
 * 5. Privacy
 *    - Anonymize sensitive data
 *    - Comply with GDPR/privacy laws
 *    - Allow users to opt-out
 *    - Don't track unnecessary data
 */

/**
 * COMMON EVENT TYPES:
 * 
 * - page_view: User navigates to a page
 * - button_click: User clicks a button
 * - form_submit: User submits a form
 * - search: User performs a search
 * - product_view: User views a product
 * - add_to_cart: User adds item to cart
 * - checkout_start: User begins checkout
 * - checkout_complete: User completes purchase
 * - error: An error occurs
 * - feature_used: User uses a specific feature
 * - preference_change: User changes a setting
 * - video_play: User plays a video
 * - article_read: User reads an article
 * - share_content: User shares content
 * - download: User downloads a file
 * - signup: User creates an account
 * - login: User logs in
 * - logout: User logs out
 */

export {};
