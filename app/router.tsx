import { contentSecurityPolicy } from "./security.ts";
import { createRouter } from "remix/router";
import { render } from "remix/middleware/render";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { routes } from "./routes.ts";
import { Coffees, coffeeForm, type Coffee } from "./coffee.ts";
import type { OwnerAuth } from "./auth.ts";
import type { CoffeeOAuth } from "./oauth.ts";
import { boundedForm, savePhoto, photoResponse } from "./uploads.ts";
import {
  CollectionPage,
  CoffeeFormPage,
  CoffeePage,
  LoginPage,
  ConnectPage,
  ErrorPage,
} from "./ui/pages.tsx";
const redirect = (location: string, headers: HeadersInit = {}) =>
  new Response(null, { status: 303, headers: { ...headers, location } });
const safeNext = (value: unknown) =>
  typeof value === "string" &&
  /^\/(?:$|coffees(?:\/|$)|connect(?:\/|$))/.test(value) &&
  !value.includes("\\")
    ? value
    : "/";
export function createWebRouter(
  coffees: Coffees,
  auth: OwnerAuth,
  oauth: CoffeeOAuth,
) {
  const router = createRouter({ middleware: [render()] });
  const config = auth.config;
  const getCoffee = (id: string): Coffee => {
    const num = Number(id);
    if (!Number.isSafeInteger(num) || num < 1)
      throw new Response("Coffee not found", { status: 404 });
    const coffee = coffees.get(num);
    if (!coffee) throw new Response("Coffee not found", { status: 404 });
    return coffee;
  };
  const save = async (request: Request, current?: Coffee) => {
    const form = await boundedForm(request);
    const raw = Object.fromEntries(
      [...form.entries()].filter(([, v]) => typeof v === "string"),
    );
    const values: Record<string, unknown> = {
      ...current,
      ...raw,
      isFavorite: form.get("isFavorite") === "on",
    };
    try {
      const data = coffeeForm(form);
      data.photoPath = current?.photoPath ?? null;
      if (form.get("removePhoto") === "on") data.photoPath = null;
      const photo = await savePhoto(form.get("photo"), config.dataDir);
      if (photo) data.photoPath = photo;
      const coffee = current
        ? coffees.update(current.id, data)
        : coffees.add(data);
      return { response: redirect(`/coffees/${coffee.id}`) };
    } catch (error) {
      return {
        values,
        error:
          error instanceof z.ZodError
            ? error.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; ")
            : error instanceof Error
              ? error.message
              : "Unable to save coffee",
      };
    }
  };
  let attempts: number[] = [];
  router.map(routes, {
    actions: {
      home(context) {
        const u = new URL(context.request.url);
        const search = (u.searchParams.get("search") || "").slice(0, 200);
        const favoriteOnly = u.searchParams.get("favorites") === "true";
        const page = Math.max(
          0,
          Math.min(100000, Math.floor(Number(u.searchParams.get("page")) || 0)),
        );
        const { coffees: items, total } = coffees.list({
          search,
          favoriteOnly,
          skip: page * 24,
          limit: 24,
        });
        return context.render(
          <CollectionPage
            items={items}
            total={total}
            stats={coffees.stats()}
            search={search}
            favoriteOnly={favoriteOnly}
            page={page}
          />,
        );
      },
      login(context) {
        if (auth.session(context.request)) return redirect("/");
        return context.render(
          <LoginPage
            next={safeNext(
              new URL(context.request.url).searchParams.get("next"),
            )}
          />,
        );
      },
      async signIn(context) {
        const form = await boundedForm(context.request, 16384);
        const next = safeNext(form.get("next"));
        attempts = attempts.filter((t) => t > Date.now() - 60000);
        if (attempts.length >= 10)
          return context.render(
            <LoginPage
              next={next}
              error="Too many attempts. Wait a minute and try again."
            />,
            { status: 429 },
          );
        attempts.push(Date.now());
        if (!auth.checkPassword(String(form.get("password") || "")))
          return context.render(
            <LoginPage
              next={next}
              error="That password didn’t match. Try again."
            />,
            { status: 401 },
          );
        return redirect(next, { "set-cookie": auth.login() });
      },
      signOut({ request }) {
        return redirect("/login", { "set-cookie": auth.logout(request) });
      },
      newCoffee(context) {
        return context.render(<CoffeeFormPage values={{}} />);
      },
      async createCoffee(context) {
        const result = await save(context.request);
        return (
          result.response ??
          context.render(
            <CoffeeFormPage values={result.values!} error={result.error} />,
            { status: 400 },
          )
        );
      },
      coffee(context) {
        return context.render(
          <CoffeePage coffee={getCoffee(context.params.id)} />,
        );
      },
      editCoffee(context) {
        const coffee = getCoffee(context.params.id);
        return context.render(
          <CoffeeFormPage id={coffee.id} values={coffee} />,
        );
      },
      async updateCoffee(context) {
        const current = getCoffee(context.params.id);
        const result = await save(context.request, current);
        return (
          result.response ??
          context.render(
            <CoffeeFormPage
              id={current.id}
              values={result.values!}
              error={result.error}
            />,
            { status: 400 },
          )
        );
      },
      confirmDelete(context) {
        return context.render(
          <CoffeePage coffee={getCoffee(context.params.id)} deleting />,
        );
      },
      deleteCoffee({ params }) {
        coffees.delete(getCoffee(params.id).id);
        return redirect("/");
      },
      favorite({ params }) {
        const coffee = getCoffee(params.id);
        coffees.update(coffee.id, { isFavorite: !coffee.isFavorite });
        return redirect(`/coffees/${coffee.id}`);
      },
      connect(context) {
        return context.render(
          <ConnectPage
            origin={config.origin}
            revoked={new URL(context.request.url).searchParams.has("revoked")}
          />,
        );
      },
      revoke() {
        oauth.revokeAll();
        return redirect("/connect?revoked=1");
      },
      approvePage(context) {
        const pending = oauth.pending(context.params.id);
        if (!pending)
          return context.render(
            <ErrorPage
              status={410}
              message="This connection request expired. Please start again in your assistant."
            />,
            { status: 410 },
          );
        return context.render(
          <ConnectPage
            origin={config.origin}
            pending={pending}
            pendingId={context.params.id}
          />,
          {
            headers: {
              "Content-Security-Policy": contentSecurityPolicy(
                new URL(pending.redirectUri).origin,
              ),
            },
          },
        );
      },
      async approve({ params, request }) {
        const form = await boundedForm(request, 16384);
        if (!oauth.pending(params.id))
          return new Response("Authorization expired", { status: 410 });
        return redirect(
          oauth.approve(params.id, form.get("decision") === "allow"),
        );
      },
      photo({ params }) {
        return photoResponse(params.filename, config.dataDir);
      },
      health() {
        try {
          auth.store.db.prepare("SELECT COUNT(*) FROM coffees").get();
          return Response.json({ status: "ok" });
        } catch {
          return Response.json({ status: "unavailable" }, { status: 503 });
        }
      },
      async favicon() {
        return new Response(
          await readFile(new URL("../public/favicon.svg", import.meta.url)),
          {
            headers: {
              "content-type": "image/svg+xml",
              "cache-control": "public, max-age=86400",
            },
          },
        );
      },
      async stylesheet() {
        return new Response(
          await readFile(new URL("../public/style.css", import.meta.url)),
          {
            headers: {
              "content-type": "text/css",
              "cache-control": "public, max-age=3600",
            },
          },
        );
      },
    },
  });
  return async (request: Request) => {
    try {
      const path = new URL(request.url).pathname;
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method))
        auth.checkOrigin(request);
      if (!["/login", "/health", "/style.css", "/favicon.svg"].includes(path))
        auth.require(request);
      const response = await router.fetch(request);
      if (path !== "/style.css" && !path.startsWith("/uploads/"))
        response.headers.set("cache-control", "no-store");
      return response;
    } catch (error) {
      if (error instanceof Response) return error;
      console.error("Web request failed", error);
      return new Response("Something went wrong. Please try again.", {
        status: 500,
      });
    }
  };
}
