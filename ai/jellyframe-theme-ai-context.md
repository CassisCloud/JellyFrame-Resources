# JellyFrame Theme Builder - AI Context Document

JellyFrame is a Jellyfin customization framework. Themes are entries in a `themes.json` array hosted publicly over HTTPS. This document is the complete reference. Do not invent APIs or fields.

---

## Project context

- Plugin: Jellyfin.Plugin.JellyFrame
- Jellyfin version: 10.11+
- Official theme repository: https://cdn.jsdelivr.net/gh/Jellyfin-PG/JellyFrame-Resources@main/themes.json
- Official mod repository: https://cdn.jsdelivr.net/gh/Jellyfin-PG/JellyFrame-Resources@main/mods.json

---

## What a theme is

A theme is one entry in a `themes.json` array. It is CSS-only - no JS, no server code. Only one theme can be active at a time. Themes support:
- A base CSS file (`cssUrl`)
- User-configurable variables (`vars`)
- Optional addon stylesheets (`addons`) that can be toggled by the user

---

## themes.json - complete schema

```json
{
  "id": "my-theme",
  "name": "My Theme",
  "author": "yourname",
  "description": "A clean dark theme.",
  "version": "1.0.0",
  "jellyfin": "10.10+",
  "tags": ["dark", "minimal"],
  "previewUrl": "https://example.com/preview.png",
  "sourceUrl": "https://github.com/yourname/my-theme",
  "cssUrl": "https://cdn.example.com/my-theme/theme.css",
  "preconnect": ["https://fonts.googleapis.com", "https://fonts.gstatic.com"],
  "vars": [
    {
      "key": "ACCENT_COLOR",
      "name": "Accent Color",
      "description": "Primary highlight color.",
      "type": "color",
      "default": "#00a4dc",
      "allowGradient": false
    },
    {
      "key": "FONT_SIZE",
      "name": "Font Size",
      "type": "number",
      "default": "14"
    },
    {
      "key": "LABEL",
      "name": "Label",
      "type": "text",
      "default": "My Label"
    },
    {
      "key": "ENABLE_BLUR",
      "name": "Enable Blur",
      "type": "boolean",
      "default": "false"
    }
  ],
  "addons": [
    {
      "id": "blur-addon",
      "name": "Frosted Glass",
      "description": "Backdrop blur on the drawer, header, and dialogs.",
      "cssUrl": "https://cdn.example.com/my-theme/addon-blur.css",
      "triggerVar": "ENABLE_BLUR"
    },
    {
      "id": "rounded-addon",
      "name": "Extra Rounded",
      "description": "Stronger corner rounding everywhere.",
      "cssUrl": "https://cdn.example.com/my-theme/addon-rounded.css"
    }
  ]
}
```

---

## Field rules

- `id` - unique lowercase kebab-case slug. Changing it creates a brand-new theme.
- `version` - ALWAYS bump when changing any CSS file. Without a bump users get stale files.
- `cssUrl` - required. The base stylesheet URL.
- `preconnect` - optional. Origins for DNS prefetch / TCP preconnect injected into <head>. Omit if not needed.
- `vars[].key` - SCREAMING_SNAKE_CASE. Referenced as {{KEY}} in CSS files.
- `vars[].type` - "text" | "number" | "color" | "boolean". Default: "text".
- `vars[].default` - always a string even for number and boolean types.
- `vars[].allowGradient` - color type only. When true, the color picker shows gradient mode producing a full CSS gradient string.
- `addons[].triggerVar` - key of a boolean var. Addon included when that var is "true". If omitted, addon is opt-in via a toggle in the configure dialog (default off, stored as __addon__{id} in ThemeVars).

---

## Variable substitution

Write {{KEY}} anywhere in the base cssUrl or any addon cssUrl file. JellyFrame replaces every occurrence server-side with the user's saved value (or the default) before caching and delivery.

```css
:root {
  --accent: {{ACCENT_COLOR}};
  --font-size: {{FONT_SIZE}}px;
}

.raised {
  background: var(--accent) !important;
}
```

There is NO automatic :root {} CSS custom property emission. If you want CSS variables available throughout the stylesheet, declare them yourself in :root {} using {{KEY}} substitution as shown above.

---

## Injection mechanics

- Preconnect hints (<link rel="preconnect"> and <link rel="dns-prefetch">) are injected into <head>.
- The theme <link rel="stylesheet"> is injected just before </body> - AFTER Jellyfin's own dark theme. This ensures correct CSS cascade order so your theme overrides Jellyfin's base styles.
- Injected stylesheet URL: /JellyFrame/themes/{id}/compiled.css?v={hash}
- The ?v={hash} changes automatically when vars change, busting the browser cache.

