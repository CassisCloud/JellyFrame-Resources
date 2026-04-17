# JellyFrame Mod Builder - AI Context Document

JellyFrame is a Jellyfin customization framework. Mods are entries in a `mods.json` array hosted publicly over HTTPS. This document is the complete reference. Do not invent APIs or fields.

---

## Project context

- Plugin: Jellyfin.Plugin.JellyFrame
- Runtime engine: Jint 4.1.0 (ES2022 subset, no DOM, no native fetch)
- Jellyfin version: 10.11+
- Official mod repository: https://cdn.jsdelivr.net/gh/Jellyfin-PG/JellyFrame-Resources@main/mods.json
- Official theme repository: https://cdn.jsdelivr.net/gh/Jellyfin-PG/JellyFrame-Resources@main/themes.json

---

## What a mod is

A mod is one entry in a `mods.json` array. It can combine any of:
- `cssUrl` - CSS injected into every Jellyfin page ({{VAR}} substitution server-side before delivery)
- `jsUrl` - Browser JS injected into every Jellyfin page ({{VAR}} substitution server-side before delivery)
- `serverJs` - JS file that runs inside Jellyfin via Jint (no DOM, no fetch, use jf.* API)

All three are optional. A mod can be CSS-only, JS-only, server-only, or any combination.

---

## mods.json - complete schema

```json
{
  "id": "my-mod",
  "name": "My Mod",
  "author": "yourname",
  "description": "Short description.",
  "version": "1.0.0",
  "jellyfin": "10.10+",
  "tags": ["ui", "server"],
  "previewUrl": "https://example.com/preview.png",
  "screenshots": [
    "https://example.com/shot1.png",
    "https://example.com/shot2.png"
  ],
  "sourceUrl": "https://github.com/yourname/my-mod",
  "cssUrl": "https://cdn.example.com/my-mod/style.css",
  "jsUrl": "https://cdn.example.com/my-mod/browser.js",
  "serverJs": "https://cdn.example.com/my-mod/server.js",
  "permissions": ["jellyfin.read", "store"],
  "requires": [],
  "preconnect": ["https://fonts.googleapis.com"],
  "editorsChoice": false,
  "changelog": [
    { "version": "1.0.0", "date": "2025-01-15", "notes": "Initial release." },
    { "version": "1.1.0", "date": "2025-02-01", "notes": "Added X, fixed Y." }
  ],
  "vars": [
    {
      "key": "ACCENT_COLOR",
      "name": "Accent Color",
      "description": "Helper text shown in UI.",
      "type": "color",
      "default": "#00a4dc",
      "allowGradient": false
    },
    {
      "key": "SHOW_BADGE",
      "name": "Show Badge",
      "type": "boolean",
      "default": "false",
      "trueValue": "1",
      "falseValue": "0"
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
    }
  ]
}
```

### Field rules

- `id` - unique lowercase kebab-case slug. Changing it creates a brand-new mod entry.
- `version` - ALWAYS bump when changing any asset file. Cache key includes version; without a bump users get stale files even after cache purge.
- `cssUrl` / `jsUrl` - may be null or omitted.
- `serverJs` - single URL string. One server script per mod. No {{VAR}} substitution - use jf.vars['KEY'] at runtime instead.
- `permissions` - only needed for serverJs. Declare only what is actually used.
- `requires` - other mod ids that must be loaded first. JellyFrame topologically sorts server mods at load time.
- `preconnect` - optional. Origins to preconnect (DNS + TCP handshake) in <head>. Deduplicated across all enabled mods. Omit if not needed.
- `previewUrl` - single image shown as the card preview in the mods browser. Optional.
- `screenshots` - array of image URLs. Optional. Rendered as a gallery on the mod's detail view alongside the preview.
- `editorsChoice` - boolean. Optional. When true, the card gets an "Editor's Choice" ring/badge in the mods browser. Cosmetic; has no behavioral effect.
- `changelog` - array of entries. Optional. Used by the update-flow UI to show what changed when a mod's version bumps. Each entry is freeform but the UI expects at least `{ version, notes }` and may also show `date`. Prior-version comparison is keyed off the `version` field of each entry.
- `vars[].key` - SCREAMING_SNAKE_CASE. Referenced as {{KEY}} in cssUrl/jsUrl and jf.vars['KEY'] in serverJs.
- `vars[].type` - "text" | "number" | "color" | "boolean". Default: "text".
- `vars[].default` - always a string even for number and boolean types.
- `vars[].trueValue` / `falseValue` - what {{KEY}} substitutes for boolean vars. Defaults: "true" / "false".
- `vars[].allowGradient` - color type only. When true, picker shows gradient mode producing linear-gradient(...) / radial-gradient(...) / conic-gradient(...) strings.

---

## Variable substitution

Write {{KEY}} anywhere in cssUrl or jsUrl files. Replaced server-side with user's saved value (or default) before caching and delivery.

```css
:root { --accent: {{ACCENT_COLOR}}; }
.raised { background: var(--accent) !important; }
```

```js
var accentColor = '{{ACCENT_COLOR}}';
var showBadge   = '{{SHOW_BADGE}}' === '1';
var fontSize    = parseInt('{{FONT_SIZE}}', 10) || 14;
```

In serverJs do NOT use {{KEY}} - use jf.vars['KEY'] instead (live string value at runtime).

---

## Injection mechanics

