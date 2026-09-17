// Deprecated storefront compatibility entry point.
// The primary storefront implementation now owns Firebase initialization,
// media rendering, cart, checkout, and payment-proof upload in app.js.
// Kept as an inert entry point so older deployments/bookmarks do not fail
// if this module is still referenced by index.html.
export {};