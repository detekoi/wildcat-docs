# Wildcat Documentation Site

This is the documentation site for the Wildcat platform.

## Structure

```
wildcat-docs/
├── public/           # Static files served by Firebase Hosting
│   ├── index.html   # Main documentation page
│   └── styles.css   # Styling
├── src/             # Source files for documentation (add markdown, etc.)
├── firebase.json    # Firebase Hosting configuration
└── .firebaserc      # Firebase project configuration
```

## Development

To preview locally:
```bash
firebase emulators:start --only hosting
```

## Deployment

To deploy to Firebase Hosting:
```bash
firebase deploy --only hosting
```

## Adding Custom Domain

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your desired domain (e.g., `docs.yourdomain.com`)
4. Follow instructions to add DNS records to your domain provider

## Adding Documentation

You can add additional documentation pages by:

1. Creating new HTML files in `public/`
2. Adding links to them in `index.html`
3. Or integrate a documentation framework like:
   - Docusaurus
   - VuePress
   - MkDocs
   - Docsify

## Future Enhancements

- Add API documentation with interactive examples
- Add tutorials and guides
- Add video tutorials
- Add search functionality
- Add dark mode toggle