- Mod CSS blocks are inlined in a single `<style data-jellyframe-mods="1">` tag before `</body>`.
- Mod JS blocks are inlined in a single `<script data-jellyframe-mods="1">` tag before `</body>`, wrapped in a deduplication guard: `if (window.__jellyFrameModsLoaded) return; window.__jellyFrameModsLoaded = true;`
- Preconnect hints go into `<head>` (correct placement for DNS prefetch to work).
- Multiple enabled mods share the same CSS/JS block - their assets are concatenated in load order.

---

## Disk cache key

```
{id}__{version}__{type}__{varsHash}.ext   (for cssUrl and jsUrl - has vars hash)
{id}__{version}__serverjs.js              (for serverJs - no vars hash)
```

- Changing `version` invalidates ALL cached files unconditionally.
- Changing a var value changes varsHash, invalidating compiled files.
- After purging: the re-download uses the version from the SAVED plugin config. ALWAYS update version in manifest AND save config before purging, otherwise re-download writes to the same old filename.

---

## Hot reload

Server JS mods support file-system hot reload. When the cached `.js` file on disk changes, JellyFrame automatically restarts the affected mod without requiring a full server restart or config save. This is useful during local development when you have the Jellyfin data directory mounted.

When a mod is hot-reloaded, JellyFrame:
1. Fires the old mod's `jf.onStop` callback (best-effort; if it trips the engine's memory or timeout caps during teardown it is silently skipped — the engine is about to be disposed regardless).
2. Unhooks all Jellyfin event subscriptions registered by the old runtime.
3. Disposes the old Jint engine and all per-mod surfaces (store handles, timers, scheduler tasks, webhooks, event bus subscriptions, RPC handlers).
4. Constructs a brand-new Jint engine with a fresh memory counter and runs the new script.

Consequence: persistent `jf.store` / `jf.userStore` / `jf.kv` values survive hot reload; in-memory `jf.cache` entries do not.

---

## Permissions reference

| String | Unlocks |
|---|---|
| `"http"` | jf.http |
| `"jellyfin.read"` | jf.jellyfin read methods + events |
| `"jellyfin.write"` | jf.jellyfin write methods (implies jellyfin.read) |
| `"jellyfin.delete"` | jf.jellyfin.deleteItem(), jf.jellyfin.deleteDevice() |
| `"jellyfin.tasks"` | jf.jellyfin.runScheduledTask(), jf.jellyfin.scanLibrary() |
| `"jellyfin.refresh"` | jf.jellyfin.refreshMetadata() |
| `"jellyfin.livetv"` | jf.jellyfin live TV recording write methods |
| `"jellyfin.admin"` | jf.jellyfin session/user admin methods |
| `"store"` | jf.store and jf.userStore |
| `"shared-store"` | jf.kv (cross-mod shared key-value store) |
| `"scheduler"` | jf.scheduler |
| `"webhooks"` | jf.webhooks |
| `"rpc"` | jf.rpc |
| `"bus"` | jf.bus |
| `"filesystem"` | jf.fs (local filesystem read/write) |
| `"os"` | jf.os (native OS commands, env, platform info) |

Always available without permission: `jf.vars`, `jf.log`, `jf.cache`, `jf.routes`, `jf.perms`, `jf.onStart()`, `jf.onStop()`

---

## server.js - the jf global

```
jf.vars        - { KEY: "value", ... }  read-only, always strings
jf.log         - logging + recent log retrieval
jf.cache       - in-memory TTL cache (lost on restart)
jf.perms       - permission introspection
jf.routes      - HTTP route registration
jf.http        - outbound HTTP                [permission: http]
jf.jellyfin    - Jellyfin API                [permission: jellyfin.read / jellyfin.write / etc.]
jf.store       - persistent per-mod storage  [permission: store]
jf.userStore   - per-user persistent storage [permission: store]
jf.kv          - cross-mod shared storage    [permission: shared-store]
jf.scheduler   - intervals and cron          [permission: scheduler]
jf.bus         - cross-mod event bus         [permission: bus]
jf.webhooks    - inbound/outbound webhooks   [permission: webhooks]
jf.rpc         - mod-to-mod calls            [permission: rpc]
jf.fs          - local filesystem access     [permission: filesystem]
jf.os          - native OS commands + info   [permission: os]
jf.onStart(fn) - lifecycle hook, called once after load
jf.onStop(fn)  - lifecycle hook, called before unload
```

Engine limits: ES2022, no DOM, no fetch. Max 256 MB Jint tracked-allocation budget per engine lifetime (CLR objects from jf.jellyfin.* do NOT count). Max 30s load timeout. Max 10 000 000 statements per Execute call.

Note on the memory budget: Jint's `LimitMemory` constraint counts *cumulative* tracked allocations over the engine's lifetime, not live heap. A long-running mod will climb steadily even with cheap per-request work. A hot-reload (file-system change to the cached serverjs file) or a Jellyfin restart resets the counter by constructing a new engine.

---

## jf.log

```js
jf.log.debug('message');
jf.log.info('message');
jf.log.warn('message');
jf.log.error('message');
jf.log.info('data: ' + JSON.stringify(obj));

// Retrieve recent log entries from this mod (up to 200 stored in memory)
var entries = jf.log.getRecent(50);  // -> [{ level, message, time }, ...]
// 'time' is an ISO 8601 string. 'level' is "debug"|"info"|"warn"|"error".
```

---

## jf.cache

In-memory only. Lost on restart. Values can be any type.

