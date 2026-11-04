export function onRequest({ request, env }) {
  return env.AI_WORKER.fetch(request);
}
