#!/bin/bash
# Quick deployment script for Wildcat.chat docs

set -e

echo "🐱 Deploying Wildcat.chat Documentation..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Run: firebase login"
    exit 1
fi

# Deploy to Firebase Hosting
echo "📦 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo "📄 Visit your docs at: https://docs.wildcat.chat (after DNS setup)"