```js
jf.cache.set(key, value)
jf.cache.set(key, value, ttlMs)
jf.cache.get(key)        // -> value | null
jf.cache.has(key)        // -> boolean
jf.cache.delete(key)
jf.cache.clear()
jf.cache.count           // -> number of live entries
```

---

## jf.routes

Routes served at `/JellyFrame/mods/{mod-id}/api/{path}`

```js
jf.routes.get('/path',       function(req, res) { ... });
jf.routes.post('/path',      function(req, res) { ... });
jf.routes.put('/path',       function(req, res) { ... });
jf.routes.delete('/path',    function(req, res) { ... });
jf.routes.patch('/path',     function(req, res) { ... });
jf.routes.get('/items/:id',  function(req, res) { ... });
```

req object:
```
req.method      - "GET" | "POST" | ...
req.path        - full path string
req.query       - { key: "value" }  access as req.query['key']
req.headers     - { key: "value" }
req.pathParams  - { id: "abc" }  from :name patterns, access as req.pathParams['id']
req.body        - parsed JSON ExpandoObject | null  dot-access works: req.body.myField
req.rawBody     - raw body string | null
req.modId       - your mod's id string
```

IMPORTANT - req.body is an ExpandoObject, not a plain JS object. Dot-access works. Object.assign and spread do NOT work. Cast fields: String(req.body.userId). Always check req.body && req.body.field before use.

res object:
```js
res.json(data)
res.html(htmlString)
res.text(text, contentType?)
res.status(code)          // returns res for chaining
res.header(key, value)    // returns res for chaining

return res.status(404).json({ error: 'not found' });
return res.header('X-Custom', 'value').json({ ok: true });
```

Always return res.json(...) to send the response.

---

## jf.store

Persistent key-value store scoped to this mod. Survives restarts. Values are ALWAYS strings.

```js
jf.store.get(key)          // -> string | null
jf.store.set(key, value)   // value must be a string
jf.store.delete(key)
jf.store.clear()
jf.store.keys()            // -> string[]

jf.store.set('cfg', JSON.stringify({ count: 0 }));
var cfg = JSON.parse(jf.store.get('cfg') || '{}');
```

---

## jf.userStore

Same as jf.store but scoped per Jellyfin user ID.

```js
jf.userStore.get(userId, key)
jf.userStore.set(userId, key, value)
jf.userStore.delete(userId, key)
jf.userStore.clear(userId)
jf.userStore.keys(userId)       // -> string[]
jf.userStore.users()            // -> string[] of all user IDs with data
```

---

## jf.kv — cross-mod shared store

Persistent. Shared across all mods that declare `"shared-store"` permission.
Keys are auto-namespaced to prevent collisions: `"foo"` stored by mod `"my-mod"` is saved as `"my-mod:foo"`.
To read another mod's key, pass the fully-qualified form: `"other-mod:foo"`.

```js
jf.kv.set(key, value)          // write (namespaced to this mod). value must be a string.
jf.kv.get(key)                 // -> string | null  (own namespace)
jf.kv.get('other-mod:key')     // -> string | null  (fully-qualified cross-mod read)
jf.kv.delete(key)              // delete own key
jf.kv.keys()                   // -> string[]  own keys without namespace prefix
jf.kv.allKeys()                // -> string[]  ALL keys across all mods, with prefixes
```

---

## jf.http

Synchronous outbound HTTP. Blocks until response or timeout.

```js
var r = jf.http.get(url, options?)
var r = jf.http.post(url, body?, options?)   // body is a string
var r = jf.http.put(url, body?, options?)
var r = jf.http.delete(url, options?)
var r = jf.http.patch(url, body?, options?)

// options: { headers: { 'X-Key': 'val' }, timeout: 10000 }

r.ok           // boolean - true if 200-299
r.status       // number
r.body         // string - raw response body
r.json()       // parses r.body as JSON - preferred over JSON.parse(r.body)
r.header(name) // string | null - specific response header value

var r = jf.http.get('https://api.example.com/data');
if (!r.ok) {
    return res.status(502).json({ error: 'upstream failed' });
}
var data = r.json();
```

---

## jf.fs — local filesystem

Requires `"filesystem"` permission. All methods are synchronous. No sandboxing — the mod has whatever filesystem access the Jellyfin process has. Use responsibly.

```js
// --- Read ---
jf.fs.readFile(path)                 // -> string  (UTF-8)
jf.fs.readFileBase64(path)           // -> string  (binary as Base64)

// --- Write / append ---
jf.fs.writeFile(path, content)       // overwrites; UTF-8
jf.fs.appendFile(path, content)      // creates if missing
jf.fs.writeFileBase64(path, base64)  // decodes and writes raw bytes

// --- Delete / move / copy ---
jf.fs.deleteFile(path)               // -> boolean  false if file didn't exist
jf.fs.moveFile(source, dest)         // overwrites dest
jf.fs.copyFile(source, dest)         // overwrites dest

// --- Directory operations ---
jf.fs.listDir(path)                  // -> [{ name, path, type: "file"|"directory" }, ...]
jf.fs.makeDir(path)                  // creates parents as needed
jf.fs.deleteDir(path, recursive?)    // -> boolean  recursive defaults to false

// --- Existence / type checks ---
jf.fs.exists(path)                   // -> boolean
jf.fs.isFile(path)                   // -> boolean
jf.fs.isDir(path)                    // -> boolean

// --- Metadata ---
jf.fs.stat(path)                     // -> { type, size, createdAt, modifiedAt, name, directory } | null
// 'type' is "file" or "directory". 'size' is bytes (0 for directories).
// 'createdAt' and 'modifiedAt' are ISO 8601 UTC strings.

// --- Path helpers ---
jf.fs.resolvePath(path)              // -> string  normalises e.g. "../" segments
jf.fs.joinPath(a, b)                 // -> string  uses OS separator
```

