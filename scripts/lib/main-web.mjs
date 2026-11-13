// The main web, read as a phone with a signal reads it: GET only, each address
// once, nothing ever sent (the gate's walks with --online). The same reader the
// tap walk and the guardrail walk each keep inline; the motion walk takes it
// from here.

const fetched = new Map();

/** A Playwright route handler for the main web's addresses and its public pictures. */
export async function mainWeb(route) {
  const req = route.request();
  if (req.method() !== "GET") return route.abort();
  const url = req.url();
  try {
    if (!fetched.has(url)) {
      fetched.set(
        url,
        (async () => {
          const headers = Object.fromEntries(Object.entries(req.headers()).filter(([k]) => !["host", "connection"].includes(k.toLowerCase())));
          const r = await fetch(url, { headers });
          const kept = Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k.toLowerCase())));
          return { status: r.status, headers: kept, body: Buffer.from(await r.arrayBuffer()) };
        })(),
      );
    }
    return route.fulfill(await fetched.get(url));
  } catch {
    return route.abort();
  }
}
