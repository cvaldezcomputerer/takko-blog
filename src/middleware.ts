import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;

  if (pathname === "/blog" || pathname === "/blog/") {
    return context.redirect("/", 301);
  }

  if (pathname === "/letter-game" || pathname === "/letter-game/") {
    return new Response("Gone", {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return next();
};