Throws (JavaScript exception inside Jint) on invalid paths or I/O errors. Wrap destructive operations in try/catch.

---

## jf.os — native OS commands and system info

Requires `"os"` permission. Lets a mod shell out to the host and inspect the environment. Dangerous surface — treat it like granting shell access.

```js
// --- Execute a command ---
// command is passed to cmd.exe /c on Windows, /bin/sh -c on Linux/macOS.
var r = jf.os.exec(command, options?);
// options: { cwd: '/some/dir', env: { KEY: 'val' }, timeoutMs: 30000 }
//   timeoutMs default 30000, min 1000, max 300000 (5 min).
//
// r.stdout    - string
// r.stderr    - string
// r.exitCode  - number  (-1 when timedOut is true)
// r.timedOut  - boolean

// --- Environment variables ---
jf.os.env(name)          // -> string | null  single var
jf.os.envAll()           // -> { KEY: "value", ... }  all env vars

// --- Platform / machine info ---
jf.os.platform()         // -> "windows" | "linux" | "osx"
jf.os.osDescription()    // -> string  e.g. "Linux 6.1.0-25-amd64 #1 SMP ..."
jf.os.hostname()         // -> string
jf.os.cpuCount()         // -> number  logical CPU cores
jf.os.memoryInfo()       // -> { processWorkingSetBytes, processPrivateBytes, gcTotalMemoryBytes }
```

The command string is wrapped in the system shell, so shell metacharacters (`|`, `>`, `$(...)`, etc.) are interpreted. Never build a command string from untrusted input.

---

## jf.jellyfin — read methods

All synchronous. Return null or [] on failure. Never throw.
All require `"jellyfin.read"` permission unless noted.

```js
// --- Items ---
jf.jellyfin.getItem(id, userId?)             // -> item | null  (userId required for isFavorite)
jf.jellyfin.getItems(query)                  // -> item[]
jf.jellyfin.getItemsByIds(ids, userId?)      // -> item[]  ids: array or comma-separated string
jf.jellyfin.getItemByPath(path)              // -> item | null
jf.jellyfin.getItemCount(query)              // -> number  (count without fetching full data)
jf.jellyfin.search(term, limit?)             // -> item[]  default limit 20
jf.jellyfin.getLatestItems(userId, limit?)   // -> item[]  default 20
jf.jellyfin.getResumeItems(userId, limit?)   // -> item[]  default 10
jf.jellyfin.getNextUp(userId, limit?, seriesId?)  // -> item[]  next unwatched episodes
jf.jellyfin.getSimilarItems(itemId, userId?, limit?)  // -> item[]  default limit 12

// --- Libraries, collections, playlists ---
jf.jellyfin.getUserLibraries(userId)         // -> library[]
jf.jellyfin.getLibraries()                   // -> library[]  all top-level folders, no user filter
jf.jellyfin.getCollections(userId?)          // -> item[]  box-sets / collections
jf.jellyfin.getPlaylists(userId)             // -> playlist[]

// --- Genres, studios, people ---
jf.jellyfin.getGenres(parentId?, userId?)    // -> [{ id, name, itemCount }]
jf.jellyfin.getStudios(parentId?, userId?)   // -> [{ id, name, itemCount }]
jf.jellyfin.getPerson(name)                  // -> item | null
jf.jellyfin.getPersonItems(personName, userId?, itemType?, limit?)  // -> item[]

// --- Stats ---
jf.jellyfin.getItemCounts(userId?)           // -> { movieCount, seriesCount, episodeCount, songCount, albumCount, artistCount, bookCount, boxSetCount, musicVideoCount, trailerCount, itemCount }

// --- Users ---
jf.jellyfin.getUsers()                       // -> user[]
jf.jellyfin.getUser(id)                      // -> user | null
jf.jellyfin.getUserByName(name)              // -> user | null

// --- Sessions (requires jellyfin.admin) ---
jf.jellyfin.getSessions()                    // -> session[]
jf.jellyfin.getSessionsForUser(userId)       // -> session[]
jf.jellyfin.getActiveSessions()              // -> session[]  only active, includes transcodingInfo

// --- User data ---
jf.jellyfin.getUserData(itemId, userId)      // -> { played, isFavorite, playbackPositionTicks, playCount, rating, likes, lastPlayedDate } | null

// --- Media sources / playback info ---
jf.jellyfin.getPlaybackInfo(itemId, userId)  // -> mediaSource[]

// --- Server info ---
jf.jellyfin.getSubtitleProviders()           // -> provider[]
jf.jellyfin.getEncoderVersion()              // -> string
jf.jellyfin.getEncoderInfo()                 // -> object

// --- Activity log ---
jf.jellyfin.getActivity(limit?, userId?)     // -> activityEntry[]  default limit 50, max 500

// --- Scheduled tasks ---
jf.jellyfin.getScheduledTasks()              // -> task[]

// --- Devices ---
jf.jellyfin.getDevices(userId?)              // -> device[]

// --- Live TV (requires jellyfin.read) ---
jf.jellyfin.getChannels(userId?, limit?, startIndex?)   // -> item[]
jf.jellyfin.getPrograms(query, userId?)                 // -> program[]
jf.jellyfin.getRecordings(userId?, channelId?, isInProgress?, limit?, startIndex?)  // -> recording[]
jf.jellyfin.getTimers(channelId?, seriesTimerId?)       // -> timer[]
jf.jellyfin.getSeriesTimers()                           // -> seriesTimer[]
jf.jellyfin.getLiveTvInfo()                             // -> { isEnabled, services, enabledUsers }
```

