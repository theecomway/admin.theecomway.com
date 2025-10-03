# Admin Dashboard Layout

This project now includes a complete admin dashboard layout with:

## Features

### 🎨 **Modern UI Layout**
- Responsive sidebar navigation
- Clean header with authentication
- Material-UI components throughout
- Mobile-friendly design

### 🔐 **Authentication Integration**
- Google Sign-In/Sign-Out functionality
- User email display in header
- User avatar with dropdown menu
- Protected routes (ready for implementation)

### 📱 **Responsive Design**
- Collapsible sidebar on mobile
- Touch-friendly navigation
- Optimized for all screen sizes

### 🗂️ **Organized Navigation**
- Grouped menu items by category
- Expandable sections for related tools
- Active page highlighting
- Breadcrumb-style navigation

## File Structure

```
components/
├── Layout.js          # Main layout wrapper
├── Sidebar.js         # Navigation sidebar
└── Header.js          # Top header with auth

App.js                 # Main app with routing
src/index.js           # React entry point
```

## Usage

The layout automatically wraps all your existing pages. Your pages don't need to be modified - they'll automatically get the sidebar and header.

## Navigation Structure

- **Dashboard** - Main landing page
- **Analytics** - Event tracking and user analytics
  - Event Summary
  - Filtered Events  
  - User Logs
- **Amazon Tools** - Amazon seller tools
  - Auth
  - Merge Orders Reports
  - Orders Breakdown
  - Payments Breakdown
- **Flipkart Tools** - Flipkart seller tools
  - Dashboard
  - Orders Report
- **Files** - File management
  - Storage Explorer
- **Other Tools** - Various utilities
  - Search
  - Coupon Manager
  - Fake Meesho Labels
  - Fake Simulator
  - OTP Fails
  - Plan Reminders
  - User Plans

## Getting Started

1. Make sure your Firebase configuration is set up in `.env`
2. Run `npm start` or `yarn start`
3. The app will load with the new layout
4. Sign in with Google to see your email in the header

## Customization

- **Theme**: Modify the theme in `App.js`
- **Colors**: Update the palette in the theme object
- **Navigation**: Add/remove items in `Sidebar.js`
- **Header**: Customize the header in `Header.js`