---

## Disk cache key

Theme base CSS:
```
{id}__{version}__css__{varsHash}.css
```

Addon CSS:
```
{id}--{addonId}__{version}__addon__{varsHash}.css
```

- Changing version invalidates ALL cached files for the theme.
- Changing a var value changes varsHash and invalidates compiled files.
- After purging: update manifest version AND save config first - otherwise re-download reuses old filename.

---

## Addon behavior

Addons are separate CSS files appended after the base stylesheet, in manifest order. They receive the same {{KEY}} var substitution.

Two addon modes:

1. With triggerVar (boolean toggle):
   - Declare a boolean var with the same key as triggerVar
   - Addon is included when that var is "true"
   - The UI shows a pill toggle linked to that var
   - Theme author controls the default in vars[].default

2. Without triggerVar (opt-in toggle):
   - Addon is shown in the UI as a toggle, default OFF
   - State stored as "__addon__{addonId}" in ThemeVars
   - User must explicitly enable it
   - On the server: checked against synthetic key "__addon__{id}"

The theme CSS author writes nothing special for addon integration. Just write a normal CSS file. JellyFrame handles all the include/exclude logic based on the manifest.

---

## How to use vars in CSS

{{KEY}} substitution is a simple string replace. Use it anywhere in CSS:

```css
/* Direct value substitution */
body {
  background: {{BACKGROUND_COLOR}};
  color: {{TEXT_COLOR}};
  font-size: {{FONT_SIZE}}px;
}

/* As CSS custom property (recommended for reuse) */
:root {
  --accent:     {{ACCENT_COLOR}};
  --bg:         {{BACKGROUND_COLOR}};
  --text:       {{TEXT_COLOR}};
  --radius:     {{CARD_RADIUS}};
  --font-size:  {{FONT_SIZE}}px;
}

/* Boolean var substitution */
/* If trueValue="block" and falseValue="none": */
.my-widget {
  display: {{SHOW_WIDGET}};
}

/* Color with gradient support (allowGradient: true) */
.hero-bg {
  background: {{HERO_GRADIENT}};
}
/* User can enter: #ff0000  OR  linear-gradient(135deg, #ff0000, #0000ff) */
```

---

## Jellyfin DOM structure - key selectors

These selectors exist in Jellyfin's rendered HTML and are safe to target:

Navigation drawer:
```css
.mainDrawer              /* the whole left drawer */
.mainDrawer-scrollContainer
.navMenuOption           /* individual nav items */
.navMenuOptionIcon       /* material icon inside nav item */
.navMenuOptionText       /* text label inside nav item */
.sidebarHeader           /* section headers (Media, Administration, User) */
.customMenuOptions       /* empty div for custom injected items */
.libraryMenuOptions      /* library section */
.adminMenuOptions        /* admin section */
.userMenuOptions         /* user section */
```

Header:
```css
.skinHeader              /* top header bar */
.skinHeader-withBackground
.skinHeader-blurred
.headerTop               /* flex row inside header */
.headerLeft              /* left side of header */
.headerRight             /* right side of header */
.headerButton            /* individual header icon buttons */
.headerTabs              /* tab bar below header */
.sectionTabs
```

Home page:
```css
.homePage
.homeSectionsContainer
.verticalSection         /* each row section */
.sectionTitle            /* section heading */
.sectionTitleContainer
.emby-scroller-container
.itemsContainer          /* grid/row of cards */
```

Cards:
```css
.card                    /* base card */
.overflowPortraitCard    /* portrait ratio card (movies) */
.overflowBackdropCard    /* backdrop ratio card (libraries) */
.cardBox
.cardScalable
.cardImageContainer      /* image area */
.cardText                /* text below card */
.cardText-first          /* primary title */
.cardText-secondary      /* secondary text (year etc) */
.cardOverlayContainer    /* overlay buttons */
.cardOverlayButton       /* individual overlay button */
```

Media detail page:
```css
.detailPageContent
.detailImageContainer
.itemDetailPage
.mainDetailButtons       /* Play, Trailer, etc buttons */
.overview
.itemMiscInfo
.episodeList
```

Player:
```css
.videoPlayerContainer
.videoOsdBottom
.videoOsdTop
.btnHeaderBack           /* back button in player header */
.videoOsdBack            /* back button in OSD */
.progressring
```

Dialogs and overlays:
```css
.dialogContainer
.dialog
.dialogHeader
.dialogContent
.dialogFooter
```

Common UI elements:
```css
.emby-input              /* text inputs */
.emby-button             /* buttons */
.raised                  /* primary action buttons */
.button-submit           /* submit/confirm buttons */
.emby-select             /* select dropdowns */
.backgroundContainer     /* page backdrop image container */
.backdropContainer
```