### getItems query fields (all strings)

```
type        - "Movie" | "Series" | "Episode" | "Audio" | "MusicAlbum" | "Season" |
              "BoxSet" | "MusicVideo" | "Trailer" | "Book" | "Person" | "LiveTvProgram" | etc.
recursive   - "true" | "false"
limit       - "20"
startIndex  - "0"
sortBy      - "DateCreated" | "SortName" | "CommunityRating" | "Random" |
              "DatePlayed" | "PlayCount" | "PremiereDate" | "ProductionYear" | etc.
sortOrder   - "Ascending" | "Descending"
parentId    - folder/library/playlist/series ID
userId      - user ID (required to get correct isFavorite)
isFavorite  - "true" | "false"
searchTerm  - text search
mediaTypes  - "Video" | "Audio" | "Photo" | "Book"
```

### getPrograms additional query fields (all strings)

```
isAiring       - "true" | "false"
isMovie        - "true" | "false"
isSeries       - "true" | "false"
isNews         - "true" | "false"
isKids         - "true" | "false"
isSports       - "true" | "false"
minStartDate   - ISO 8601 string
maxStartDate   - ISO 8601 string
minEndDate     - ISO 8601 string
maxEndDate     - ISO 8601 string
```

### Item fields (returned from all item methods)

```
item.id                 - string (32-char hex, no dashes)
item.name               - string
item.type               - "Movie"|"Series"|"Episode"|"Audio"|"MusicAlbum"|"Season"|"BoxSet"|etc.
item.path               - filesystem path string
item.overview           - string
item.premiereDate       - DateTime | null
item.officialRating     - string (e.g. "PG-13", "TV-MA")
item.communityRating    - number | null
item.genres             - string[]
item.tags               - string[]
item.providerIds        - { Imdb: "tt...", Tmdb: "...", Tvdb: "...", ... }
item.parentId           - string
item.productionYear     - number | null
item.runTimeTicks       - number | null  (divide by 10000000 for seconds, 600000000 for minutes)
item.isFavorite         - boolean  (only correct when userId passed to the query)
item.dateCreated        - DateTime
item.dateModified       - DateTime
item.seriesName         - string | null  (Episode only)
item.seasonName         - string | null  (Episode only)
item.indexNumber        - number | null  (episode/track number within season/album)
item.imageTags          - { Primary, Thumb, Banner, Logo, Backdrop }  each a tag string or null
item.backdropImageTags  - string[]
```

### Image URL pattern

```
/Items/{itemId}/Images/Primary?tag={tag}&quality=90&maxWidth=400
/Items/{itemId}/Images/Backdrop/0?tag={tag}&quality=90&maxWidth=1920
/Items/{itemId}/Images/Logo?tag={tag}&quality=90&maxWidth=400
/Items/{itemId}/Images/Thumb?tag={tag}&quality=90
/Items/{itemId}/Images/Banner?tag={tag}&quality=90
```

### User fields

```
user.id                    - string
user.name                  - string
user.isAdmin               - boolean
user.isDisabled            - boolean
user.lastLoginDate         - DateTime | null
user.lastActivityDate      - DateTime | null
user.hasPassword           - boolean
```

### Session fields (getSessions / getSessionsForUser)

```
session.id                  - string
session.userId              - string
session.userName            - string
session.client              - string (app name)
session.deviceName          - string
session.deviceId            - string
session.remoteEndPoint      - string
session.lastActivityDate    - DateTime
session.supportsMediaControl - boolean
session.nowPlayingItem      - { id, name, type } | null
session.playState           - { positionTicks, isPaused, isMuted, volumeLevel } | null
```

### ActiveSession fields (getActiveSessions only — also includes)

```
session.appVersion          - string
session.supportsRemoteControl - boolean
session.transcodingInfo     - { videoCodec, audioCodec, container, isVideoDirect, isAudioDirect, bitrate, framerate, completionPercentage } | null
```

### getUserData fields

```
userData.played                  - boolean
userData.isFavorite              - boolean
userData.playbackPositionTicks   - number
userData.playCount               - number
userData.rating                  - number | null
userData.likes                   - boolean | null
userData.lastPlayedDate          - DateTime | null
```

### getPlaybackInfo returns array of mediaSources

```
source.id                   - string
source.name                 - string
source.container            - string
source.bitrate              - number | null
source.runTimeTicks         - number | null
source.supportsDirectPlay   - boolean
source.supportsDirectStream - boolean
source.supportsTranscoding  - boolean
source.transcodingUrl       - string | null
source.mediaStreams          - array of:
  { index, type, codec, language, displayTitle, isDefault, isForced, bitrate, width, height, channels, sampleRate }
```

### getScheduledTasks returns array of tasks

