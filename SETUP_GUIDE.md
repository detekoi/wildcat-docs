# Wildcat.chat Domain Setup Guide

This guide walks you through setting up all custom domains for the Wildcat.chat platform.

## Current Status

✅ **app.wildcat.chat** - ChatSage Web UI (already configured)
✅ **wildcat.chat** - Root domain (already configured)

## Domains to Configure

### 1. TTS Web UI: `tts.wildcat.chat`

**Project:** chatvibestts
**Path:** `/Users/henry/Dev/chatvibes-web-ui`

#### Steps:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project **chatvibestts**
3. Navigate to **Hosting** → **Add custom domain**
4. Enter domain: `tts.wildcat.chat`
5. Firebase will provide a **CNAME record**. Example:
   ```
   Host: tts
   Value: chatvibestts.web.app.
   ```
6. Add this CNAME record in Namecheap:
   - Go to Namecheap → Domain List → wildcat.chat → Advanced DNS
   - Add Record:
     - Type: **CNAME**
     - Host: **tts**
     - Value: **(paste the value from Firebase)**
     - TTL: **Automatic**
7. Wait for DNS propagation (5-60 minutes)
8. Click **Verify** in Firebase Console
9. Wait for SSL certificate provisioning (can take up to 24 hours)

---

### 2. Documentation: `docs.wildcat.chat`

**Project:** wildcat-docs (separate Firebase project)
**Path:** `/Users/henry/Dev/wildcat-docs`

#### Steps:

1. Deploy the docs site:
   ```bash
   cd /Users/henry/Dev/wildcat-docs
   firebase deploy --only hosting
   ```

2. Add custom domain in Firebase Console:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select project: **wildcat-docs**
   - Navigate to Hosting → **Add custom domain**
   - Enter: `docs.wildcat.chat`

3. Firebase will provide a CNAME record like:
   ```
   Host: docs
   Value: wildcat-docs.web.app.
   ```

4. Add this CNAME record to Namecheap:
   - Namecheap → Domain List → wildcat.chat → Advanced DNS
   - Add Record:
     - Type: **CNAME**
     - Host: **docs**
     - Value: **wildcat-docs.web.app.**
     - TTL: **Automatic**

5. Wait for verification and SSL provisioning

---

### 3. API: `api.wildcat.chat`

**Purpose:** Unified API endpoint for both ChatSage and ChatVibes

#### Option A: Firebase Hosting Rewrite (Recommended for now)

Since your APIs are already in Firebase Functions, use a hosting rewrite:

1. Create a new Firebase Hosting site:
   ```bash
   cd /Users/henry/Dev/chatsage-web-ui
   firebase hosting:sites:create wildcat-api
   ```

2. Update `firebase.json` to add a new hosting config:
   ```json
   {
     "hosting": [
       {
         "target": "app",
         "public": "public",
         "rewrites": [...]
       },
       {
         "target": "api",
         "public": "public",
         "rewrites": [
           {
             "source": "/**",
             "function": "webUi"
           }
         ]
       }
     ]
   }
   ```

3. Update `.firebaserc`:
   ```json
   {
     "projects": {
       "default": "streamsage-bot"
     },
     "targets": {
       "streamsage-bot": {
         "hosting": {
           "app": ["streamsage-bot"],
           "api": ["wildcat-api"]
         }
       }
     }
   }
   ```

4. Deploy:
   ```bash
   firebase deploy --only hosting:api
   ```

5. Add custom domain `api.wildcat.chat` in Firebase Console → Hosting

#### Option B: Cloud Run (More scalable, separate from Firebase)

1. Create a standalone Express app that imports your function code
2. Deploy to Cloud Run
3. Map custom domain

(Detailed steps available if you choose this option)

---

### 4. Authentication: `auth.wildcat.chat`

**Purpose:** Separate authentication endpoint

#### Recommended Approach:

Since auth is already handled in your Firebase Functions (both projects have auth routes), you can:

1. **Use the same function** as API but with a different domain
2. Or create a **dedicated auth function** and deploy it separately

#### Steps (using Firebase Hosting rewrite):

Same as API option A above, but:
- Site name: `wildcat-auth`
- Domain: `auth.wildcat.chat`
- Rewrite to the same `webUi` function (it already handles `/auth` routes)

---

## DNS Records Summary

After all setup, your Namecheap DNS should have:

```
Type      Host    Value                           TTL
A         @       199.36.158.100                  30 min
CNAME     app     streamsage-bot.web.app.        Automatic
CNAME     tts     chatvibestts.web.app.          Automatic
CNAME     docs    (from Firebase Console)         Automatic
CNAME     api     (from Firebase Console)         Automatic
CNAME     auth    (from Firebase Console)         Automatic
```

---

## Environment Variables & Secrets

Update your functions to use the new domains:

### ChatSage Web UI (`/Users/henry/Dev/chatsage-web-ui/functions/.env`)
```bash
CALLBACK_URL=https://auth.wildcat.chat/callback
FRONTEND_URL=https://app.wildcat.chat
```

### ChatVibes Web UI (`/Users/henry/Dev/chatvibes-web-ui/functions/.env`)
```bash
CALLBACK_URL=https://auth.wildcat.chat/callback
FRONTEND_URL=https://tts.wildcat.chat
```

Update these in:
1. Local `.env` files
2. Firebase Functions config (via Secret Manager or functions:config:set)
3. Twitch Developer Console OAuth redirect URIs

---

## Twitch Developer Console Updates

Update your Twitch app OAuth redirect URIs:

1. Go to [Twitch Dev Console](https://dev.twitch.tv/console/apps)
2. Edit your app(s)
3. Add/update OAuth Redirect URLs:
   ```
   https://auth.wildcat.chat/callback
   https://auth.wildcat.chat/auth/callback
   https://app.wildcat.chat/callback
   https://tts.wildcat.chat/callback
   ```

---

## Testing

After DNS propagation and SSL provisioning:

```bash
# Test API
curl https://api.wildcat.chat/health

# Test Auth (should redirect to Twitch)
curl -I https://auth.wildcat.chat/auth/login

# Test TTS UI
open https://tts.wildcat.chat

# Test Docs
open https://docs.wildcat.chat
```

---

## Troubleshooting

### DNS not propagating
```bash
# Check DNS propagation
dig tts.wildcat.chat CNAME +short
dig docs.wildcat.chat CNAME +short
```

### SSL certificate errors
- Wait up to 24 hours for Firebase to provision certificates
- Hard refresh browser (Cmd+Shift+R)
- Try incognito mode
- Check Firebase Console → Hosting for status

### 404 errors
- Verify rewrites in `firebase.json`
- Check function deployment: `firebase functions:list`
- Check function logs: `firebase functions:log`

---

## Next Steps

1. **CORS Configuration:** Update CORS settings in functions to allow new domains
2. **Cookie Domains:** Update cookie domain to `.wildcat.chat`
3. **Analytics:** Set up Firebase Analytics for each domain
4. **Monitoring:** Set up uptime monitoring for all endpoints
5. **CI/CD:** Update deployment scripts to deploy to correct hosting targets

