// Static, single page — prerender the shell. All three.js is browser-guarded so the
// prerender/SSR pass only emits the static board markup; scenes start on the client.
export const prerender = true;
export const ssr = true;
