# Installation Guide for Orders & Payment Dashboard

## 📦 Required Dependencies

To use the new Orders & Payment Dashboard, you need to install the following packages:

```bash
# Using Yarn (recommended)
yarn add @tanstack/react-table lucide-react tailwindcss@^3.4.0 autoprefixer postcss

# OR using npm
npm install @tanstack/react-table lucide-react tailwindcss@^3.4.0 autoprefixer postcss --save --legacy-peer-deps
```

## 🔧 What's Been Set Up

The following files have been created/configured:

1. **`tailwind.config.js`** - Tailwind CSS configuration
2. **`postcss.config.js`** - PostCSS configuration
3. **`styles/globals.css`** - Global styles with Tailwind directives
4. **`pages/_app.js`** - Updated to import global styles
5. **`pages/flipkart-tools/orders-report.js`** - Complete dashboard component

## 🚀 Usage

### 1. Install Dependencies

Run the installation command above with proper permissions. If you encounter permission errors:

```bash
# Fix node_modules permissions
sudo chown -R $(whoami) node_modules
# Then retry installation
yarn add @tanstack/react-table lucide-react tailwindcss autoprefixer postcss
```

### 2. Access the Dashboard

Navigate to: `http://localhost:3000/flipkart-tools/orders-report`

### 3. Upload Files

The dashboard accepts three Excel files:

#### **Order Sheet** (Required)
- Tab name: "Orders"
- Should contain columns:
  - `Order_ID` or `order_id`
  - `Order_Item_Status`
  - `SKU`
  - `Product_Title`
  - `Quantity`
  - `Return_Reason`
  - `Return_Sub_Reason`

#### **Payment Sheet 1** (Optional)
- Tab name: "Orders"
- Special formatting:
  - Row 1: Skipped (usually empty or title)
  - Row 2 + Row 3: Merged to form headers
  - Row 4+: Data rows
- Should contain:
  - Order ID column (any variation: `Order ID`, `Order_ID`, `order_id`)
  - Settlement Amount column (any variation: `Settlement Amount`, `Total Settlement`, `Amount`)

#### **Payment Sheet 2** (Optional)
- Same format as Payment Sheet 1

### 4. Features

✅ **Upload & Parse**
- Drag-and-drop Excel file uploads
- Automatic parsing with custom header handling for payment sheets

✅ **Data Consolidation**
- Merges payment data from both sheets
- Maps payments to orders by Order ID
- Calculates total settlement per order

✅ **Advanced Filtering**
- Search by Order ID
- Filter by Status, SKU, Product Title, Return Reason
- Real-time filtered results

✅ **Data Table**
- Sortable columns
- Pagination (25, 50, 100, 200 rows per page)
- Responsive design
- Total settlement calculation for visible rows

## 🎨 Styling

The dashboard uses:
- **Tailwind CSS** for utility-first styling
- **lucide-react** for modern icons
- **@tanstack/react-table** for powerful table features

## 🐛 Troubleshooting

### Permission Errors During Installation

If you get `EACCES` errors:

```bash
# Option 1: Fix permissions
sudo chown -R $(whoami) /Users/vikram/admin.theecomway.com/node_modules

# Option 2: Clear cache and retry
rm -rf node_modules
rm yarn.lock  # or package-lock.json
yarn install  # or npm install
```

### Tailwind Styles Not Working

1. Make sure the packages are installed
2. Restart the dev server: `yarn dev` or `npm run dev`
3. Clear Next.js cache: `rm -rf .next`

### Payment Sheet Headers Not Parsing

The dashboard handles various column name formats:
- Order ID variations: `Order ID`, `Order_ID`, `order_id`, `OrderID`
- Settlement variations: `Settlement Amount`, `Total Settlement`, `Amount`

If your sheet uses different names, you may need to update the parsing logic in the `parsePaymentSheet` and `handleProcessFiles` functions.

## 📊 Column Mapping

The dashboard intelligently maps various column name formats:

**Order Sheet:**
```
Order_ID → Order_ID, order_id, OrderID, Order ID
Order_Item_Status → Order_Item_Status, order_item_status
SKU → SKU, sku
Product_Title → Product_Title, product_title, Product Title
Quantity → Quantity, quantity
Return_Reason → Return_Reason, return_reason, Return Reason
Return_Sub_Reason → Return_Sub_Reason, return_sub_reason, Return Sub Reason
```

**Payment Sheets:**
```
Order ID → Order ID, Order_ID, order_id, OrderID
Settlement → Settlement Amount, Settlement_Amount, Total Settlement, Amount
```

## 💡 Tips

1. **Large Files**: The dashboard can handle up to 50,000 rows in the order sheet
2. **Performance**: Use pagination for better performance with large datasets
3. **Export**: You can add export functionality by installing `xlsx` (already installed)
4. **Filters**: Combine multiple filters for precise data analysis
5. **Settlement Calculation**: Total settlement updates automatically as you filter

## 🔗 Dependencies Explained

- **@tanstack/react-table** (v8.x) - Modern table library with sorting, filtering, pagination
- **lucide-react** - Clean, customizable icon library
- **tailwindcss** - Utility-first CSS framework
- **autoprefixer** - PostCSS plugin to parse CSS and add vendor prefixes
- **postcss** - CSS transformation tool required by Tailwind

## 📝 Notes

- The dashboard works entirely client-side (no backend needed)
- Excel parsing uses the `xlsx` package (already installed)
- Order IDs are normalized (trimmed, lowercased) for matching
- Settlement amounts are summed across both payment sheets
- Orders without payment data show ₹0.00 settlement

---

Happy analyzing! 🎉