```
task.id          - string
task.name        - string
task.description - string
task.category    - string
task.state       - "Idle" | "Running" | "Cancelling"
task.progress    - number | null
task.lastResult  - { status, startTime, endTime, errorMessage } | null
```

### getDevices returns array of devices

```
device.id               - string
device.name             - string
device.customName       - string | null
device.appName          - string
device.appVersion       - string
device.lastUserName     - string
device.lastUserId       - string | null
device.dateLastActivity - DateTime
```

### getActivity returns array of entries

```
entry.id            - number
entry.name          - string
entry.overview      - string
entry.shortOverview - string
entry.type          - string
entry.itemId        - string | null
entry.date          - DateTime
entry.userId        - string
entry.severity      - "Trace"|"Debug"|"Information"|"Warning"|"Error"|"Critical"
```

### Live TV: program fields

```
program.id, program.name, program.channelId, program.channelName
program.startDate, program.endDate, program.overview
program.isLive, program.isSeries, program.isMovie, program.isKids, program.isSports, program.isNews
program.episodeTitle, program.timerId, program.seriesTimerId, program.genres
```

### Live TV: timer fields

```
timer.id, timer.name, timer.channelId, timer.channelName
timer.programId, timer.startDate, timer.endDate
timer.status, timer.seriesTimerId
timer.prePaddingSeconds, timer.postPaddingSeconds
```

---

## jf.jellyfin — write methods

All require `"jellyfin.write"` unless noted. All synchronous except SendMessage/playback controls which return silently.

```js
// --- Favorites / ratings / play state ---
jf.jellyfin.setFavourite(itemId, userId, isFavourite)   // -> boolean
jf.jellyfin.setRating(itemId, userId, rating)           // -> boolean  rating: 0.0-10.0 or null to clear
jf.jellyfin.markPlayed(itemId, userId)                  // -> boolean
jf.jellyfin.markUnplayed(itemId, userId)                // -> boolean

// --- Session/playback control ---
jf.jellyfin.sendMessageToSession(sessionId, header, text, timeoutMs?)
jf.jellyfin.sendMessageToAllSessions(header, text, timeoutMs?)
jf.jellyfin.stopPlayback(sessionId)
jf.jellyfin.pausePlayback(sessionId)
jf.jellyfin.resumePlayback(sessionId)
jf.jellyfin.seekPlayback(sessionId, positionTicks)      // positionTicks = seconds * 10000000
jf.jellyfin.playItem(sessionId, itemId)
jf.jellyfin.downloadSubtitles(itemId, subtitleIndex)

// --- Playback reporting ---
jf.jellyfin.reportPlaybackStart(sessionId, itemId, mediaSourceId?, audioStreamIndex?, subtitleStreamIndex?)   // -> boolean
jf.jellyfin.reportPlaybackProgress(sessionId, itemId, positionTicks?, isPaused?, mediaSourceId?, playSessionId?)  // -> boolean
jf.jellyfin.reportPlaybackStopped(sessionId, itemId, positionTicks?, failed?, mediaSourceId?, playSessionId?)  // -> boolean

// --- WebSocket notifications ---
// Sends a GeneralCommandType message to a session's open WebSocket connection.
// type: "DisplayMessage" | "GoHome" | "MoveUp" | "MoveDown" | etc. (GeneralCommandType enum)
jf.jellyfin.sendWebSocketMessage(sessionId, type, arguments?)

// Sends a JellyFrameNotification message over WebSocket (browser mod can listen with ApiClient.addEventListener('message'))
// Returns number of WebSocket sessions notified. userId null = broadcast to all.
jf.jellyfin.notify(userId, { title, body, type, data })  // -> number

// --- Metadata editing ---
jf.jellyfin.updateMetadata(itemId, fields)
// fields: { name?, overview?, officialRating?, communityRating?, productionYear?,
//           genres?: JSON string array, tags?: JSON string array,
//           providerIds?: JSON object, premiereDate?: ISO string }
// -> boolean

jf.jellyfin.setTags(itemId, tags)            // tags: JS array or comma-separated string -> boolean
jf.jellyfin.setOfficialRating(itemId, rating) // -> boolean

// imageType: "Primary"|"Backdrop"|"Banner"|"Logo"|"Thumb"|"Art"|"Disc"|"Box"|"Screenshot"|"Menu"|"Chapter"|"BoxRear"|"Profile"
jf.jellyfin.setImage(itemId, imageType, url) // downloads from URL and saves -> boolean

// --- Collections and playlists ---
jf.jellyfin.createCollection(name, itemIds?) // -> collectionId string | null
jf.jellyfin.addToCollection(collectionId, itemIds)  // -> boolean
jf.jellyfin.createPlaylist(name, itemIds?, userId?) // -> playlistId string | null
jf.jellyfin.addToPlaylist(playlistId, itemIds, userId?)  // -> boolean

// --- Library ---
jf.jellyfin.refreshLibrary()  // DEPRECATED alias — prefer jf.jellyfin.scanLibrary()
```

---

## jf.jellyfin — tasks methods

Require `"jellyfin.tasks"` permission.

```js
jf.jellyfin.scanLibrary()                  // queues a full library scan
jf.jellyfin.runScheduledTask(taskId)       // -> boolean  taskId from getScheduledTasks()
```

---

## jf.jellyfin — metadata refresh

Requires `"jellyfin.refresh"` permission.

```js
jf.jellyfin.refreshMetadata(itemId, replaceAll?)  // -> boolean  queues provider refresh
// replaceAll=true forces full replacement of all metadata from providers
```