---

## CSS specificity notes

- Jellyfin uses !important in several places. To override, you also need !important.
- Jellyfin loads its dark theme via a <link> at the end of <body>. JellyFrame injects your theme AFTER that, so same-specificity rules cascade correctly.
- Material Icons are loaded by Jellyfin: `<span class="material-icons">icon_name</span>`
- Jellyfin uses CSS custom properties extensively. Safe to override --color-header-background, --theme-custom-color etc.

---

## @import for fonts

Use @import at the top of your CSS file to load external fonts:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

:root {
  --font-family: 'Inter', system-ui, sans-serif;
}

body, .emby-input, .emby-button {
  font-family: var(--font-family) !important;
}
```

If you use Google Fonts, add preconnect to your manifest:
```json
"preconnect": ["https://fonts.googleapis.com", "https://fonts.gstatic.com"]
```

---

## Complete working example

themes.json:
```json
[
  {
    "id": "my-dark-theme",
    "name": "My Dark Theme",
    "author": "yourname",
    "description": "A configurable dark theme.",
    "version": "1.0.0",
    "jellyfin": "10.10+",
    "tags": ["dark", "configurable"],
    "previewUrl": "",
    "sourceUrl": "https://github.com/yourname/my-dark-theme",
    "cssUrl": "https://cdn.jsdelivr.net/gh/yourname/my-dark-theme@main/theme.css",
    "preconnect": ["https://fonts.googleapis.com", "https://fonts.gstatic.com"],
    "vars": [
      {
        "key": "ACCENT_COLOR",
        "name": "Accent Color",
        "description": "Applied to buttons, links, and highlights.",
        "type": "color",
        "default": "#00a4dc"
      },
      {
        "key": "BACKGROUND_COLOR",
        "name": "Background Color",
        "description": "Main page background.",
        "type": "color",
        "default": "#0e0e14"
      },
      {
        "key": "CARD_RADIUS",
        "name": "Card Radius",
        "description": "Corner radius for media cards.",
        "type": "text",
        "default": "8px"
      },
      {
        "key": "ENABLE_BLUR",
        "name": "Frosted Glass",
        "description": "Adds backdrop blur to the header and drawer.",
        "type": "boolean",
        "default": "false"
      }
    ],
    "addons": [
      {
        "id": "blur",
        "name": "Frosted Glass",
        "description": "Backdrop blur on header and navigation drawer.",
        "cssUrl": "https://cdn.jsdelivr.net/gh/yourname/my-dark-theme@main/addon-blur.css",
        "triggerVar": "ENABLE_BLUR"
      }
    ]
  }
]
```

theme.css:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

:root {
  --accent:     {{ACCENT_COLOR}};
  --bg:         {{BACKGROUND_COLOR}};
  --radius:     {{CARD_RADIUS}};
}

body {
  background: var(--bg) !important;
  font-family: 'Inter', system-ui, sans-serif !important;
}

.raised, .button-submit {
  background: var(--accent) !important;
}

.card .cardBox {
  border-radius: var(--radius) !important;
}

.emby-input:focus {
  border-color: var(--accent) !important;
}

.headerTabs .emby-tab-button-active {
  color: var(--accent) !important;
  border-bottom-color: var(--accent) !important;
}
```

addon-blur.css:
```css
.skinHeader-withBackground {
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  background: rgba(0, 0, 0, 0.6) !important;
}

.mainDrawer {
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  background: rgba(0, 0, 0, 0.5) !important;
}
```

---

## Hard rules - never break these

1. Always bump version when changing any CSS file.
2. No {{KEY}} substitution is available in serverJs - themes have no server component.
3. No automatic CSS custom property emission - declare :root {} yourself using {{KEY}}.
4. The theme stylesheet loads AFTER Jellyfin's dark theme - use this to your advantage for cascade order.
5. Preconnect hints go in <head>, stylesheet goes before </body> - this is handled by JellyFrame automatically.
6. Do not use "version": "latest" - it never invalidates the cache.
7. Assets must be HTTPS with Access-Control-Allow-Origin: *.
8. Addons without triggerVar are opt-in (default off). Users enable them in the configure dialog.
9. Addon CSS receives the same {{KEY}} substitution as the base sheet.
10. After cache purge, update manifest version AND save config first - otherwise re-download reuses old filename.
11. The configure dialog shows addons only when vars.length > 0 OR addons.length > 0.
12. Boolean vars do NOT auto-enable their corresponding addon - the addon must declare triggerVar pointing to the boolean var's key.
