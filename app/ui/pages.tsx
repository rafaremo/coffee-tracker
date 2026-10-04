import type { Handle, RemixNode } from "remix/component";
import type { Coffee, Coffees } from "../coffee.ts";
import type { PendingAuthorization } from "../oauth.ts";

type PageProps = {
  title: string;
  children: RemixNode;
  private?: boolean;
  active?: string;
};
export function Page(handle: Handle<PageProps>) {
  return () => (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{handle.props.title} · Coffee Journal</title>
        <link rel="stylesheet" href="/style.css" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>
        <header className="site-header">
          <a className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              ☕
            </span>
            <span>
              Coffee Journal
              <small>A little more intentional, one cup at a time.</small>
            </span>
          </a>
          {handle.props.private !== false && (
            <nav aria-label="Main navigation">
              <a
                aria-current={
                  handle.props.active === "collection" ? "page" : undefined
                }
                href="/"
              >
                Collection
              </a>
              <a
                aria-current={
                  handle.props.active === "connect" ? "page" : undefined
                }
                href="/connect"
              >
                Assistants
              </a>
              <form method="post" action="/logout">
                <button className="text-button">Sign out</button>
              </form>
            </nav>
          )}
        </header>
        <main>{handle.props.children}</main>
        <footer>Your coffee, your notes, your collection.</footer>
      </body>
    </html>
  );
}
export function LoginPage(handle: Handle<{ next: string; error?: string }>) {
  return () => (
    <Page title="Welcome back" private={false}>
      <section className="login panel">
        <span className="eyebrow">YOUR PERSONAL COFFEE JOURNAL</span>
        <h1>
          Good coffee.
          <br />
          Worth remembering.
        </h1>
        <p className="muted">Sign in to your private collection.</p>
        {handle.props.error && (
          <p role="alert" className="error">
            {handle.props.error}
          </p>
        )}
        <form method="post" action="/login">
          <input type="hidden" name="next" value={handle.props.next} />
          <label>
            Your password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
            />
          </label>
          <button className="button full">
            Open my journal <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>
    </Page>
  );
}
export function CollectionPage(
  handle: Handle<{
    items: Coffee[];
    total: number;
    stats: ReturnType<Coffees["stats"]>;
    search: string;
    favoriteOnly: boolean;
    page: number;
  }>,
) {
  return () => {
    const p = handle.props;
    return (
      <Page title="Collection" active="collection">
        <section className="heading">
          <div>
            <span className="eyebrow">THE COFFEE JOURNAL</span>
            <h1>
              Your next favorite
              <br />
              starts with a good note.
            </h1>
            <p className="muted">
              A home for the beans you love and the cups you remember.
            </p>
          </div>
          <a className="button" href="/coffees/new">
            + Add a coffee
          </a>
        </section>
        <section className="stats" aria-label="Collection overview">
          <div>
            <strong>{p.stats.totalEntries}</strong>
            <span>Coffees collected</span>
          </div>
          <div>
            <strong>{p.stats.totalFavorites}</strong>
            <span>Personal favorites</span>
          </div>
          <div>
            <strong>
              {p.stats.avgRating ?? "—"}
              <small>{p.stats.avgRating !== null ? " / 10" : ""}</small>
            </strong>
            <span>Average rating</span>
          </div>
          <div>
            <strong>{p.stats.countries}</strong>
            <span>Origins explored</span>
          </div>
        </section>
        <section className="collection">
          <div className="toolbar">
            <h2>
              The collection <span className="count">{p.total}</span>
            </h2>
            <form className="search" method="get" action="/">
              <label className="sr-only" htmlFor="search">
                Search coffee
              </label>
              <input
                id="search"
                name="search"
                placeholder="Search coffee, origin, tasting notes…"
                defaultValue={p.search}
              />
              <label className="checkbox">
                <input
                  name="favorites"
                  type="checkbox"
                  value="true"
                  defaultChecked={p.favoriteOnly}
                />{" "}
                Favorites
              </label>
              <button className="button secondary">Search</button>
            </form>
          </div>
          {p.items.length ? (
            <div className="coffee-grid">
              {p.items.map((c) => (
                <CoffeeCard key={c.id} coffee={c} />
              ))}
            </div>
          ) : (
            <div className="empty panel">
              <span className="empty-icon" aria-hidden="true">
                ☕
              </span>
              <h2>
                {p.search || p.favoriteOnly
                  ? "No coffees match just yet."
                  : "Your collection starts here."}
              </h2>
              <p className="muted">
                {p.search || p.favoriteOnly
                  ? "Try another search or see your whole collection."
                  : "Add the bag on your counter. A name is all you need to start."}
              </p>
              <a
                className="button secondary"
                href={p.search || p.favoriteOnly ? "/" : "/coffees/new"}
              >
                {p.search || p.favoriteOnly
                  ? "Show all coffees"
                  : "Add your first coffee"}
              </a>
            </div>
          )}
          <div className="pagination">
            {p.page > 0 && (
              <a
                href={`/?${new URLSearchParams({ search: p.search, favorites: String(p.favoriteOnly), page: String(p.page - 1) })}`}
              >
                ← Previous
              </a>
            )}
            {(p.page + 1) * 24 < p.total && (
              <a
                href={`/?${new URLSearchParams({ search: p.search, favorites: String(p.favoriteOnly), page: String(p.page + 1) })}`}
              >
                Next →
              </a>
            )}
          </div>
        </section>
      </Page>
    );
  };
}
function CoffeeCard(handle: Handle<{ coffee: Coffee }>) {
  return () => {
    const c = handle.props.coffee;
    return (
      <a className="coffee-card" href={`/coffees/${c.id}`}>
        <div className={`card-image tone-${c.id % 4}`}>
          {c.photoPath ? (
            <img
              src={c.photoPath}
              alt={`${c.name} coffee bag`}
              loading="lazy"
            />
          ) : (
            <div className="bag" aria-hidden="true">
              <span>COFFEE JOURNAL</span>
              <strong>{c.country || "SPECIALTY"}</strong>
              <i>one good cup</i>
            </div>
          )}
          {c.isFavorite && (
            <span className="favorite" aria-label="Favorite">
              ♥
            </span>
          )}
        </div>
        <div className="card-body">
          <span className="eyebrow">{c.brand || "FROM YOUR COLLECTION"}</span>
          <div className="card-title">
            <h3>{c.name}</h3>
            {c.myRating != null && (
              <span className="rating">★ {c.myRating}</span>
            )}
          </div>
          <p className="muted small">
            {[c.country, c.region].filter(Boolean).join(" · ") ||
              "An origin to discover"}
          </p>
          <div className="tags">
            {[c.roastLevel, c.process].filter(Boolean).map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
          {c.tastingNotes && <p className="tasting">{c.tastingNotes}</p>}
          {!!c.tastings?.length && (
            <p className="muted small">{c.tastings.length} tastings</p>
          )}
        </div>
      </a>
    );
  };
}

export const fieldGroups = [
  {
    title: "The essentials",
    fields: [
      ["name", "Coffee name"],
      ["brand", "Roaster / brand"],
      ["country", "Country"],
      ["region", "Region"],
      ["roastLevel", "Roast level"],
      ["process", "Process"],
      ["myRating", "My rating (0–10)"],
      ["tastingNotes", "Tasting notes"],
    ],
  },
  {
    title: "Origin & traceability",
    fields: [
      ["farm", "Farm"],
      ["producer", "Producer"],
      ["altitudeMasl", "Altitude (m)"],
      ["variety", "Variety"],
      ["harvestDate", "Harvest"],
      ["lot", "Lot"],
    ],
  },
  {
    title: "Roast & tasting",
    fields: [
      ["roastDate", "Roast date"],
      ["roasterNotes", "Roaster notes"],
      ["scaScore", "SCA score (0–100)"],
      ["body", "Body"],
      ["acidity", "Acidity"],
      ["sweetness", "Sweetness"],
      ["aroma", "Aroma"],
      ["aftertaste", "Aftertaste"],
    ],
  },
  {
    title: "Brewing & purchase",
    fields: [
      ["brewingMethods", "Brewing methods"],
      ["purchaseDate", "Purchase date"],
      ["purchasePlace", "Purchased from"],
      ["pricePerKg", "Price per kg"],
      ["weightG", "Bag weight (g)"],
      ["tags", "Tags"],
    ],
  },
] as const;
const numeric: Record<string, { max: number; step: string }> = {
  myRating: { max: 10, step: "0.1" },
  scaScore: { max: 100, step: "0.1" },
  altitudeMasl: { max: 10000, step: "1" },
  pricePerKg: { max: 1000000, step: "0.01" },
  weightG: { max: 1000000, step: "1" },
};
function FieldInput(handle: Handle<{ name: string; value: unknown }>) {
  return () => {
    const { name, value } = handle.props;
    const props = {
      name,
      defaultValue: value == null ? "" : String(value),
      required: name === "name",
    };
    if (numeric[name])
      return (
        <input
          {...props}
          type="number"
          min={0}
          max={numeric[name].max}
          step={numeric[name].step}
        />
      );
    if (name === "roastDate" || name === "purchaseDate")
      return <input {...props} type="date" />;
    return (
      <input {...props} type="text" maxLength={name === "name" ? 200 : 4000} />
    );
  };
}
type FormProps = {
  id?: number;
  values: Record<string, unknown>;
  error?: string;
};
export function CoffeeFormPage(handle: Handle<FormProps>) {
  return () => {
    const p = handle.props;
    const fields = (group: (typeof fieldGroups)[number]) => (
      <div className="form-grid">
        {group.fields.map(([name, label]) => (
          <label key={name}>
            {label}
            {name === "name" && <span className="required"> *</span>}
            <FieldInput name={name} value={p.values[name]} />
          </label>
        ))}
      </div>
    );
    return (
      <Page title={p.id ? "Edit coffee" : "Add a coffee"} active="collection">
        <a className="back" href={p.id ? `/coffees/${p.id}` : "/"}>
          ← Back
        </a>
        <div className="form-heading">
          <span className="eyebrow">MAKE A LITTLE NOTE</span>
          <h1>{p.id ? "Refine the details." : "Meet your next coffee."}</h1>
          <p className="muted">
            Start with a name. Fill in the rest whenever you like.
          </p>
        </div>
        <form
          className="coffee-form panel"
          method="post"
          encType="multipart/form-data"
          action={p.id ? `/coffees/${p.id}/edit` : "/coffees/new"}
        >
          {p.error && (
            <p role="alert" className="error">
              {p.error}
            </p>
          )}
          <h2>The essentials</h2>
          {fields(fieldGroups[0])}
          <label className="checkbox favorite-check">
            <input
              type="checkbox"
              name="isFavorite"
              defaultChecked={Boolean(p.values.isFavorite)}
            />{" "}
            A personal favorite
          </label>
          <label>
            Bag photo{" "}
            <span className="muted">
              · Optional, JPEG/PNG/WebP/GIF, up to 5 MB
            </span>
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp,image/gif"
            />
          </label>
          {Boolean(p.values.photoPath) && (
            <>
              <img
                className="photo-preview"
                src={String(p.values.photoPath)}
                alt="Current coffee bag"
              />
              <label className="checkbox">
                <input type="checkbox" name="removePhoto" />
                Remove current photo
              </label>
            </>
          )}
          <label>
            Personal notes
            <textarea
              name="personalNotes"
              rows={4}
              maxLength={4000}
              defaultValue={
                p.values.personalNotes == null
                  ? ""
                  : String(p.values.personalNotes)
              }
              placeholder="What made this cup memorable?"
            />
          </label>
          {fieldGroups.slice(1).map((group) => (
            <details key={group.title}>
              <summary>{group.title}</summary>
              {fields(group)}
            </details>
          ))}
          <div className="form-actions">
            <a
              className="button secondary"
              href={p.id ? `/coffees/${p.id}` : "/"}
            >
              Cancel
            </a>
            <button className="button">
              {p.id ? "Save changes" : "Add to my collection"} →
            </button>
          </div>
        </form>
      </Page>
    );
  };
}
export function CoffeePage(
  handle: Handle<{
    coffee: Coffee;
    deleting?: boolean;
    tastingError?: string;
    tastingValues?: Record<string, string>;
  }>,
) {
  return () => {
    const c = handle.props.coffee;
    const tastings = (c.tastings ?? [])
      .map((tasting, index) => ({ ...tasting, index }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.index - a.index);
    const average = tastings.length
      ? (
          tastings.reduce((sum, tasting) => sum + tasting.rating, 0) /
          tastings.length
        ).toFixed(1)
      : "—";
    const values = handle.props.tastingValues ?? {};
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return (
      <Page title={c.name} active="collection">
        <a className="back" href="/">
          ← The collection
        </a>
        {handle.props.deleting ? (
          <section className="panel narrow">
            <h1>Delete this coffee?</h1>
            <p>“{c.name}” and its notes will be permanently removed.</p>
            <form
              method="post"
              action={`/coffees/${c.id}/delete`}
              className="form-actions"
            >
              <a className="button secondary" href={`/coffees/${c.id}`}>
                Keep coffee
              </a>
              <button className="button danger">Delete coffee</button>
            </form>
          </section>
        ) : (
          <>
            <section className="detail-heading">
              <div>
                <span className="eyebrow">{c.brand || "YOUR COLLECTION"}</span>
                <h1>{c.name}</h1>
                <div
                  className="tags tasting-summary"
                  aria-label="Coffee and tasting ratings"
                >
                  <span>My rating: {c.myRating ?? "—"} / 10</span>
                  <span>{tastings.length} tastings</span>
                  <span>Tasting average: {average} / 10</span>
                  {tastings[0] && (
                    <span>Latest tasting: {tastings[0].rating} / 10</span>
                  )}
                </div>
                <p className="muted">
                  {[c.country, c.region].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="detail-actions">
                <form method="post" action={`/coffees/${c.id}/favorite`}>
                  <button className="button secondary">
                    {c.isFavorite ? "♥ Favorite" : "♡ Favorite"}
                  </button>
                </form>
                <a className="button" href={`/coffees/${c.id}/edit`}>
                  Edit coffee
                </a>
              </div>
            </section>
            <div className="detail-grid">
              <aside>
                {c.photoPath ? (
                  <img
                    className="detail-photo"
                    src={c.photoPath}
                    alt={c.name}
                  />
                ) : (
                  <div className="detail-placeholder">
                    ☕<span>A good coffee has a story.</span>
                  </div>
                )}
                <div className="panel rating-panel">
                  <span className="eyebrow">YOUR VERDICT</span>
                  <strong>
                    {c.myRating ?? "—"}
                    <small> / 10</small>
                  </strong>
                  <p className="tasting">
                    {c.tastingNotes || "Take a sip. Make a note."}
                  </p>
                </div>
              </aside>
              <div className="detail-sections">
                <section className="panel" id="tastings">
                  <h2>
                    Tasting log <span className="count">{tastings.length}</span>
                  </h2>
                  {tastings.length ? (
                    <ol className="tasting-list">
                      {tastings.map((tasting) => (
                        <li key={tasting.index}>
                          <div className="tasting-row">
                            <div>
                              <time dateTime={tasting.date}>
                                {tasting.date}
                              </time>
                              <p className="notes">{tasting.method}</p>
                            </div>
                            <span className="rating tasting-rating">
                              ★ {tasting.rating} / 10
                            </span>
                            <form
                              method="post"
                              action={`/coffees/${c.id}/tastings/${tasting.index}/delete`}
                            >
                              <button
                                className="button secondary"
                                aria-label={`Delete tasting: ${tasting.date}, ${tasting.method}`}
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                          {tasting.notes && (
                            <p className="notes small">{tasting.notes}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="muted">
                      No tastings yet. Record your first cup below.
                    </p>
                  )}
                  <h3>Add a tasting</h3>
                  {handle.props.tastingError && (
                    <p role="alert" className="error">
                      {handle.props.tastingError}
                    </p>
                  )}
                  <form method="post" action={`/coffees/${c.id}/tastings`}>
                    <div className="form-grid">
                      <label>
                        Date
                        <input
                          type="date"
                          name="date"
                          required
                          defaultValue={values.date ?? today}
                        />
                      </label>
                      <label>
                        Preparation method
                        <input
                          type="text"
                          name="method"
                          required
                          maxLength={200}
                          placeholder="Espresso, v60, french press…"
                          defaultValue={values.method ?? ""}
                        />
                      </label>
                      <label>
                        Rating (0–10)
                        <input
                          type="number"
                          name="rating"
                          required
                          min={0}
                          max={10}
                          step="any"
                          defaultValue={values.rating ?? ""}
                        />
                      </label>
                      <label>
                        Notes (optional)
                        <textarea
                          name="notes"
                          rows={3}
                          maxLength={4000}
                          placeholder="After breakfast, with milk, tastes better today…"
                          defaultValue={values.notes ?? ""}
                        />
                      </label>
                    </div>
                    <div className="form-actions">
                      <button className="button">Add tasting</button>
                    </div>
                  </form>
                </section>
                {c.personalNotes && (
                  <section className="panel">
                    <h2>Personal notes</h2>
                    <p className="notes">{c.personalNotes}</p>
                  </section>
                )}
                {fieldGroups.map((group) => {
                  const entries = group.fields.filter(
                    ([key]) =>
                      !["name", "myRating", "tastingNotes"].includes(key) &&
                      c[key] != null &&
                      c[key] !== "",
                  );
                  return entries.length ? (
                    <section className="panel" key={group.title}>
                      <h2>{group.title}</h2>
                      <dl>
                        {entries.map(([key, label]) => (
                          <div key={key}>
                            <dt>{label}</dt>
                            <dd>{String(c[key])}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ) : null;
                })}
                <p className="muted small">
                  Added {c.createdAt.slice(0, 10)} · Updated{" "}
                  {c.updatedAt.slice(0, 10)}
                </p>
                <a className="delete-link" href={`/coffees/${c.id}/delete`}>
                  Delete this coffee
                </a>
              </div>
            </div>
          </>
        )}
      </Page>
    );
  };
}
export function ConnectPage(
  handle: Handle<{
    origin: string;
    pending?: PendingAuthorization;
    pendingId?: string;
    revoked?: boolean;
  }>,
) {
  return () => {
    const p = handle.props;
    return (
      <Page title="Your assistants" active="connect">
        <section className="form-heading">
          <span className="eyebrow">A LITTLE HELP WITH YOUR JOURNAL</span>
          <h1>
            {p.pending ? "Connect your assistant." : "Coffee, in conversation."}
          </h1>
          <p className="muted">
            Let ChatGPT or Claude help you remember, compare, and discover your
            coffees.
          </p>
        </section>
        {p.pending ? (
          <section className="panel narrow">
            <h2>{p.pending.clientName} wants access</h2>
            <p>
              This assistant will be able to read, add, edit, and delete coffees
              in your personal collection.
            </p>
            <p className="muted small">
              Return address:{" "}
              <strong>{new URL(p.pending.redirectUri).origin}</strong>
            </p>
            <p>Only approve if you started this connection.</p>
            <form
              className="form-actions"
              method="post"
              action={`/connect/${p.pendingId}`}
            >
              <button name="decision" value="deny" className="button secondary">
                Cancel
              </button>
              <button name="decision" value="allow" className="button">
                Allow connection
              </button>
            </form>
          </section>
        ) : (
          <div className="connect-grid">
            <section className="panel">
              <h2>Connect ChatGPT or Claude</h2>
              <ol>
                <li>Open your assistant’s custom app or connector settings.</li>
                <li>
                  Add this MCP server URL:
                  <code className="endpoint">{p.origin}/mcp</code>
                </li>
                <li>
                  Choose OAuth if asked. Sign in here with your journal
                  password, then approve the connection.
                </li>
              </ol>
              <p className="muted small">
                Your app needs a public HTTPS address. Custom connector
                availability depends on your assistant account.
              </p>
              <h3>Try asking</h3>
              <blockquote>
                “Add the Ethiopian coffee I tried today. Light roast, notes of
                jasmine and peach, 9 out of 10.”
              </blockquote>
              <blockquote>
                “Which of my favorite coffees have fruity tasting notes?”
              </blockquote>
            </section>
            <section className="panel">
              <h2>You stay in control</h2>
              <p>
                Connections only gain access after you approve them. Your
                password stays here.
              </p>
              {p.revoked && (
                <p className="success" role="status">
                  All assistant connections have been revoked.
                </p>
              )}
              <details>
                <summary>Disconnect all assistants</summary>
                <p>
                  Every connected assistant will need your approval again. Your
                  coffee collection stays here.
                </p>
                <form method="post" action="/connect/revoke">
                  <button className="button danger">
                    Disconnect all assistants
                  </button>
                </form>
              </details>
              <h3>Claude Desktop, locally</h3>
              <p className="muted">
                A local stdio connection is also available. See the project
                README for the command and database path.
              </p>
            </section>
          </div>
        )}
      </Page>
    );
  };
}
export function ErrorPage(handle: Handle<{ status: number; message: string }>) {
  return () => (
    <Page title={String(handle.props.status)}>
      <section className="empty panel">
        <h1>{handle.props.status}</h1>
        <p>{handle.props.message}</p>
        <a className="button" href="/">
          Back to my collection
        </a>
      </section>
    </Page>
  );
}