---

## jf.jellyfin — delete methods

Require `"jellyfin.delete"` permission.

```js
jf.jellyfin.deleteItem(itemId)     // -> boolean  removes from library (NOT from disk)
jf.jellyfin.deleteDevice(deviceId) // -> boolean  removes registered device
```

---

## jf.jellyfin — admin methods

Require `"jellyfin.admin"` permission.

```js
jf.jellyfin.getActiveSessions()          // -> session[] (see ActiveSession fields above)
jf.jellyfin.getSessions()                // -> session[]
jf.jellyfin.getSessionsForUser(userId)   // -> session[]
jf.jellyfin.terminateSession(sessionId)  // -> boolean
jf.jellyfin.createUser(username)         // -> userId string | null
jf.jellyfin.deleteUser(userId)           // -> boolean
jf.jellyfin.resetUserPassword(userId)    // -> boolean
```

---

## jf.jellyfin — live TV write methods

Require `"jellyfin.livetv"` permission.

```js
jf.jellyfin.createTimer(programId, prePaddingSeconds?, postPaddingSeconds?)          // -> boolean
jf.jellyfin.createSeriesTimer(programId, recordNewOnly?, recordAnyChannel?, prePaddingSeconds?, postPaddingSeconds?)  // -> boolean
jf.jellyfin.cancelTimer(timerId)           // -> boolean
jf.jellyfin.cancelSeriesTimer(seriesTimerId)  // -> boolean
```

---

## jf.jellyfin — events

Require `"jellyfin.read"`. Fire on Jellyfin domain events - no polling.

```js
jf.jellyfin.on('item.added',       function(data) { });  // data.itemId, data.itemName, data.userId
jf.jellyfin.on('item.updated',     function(data) { });
jf.jellyfin.on('item.removed',     function(data) { });
jf.jellyfin.on('playback.started', function(data) { });  // + data.sessionId, data.userName, data.itemName
jf.jellyfin.on('playback.stopped', function(data) { });  // + data.positionTicks, data.playedToEnd
jf.jellyfin.off('item.added');   // pass the event name string, not a subscription ID
```

Event handlers MUST be void. Do not return a value from on() callbacks.
Call jf.jellyfin.off('eventName') in jf.onStop for each registered event.

---

## jf.scheduler

```js
var id = jf.scheduler.interval(ms, fn)
var id = jf.scheduler.cron(expr, fn)     // 5-field: "0 * * * *" = hourly
jf.scheduler.cancel(id)
jf.scheduler.cancelAll()                 // always call in jf.onStop
jf.scheduler.count                       // -> number of active tasks
```

---

## jf.bus

```js
var count = jf.bus.emit(eventName, data?)
var subId = jf.bus.on(eventName, function(data, fromModId) { ... })
jf.bus.off(subId)
jf.bus.offAll()     // always call in jf.onStop
```

---

## jf.webhooks

```js
jf.webhooks.register('name', function(payload, headers) { ... });
jf.webhooks.unregister('name');
jf.webhooks.list()   // -> string[]

// Inbound URL: POST /JellyFrame/mods/{mod-id}/webhooks/{name}

var r = jf.webhooks.send(url, payload, options?)
// options: { secret: 'hmac-key', timeout: 5000 }
// r: { ok, status, body }
```

---

## jf.rpc

```js
jf.rpc.handle('method', function(payload) { return { result: 'value' }; });
jf.rpc.unhandle('method');
jf.rpc.methods()    // -> string[]

var r = jf.rpc.call(targetModId, method, payload?, timeoutMs?)
// r.ok, r.value, r.error
```

---

## jf.perms

```js
jf.perms.has('http')    // -> boolean
jf.perms.granted()      // -> string[]
```

---

## Canonical lifecycle pattern

```js
jf.onStart(function() {
    jf.log.info('started');
    // register routes, events, scheduler, webhooks here
});

jf.onStop(function() {
    jf.scheduler.cancelAll();
    jf.bus.offAll();
    jf.jellyfin.off('playback.started');
    jf.jellyfin.off('item.added');
    jf.webhooks.unregister('my-hook');
    jf.log.info('stopped');
});
```

---

## Jint 4.1.0 compatibility - critical rules

These cause runtime errors in Jint 4.1.0:

```js
// WRONG - Object.assign on CLR objects unreliable
var copy = Object.assign({}, clrObject, { extra: true });
// RIGHT - build plain objects field by field
var copy = { id: clrObject.id, name: clrObject.name, extra: true };

// WRONG - single-line return without braces inside nested closures
if (x === 0) return res.status(500).json({ error: 'fail' });
// RIGHT
if (x === 0) {
    return res.status(500).json({ error: 'fail' });
}
```

CLR properties are camelCased in Jint 4: req.query not req.Query, req.pathParams not req.PathParams.
All jf.* surfaces are already camelCase.

---

## browser.js compatibility rules

- No const/let - use var
- No arrow functions - use function() {}
- No template literals - use string concatenation
- No Object.assign or spread on CLR-backed objects
- Always use braces on all if/else/for blocks
- No non-ASCII characters - GitHub CDN may alter encoding. Use -- not --, plain ASCII quotes
- Jellyfin's CSS overrides appearance:none on inputs and many class-based styles
- Use inline style attributes on all UI elements you create - never rely on CSS classes
- isFavorite is per-user - always pass userId to getItem/getItems, never cache it shared

