# House Management Dashboard

Landlord dashboard for apartments and tenants, connected to the live API at
`https://property-management-1mlx.onrender.com`. Plain JavaScript (no TypeScript), React 18, Vite,
React Router, TanStack Query, React Hook Form, Zustand, Tailwind v4.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build (checks messages first)
```

- **Development:** `.env` sets `VITE_API_URL=/api`, and `vite.config.js` forwards `/api` to the live server.
  The browser never makes a cross-origin request, so no CORS setup is needed.
- **Production:** `.env.production` points straight at the live server. The backend must allow your
  site's origin (CORS), or you must put a rewrite from `/api` to the server on your host.
- The server is on Render. See "Speed" below for how the app copes with a sleeping server.

## Which version is running?

In development the sidebar shows the version at the bottom (hidden in production builds). If it shows an older number, the browser is still running
an old copy: stop the dev server, delete `node_modules/.vite`, run `npm run dev` again, and hard-refresh the
page (Ctrl+Shift+R). If it still looks wrong, open DevTools, Application, Storage, "Clear site data".

## Speed

What the app does so the landlord waits as little as possible:

- **Wakes the server early.** A tiny request goes out the moment the site opens, and again when the landlord
  returns to the tab after 10 minutes, so the start-up overlaps with typing the password.
- **Calm status, not a pop-up.** A small pill at the bottom says "Server is waking up. Please wait." only if
  the server has not answered within 2.5 seconds, or "Still working. Thanks for waiting." if a request takes
  over 8 seconds. It disappears on its own.
- **Quiet retries.** A dropped connection or a 502, 503 or 504 (what a hosting proxy returns while a server
  starts) is retried up to 3 times, 1, 2 and 4 seconds apart. Real answers such as 400 or 404 are not retried.
- **Last visit's data appears at once.** Apartments and tenants are kept in this browser tab (session storage) and shown instantly on
  reload while fresh data loads. Closing the tab erases them. The saved tenant copy holds only name, phone, email, apartment and file
  links: no ID numbers, income or other private details. It is erased on logout and never shown to another
  landlord.
- **Fewer requests.** Data loaded in the last 30 seconds is reused when moving between pages. The tenant and
  apartment forms open from what is already loaded.
- **Lighter images.** Avatars and document previews ask Cloudinary for a small, auto-format copy (a 36 px
  avatar downloads a few KB, not the original photo). Phone photos are shrunk in the browser before upload
  (max 1600 px), so uploads are faster and fit the 5 MB limit.
- **Smaller first download.** Only the login pages load up front; every other page loads when first opened.

The biggest remaining delay is the sleeping server itself. Two ways to remove it, both on the Render side:
use an always-on plan, or have a free monitor (for example UptimeRobot or cron-job.org) request
`https://property-management-1mlx.onrender.com/api/apartments` every 10 minutes. A 401 answer is fine,
it still keeps the server awake.

## Profile picture troubleshooting

The app looks for the picture link in the upload response, then in the user record, under the names
`profilePicture`, `profileImage`, `profilePic`, `avatar`, `picture`, `image` and `photo`, as a text link or an
object with `secure_url` / `url`. If the picture still does not show, open the browser console: it prints the
exact response the server sent, so the missing name can be added to `PICTURE_KEYS` in `src/api/auth.js`.

## How each flow uses the API

**Register: one button, up to three requests**
1. `POST /api/users/register` (JSON, includes `confirmPassword`).
2. If the response has no token: `POST /api/users/login` with the same email and password.
3. If a picture was chosen: `PATCH /api/users/profile-picture` (multipart, field `profilePicture`),
   sent with the new token directly, so the landlord is only taken to the dashboard when all of it is done.

If the picture fails, the account still exists: the landlord is logged in and told only the picture failed.
If the automatic login fails, they are sent to the login page.

**Create tenant: one button, two requests**
1. `POST /api/tenants` with JSON shaped like the API guide (`personalInformation`, `employmentInformation`,
   `rentalHistory`, `references`, `identification`, `additionalInformation`, `declaration`, and `apartment`).
2. `PATCH /api/tenants/:id/<path>` as multipart, only if files were chosen (see "Confirm with the backend").

If request 1 works and request 2 fails, the tenant exists, so the page offers "Retry upload" and
repeats only the files that did not go through. It never creates a duplicate tenant.

Editing uses `PATCH /api/tenants/:id`. Profile edits send only the fields that changed
(`PATCH /api/users/:id`). Apartments use `POST`, `GET`, `PATCH`, `DELETE` on `/api/apartments`.

