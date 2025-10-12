#!/bin/bash

# Fix permissions on the entire directory
echo "Fixing directory permissions..."
sudo chown -R $(whoami) .

# Install dependencies
echo "Installing dashboard dependencies..."
yarn add @tanstack/react-table lucide-react tailwindcss@3.4.1 autoprefixer@10.4.19 postcss@8.4.38

echo ""
echo "✅ Installation complete!"
echo ""
echo "Now restart your dev server:"
echo "  yarn dev"
echo ""
echo "Then navigate to: http://localhost:3000/flipkart-tools/orders-report"