### Listening for JellyFrameNotification in browser.js

Server mods can call `jf.jellyfin.notify(userId, payload)` to push messages to browser clients over the existing Jellyfin WebSocket:

```js
// In browser.js (jsUrl)
ApiClient.addEventListener('message', function(e, msg) {
    if (msg.MessageType === 'JellyFrameNotification') {
        var d = msg.Data; // { title, body, type, modId, data }
        // render your own toast/notification here
    }
});
```

---

## Complete working example

server.js:
```js
jf.onStart(function() {
    if (jf.store.get('visits') === null) {
        jf.store.set('visits', '0');
    }
    buildCache();
    jf.scheduler.interval(5 * 60 * 1000, function() {
        buildCache();
    });
    jf.jellyfin.on('item.added', function() {
        buildCache();
    });
});

jf.onStop(function() {
    jf.scheduler.cancelAll();
    jf.jellyfin.off('item.added');
});

function buildCache() {
    var movies = jf.jellyfin.getItems({ type: 'Movie', recursive: 'true', limit: '20' }) || [];
    jf.cache.set('movies', movies, 5 * 60 * 1000);
}

jf.routes.get('/movies', function(req, res) {
    var n = parseInt(jf.store.get('visits') || '0', 10) + 1;
    jf.store.set('visits', String(n));
    var movies = jf.cache.get('movies');
    if (!movies) {
        buildCache();
        movies = jf.cache.get('movies') || [];
    }
    return res.json({ count: movies.length, items: movies });
});

jf.routes.post('/favourite/:id', function(req, res) {
    var id     = req.pathParams['id'];
    var body   = req.body || {};
    var fav    = body.favourite !== false;
    var userId = body.userId ? String(body.userId) : null;
    if (!userId) {
        var users = jf.jellyfin.getUsers() || [];
        if (users.length === 0) {
            return res.status(500).json({ error: 'no users' });
        }
        userId = users[0].id;
    }
    jf.jellyfin.setFavourite(id, userId, fav);
    return res.json({ ok: true });
});
```

mods.json entry:
```json
{
  "id": "my-mod",
  "name": "My Mod",
  "author": "yourname",
  "description": "Does something useful.",
  "version": "1.0.0",
  "jellyfin": "10.10+",
  "tags": ["example"],
  "previewUrl": "",
  "sourceUrl": "",
  "cssUrl": null,
  "jsUrl": "https://cdn.jsdelivr.net/gh/user/repo@main/mods/my-mod/browser.js",
  "serverJs": "https://cdn.jsdelivr.net/gh/user/repo@main/mods/my-mod/server.js",
  "permissions": ["jellyfin.read", "store", "scheduler"],
  "requires": [],
  "vars": [
    { "key": "LABEL", "name": "Label", "type": "text", "default": "My Jellyfin" },
    { "key": "ACCENT_COLOR", "name": "Accent Color", "type": "color", "default": "#00a4dc" }
  ]
}
```

---

## Hard rules - never break these

1. Always bump version when changing any asset file.
2. serverJs vars use jf.vars['KEY'], not {{KEY}}.
3. All jf.store / jf.userStore / jf.kv values are strings - String() before set, parse after get.
4. jf.jellyfin.* returns CLR-wrapped objects - they do NOT count against the 256 MB Jint memory budget.
5. Event handlers must be void - do not return from jf.jellyfin.on() callbacks.
6. Clean up in jf.onStop: cancelAll(), offAll(), jf.jellyfin.off() per event name, webhooks.unregister() per hook.
7. requires[] controls load order - missing dependency skips the dependent mod entirely.
8. Routes base path: /JellyFrame/mods/{mod-id}/api/
9. Inbound webhooks: POST /JellyFrame/mods/{mod-id}/webhooks/{name}
10. Do not use "version": "latest" - never invalidates cache.
11. Assets must be HTTPS with Access-Control-Allow-Origin: *.
12. No Object.assign or spread on CLR-backed objects.
13. Always use braces on if/else/for in server JS.
14. No non-ASCII in JS files.
15. isFavorite is per-user - never cache it in a shared store without the userId as part of the key.
16. req.body is ExpandoObject - dot-access works, Object.assign does not.
17. preconnect is optional - omit entirely if not needed.
18. After cache purge, update manifest version AND save config first - otherwise re-download reuses old filename.
19. jf.jellyfin.off() takes the event name string, not a subscription ID.
20. jf.kv keys are auto-namespaced - to read another mod's key use "other-mod:keyname" (fully qualified).
21. jf.jellyfin.getSessions() and getActiveSessions() require "jellyfin.admin" permission (not just jellyfin.read).
22. jf.jellyfin.setFavourite uses British spelling (setFavourite, not setFavorite).
23. jf.jellyfin.deleteItem() removes from library only, NOT from disk.
24. jf.jellyfin.notify() returns the number of WebSocket sessions notified (int), not a boolean.
25. jf.fs and jf.os are unsandboxed and run with the full privileges of the Jellyfin process. Never build command strings or file paths from untrusted input (req.body, req.query, webhook payloads, etc.).
26. jf.os.exec goes through the system shell (`cmd.exe /c` on Windows, `/bin/sh -c` elsewhere) — shell metacharacters in the command string are interpreted.
27. The 256 MB Jint memory budget is cumulative allocations over the engine's lifetime, not live heap. It resets on hot-reload and on Jellyfin restart; GC does not reclaim against it.