**Apartment status.** The API stores `vacant` / `occupied`. The app shows "Vacant" / "Occupied". An apartment
counts as Occupied when it has a tenant or was marked Occupied.

## Tenancy papers (v0.6.0)

The tenant page has a "Tenancy papers" section with two PDF-only tiles: **Tenancy Agreement** (`tenancyAgreement`) and
**Rent Receipt** (`rentReceipt`). They use the same `PATCH /api/tenants/:id/documents` (multipart) as the other documents: two extra fields, `tenancyAgreement` and `rentReceipt`.
The server saves `tenancyAgreementUrl` / `tenancyAgreementPublicId` and `rentReceiptUrl` / `rentReceiptPublicId`.
They are not in the 7-step form, do not count as "missing documents", and are not kept in the browser's saved copy.
A new rent receipt replaces the old one: ask the backend developer if receipts should become a list.
Routes and names: `src/lib/uploadConfig.js` (`TENANT_UPLOAD_GROUPS`, `PAPER_URL_PATHS`).

## Confirm with the backend developer

These are guesses, each in one place, until confirmed:

| Question | Where to change it |
| --- | --- |
| Exact tenant upload route(s) and file field names (the guide says only `/api/tenants/:id/...`) | `src/lib/uploadConfig.js` → `TENANT_UPLOAD_GROUPS` |
| Where tenant responses hold each file's link | `src/lib/uploadConfig.js` → `DOC_URL_PATHS` |
| Which tenant fields are required, and the allowed values (ID type, marital status, employment status) | `src/pages/tenantFields.js` |
| Shape of login and register responses (token, user) | handled in `src/api/auth.js`; it accepts the common shapes |

The form lists only fields the API guide shows. Gender, nationality, current address, emergency contact,
signature and the like are not in the guide, so they are not in the form. To add one when the backend
supports it, add one line to `STEPS` in `src/pages/tenantFields.js`. The field name is the path in the
request body, for example `personalInformation.gender`.

There is no change-password endpoint in the guide, so that form is not shown.

## Messages: always 3 to 7 words

Every error and success message is 3 to 7 words and lives in `src/lib/messages.js`.
An error is built as *what failed* + *why*, for example:

- `Tenant not saved. Server unreachable.`
- `Documents not uploaded. File too large.`
- `Incorrect email or password.`

`errMsg(error, FAIL.tenantSave)` picks the reason from the network error or the HTTP status.
If the server sends its own `message` of 3 to 7 words, that is used. Common server validation text
(Mongoose "Path `x` is required", Mongo duplicate keys, `errors` objects and arrays) is turned into a short
message under the right field, and the form jumps to that step.

`npm run check:messages` fails when any message breaks the rule. It runs before every build.

## Feedback

- **Toasts** confirm every action and report every failure. They pause on hover and close on their own.
- **Confirm pop-up** asks before deleting an apartment or removing a tenant.
- **Offline banner** appears when the connection drops, with a toast when it returns.
- **Session expiry** logs the landlord out and says so.
- **Crash screen** replaces a blank page if something breaks while drawing.
- **Server status pill** shows only while the server wakes up or answers slowly (see Speed).

## Layout

```
src/
  api/          auth, apartments, tenants (shape the data between the server and the app)
  components/   Field, FileField, Building, Toasts, ConfirmHost, ui helpers
  lib/          axios instance, messages, formatting, upload config, tenant helpers
  pages/        one file per screen; tenantFields.js defines the 7 steps and the request body
  store/        auth, toasts, confirm pop-up (Zustand)
scripts/        check-messages.mjs
```


## Validation and privacy

- **Input rules** live in `src/lib/validators.js` (`SPEC`) and are attached to fields by name in
  `tenantFields.js` (`RULES`) or via `rules={SPEC.x}` on a `<Field>`. They cover names (letters only), phone numbers
  (7 to 15 digits), email, addresses, income (above zero, 2 decimals), occupants (1 to 20), date of birth (18 to 120
  years old), ID number (National ID: 11 digits), signature (must match full name), password (8+ with a letter and a
  digit) and more. Characters that can never be valid are removed as the user types; values are trimmed and tidied
  before they are sent. The backend must still validate everything: the browser is not a security boundary.
- **Never shown to users:** the server's own error wording, field paths, console logs and source maps (all removed
  from production builds), the version number, and full ID numbers (masked until "Show" is pressed).
- **Stored in the browser:** the login token (local storage) and a slim list cache (session storage, erased on logout).
- **Set at your host, not in code:** HTTPS, `Content-Security-Policy`, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`. Also lock the API's CORS to your site's origin.
