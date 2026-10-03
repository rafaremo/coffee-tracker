import type { LoaderFunctionArgs, MetaFunction, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, Form } from "@remix-run/react";
import { ArrowLeft, Heart, Edit2, Trash2, Globe, MapPin, Leaf, FlaskConical, Mountain, Building2, User, Hash, Calendar, Flame, Star, Award, Wine, Droplets, Candy, Wind, Clock, Coffee, ShoppingCart, Tag } from "lucide-react";
import { getCoffeeById, deleteCoffee } from "~/lib/coffee.server";
import { requireAuth } from "~/lib/session.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `${data?.coffee?.name ?? "Coffee"} - Coffee Tracker` },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await requireAuth(request);
  const coffee = await getCoffeeById(Number(params.id), session.user.id);
  if (!coffee) throw new Response("Not Found", { status: 404 });
  return json({ coffee });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await requireAuth(request);
  const existing = await getCoffeeById(Number(params.id), session.user.id);
  if (!existing) throw new Response("Not Found", { status: 404 });
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "delete") {
    await deleteCoffee(Number(params.id), session.user.id);
    return redirect("/coffees");
  }
  return null;
}

export default function CoffeeDetail() {
  const { coffee } = useLoaderData<typeof loader>();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link to="/coffees" className="text-coffee-500 hover:text-coffee-800 transition flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to list
        </Link>
        <div className="flex items-center gap-2">
          <Link to={`/coffees/${coffee.id}/edit`} className="btn-secondary text-sm">
            <Edit2 className="w-4 h-4 mr-1.5" /> Edit
          </Link>
          <Form method="post" className="inline" onSubmit={(e) => { if (!confirm("Delete this coffee?")) e.preventDefault(); }}>
            <input type="hidden" name="intent" value="delete" />
            <button type="submit" className="btn-danger text-sm">
              <Trash2 className="w-4 h-4 mr-1.5" /> Delete
            </button>
          </Form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Photo & Basic Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-coffee-100 overflow-hidden mb-6">
            <div className="h-72 bg-coffee-100 relative overflow-hidden">
              {coffee.photoPath ? (
                <img src={coffee.photoPath} alt={coffee.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-coffee-300">
                  <Coffee className="w-20 h-20" />
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-coffee-900 font-display">{coffee.name}</h1>
                {coffee.isFavorite && <Heart className="w-6 h-6 text-red-500 fill-red-500" />}
              </div>
              {coffee.brand && <p className="text-coffee-500 text-lg">{coffee.brand}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {coffee.country && (
                  <span className="tag"><Globe className="w-3 h-3 mr-1" />{coffee.country}</span>
                )}
                {coffee.region && (
                  <span className="tag"><MapPin className="w-3 h-3 mr-1" />{coffee.region}</span>
                )}
              </div>
            </div>
          </div>

          {/* Rating Card */}
          <div className="bg-white rounded-xl shadow-sm border border-coffee-100 p-6">
            <h3 className="font-semibold text-lg mb-4 text-coffee-800 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" /> Ratings
            </h3>
            <div className="space-y-3">
              {coffee.myRating != null && (
                <div className="flex items-center justify-between">
                  <span className="text-coffee-600">My Rating</span>
                  <span className="font-bold text-amber-600 text-lg">{coffee.myRating} <span className="text-coffee-400 text-sm">/ 10</span></span>
                </div>
              )}
              {coffee.scaScore != null && (
                <div className="flex items-center justify-between">
                  <span className="text-coffee-600">SCA Score</span>
                  <span className="font-bold text-emerald-600 text-lg">{coffee.scaScore} <span className="text-coffee-400 text-sm">/ 100</span></span>
                </div>
              )}
              {coffee.myRating == null && coffee.scaScore == null && (
                <p className="text-coffee-400 text-center py-2">No ratings yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Origin */}
          <DetailCard title="Origin & Traceability" icon={<Globe className="w-5 h-5 text-emerald-500" />}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailField label="Variety" value={coffee.variety} icon={<Leaf className="w-3.5 h-3.5" />} />
              <DetailField label="Process" value={coffee.process} icon={<FlaskConical className="w-3.5 h-3.5" />} />
              <DetailField label="Altitude" value={coffee.altitudeMasl ? `${coffee.altitudeMasl} masl` : null} icon={<Mountain className="w-3.5 h-3.5" />} />
              <DetailField label="Farm" value={coffee.farm} icon={<Building2 className="w-3.5 h-3.5" />} />
              <DetailField label="Producer" value={coffee.producer} icon={<User className="w-3.5 h-3.5" />} />
              <DetailField label="Harvest" value={coffee.harvestDate} icon={<Calendar className="w-3.5 h-3.5" />} />
              <DetailField label="Lot" value={coffee.lot} icon={<Hash className="w-3.5 h-3.5" />} />
            </div>
          </DetailCard>

          {/* Roasting */}
          <DetailCard title="Roasting" icon={<Flame className="w-5 h-5 text-orange-500" />}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailField label="Roast Level" value={coffee.roastLevel} />
              <DetailField label="Roast Date" value={coffee.roastDate} />
              {coffee.roasterNotes && (
                <div className="col-span-full">
                  <span className="text-coffee-400 text-xs uppercase tracking-wide">Roaster Notes</span>
                  <p className="text-coffee-700 mt-1">{coffee.roasterNotes}</p>
                </div>
              )}
            </div>
          </DetailCard>

          {/* Cupping */}
          <DetailCard title="Cupping Notes" icon={<Wine className="w-5 h-5 text-purple-500" />}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {coffee.tastingNotes && (
                <div className="col-span-full">
                  <span className="text-coffee-400 text-xs uppercase tracking-wide">Tasting Notes</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {coffee.tastingNotes.split(",").map((note) => (
                      <span key={note} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm">{note.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
              <DetailField label="Body" value={coffee.body} icon={<Droplets className="w-3.5 h-3.5" />} />
              <DetailField label="Acidity" value={coffee.acidity} icon={<Wind className="w-3.5 h-3.5" />} />
              <DetailField label="Sweetness" value={coffee.sweetness} icon={<Candy className="w-3.5 h-3.5" />} />
              <DetailField label="Aroma" value={coffee.aroma} />
              <DetailField label="Aftertaste" value={coffee.aftertaste} />
            </div>
          </DetailCard>

          {/* Brewing & Purchase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailCard title="Brewing Methods" icon={<Coffee className="w-5 h-5 text-blue-500" />}>
              {coffee.brewingMethods ? (
                <div className="flex flex-wrap gap-2">
                  {coffee.brewingMethods.split(",").map((method) => (
                    <span key={method} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      <Coffee className="w-3 h-3" />{method.trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-coffee-400">No brewing methods recorded</p>
              )}
            </DetailCard>
            <DetailCard title="Purchase Info" icon={<ShoppingCart className="w-5 h-5 text-green-500" />}>
              <div className="space-y-2">
                <DetailField label="Date" value={coffee.purchaseDate} />
                <DetailField label="Place" value={coffee.purchasePlace} />
                <DetailField label="Price/kg" value={coffee.pricePerKg ? `$${coffee.pricePerKg.toFixed(2)}` : null} />
                <DetailField label="Weight" value={coffee.weightG ? `${coffee.weightG}g` : null} />
              </div>
            </DetailCard>
          </div>

          {coffee.personalNotes && (
            <div className="bg-latte-100 rounded-xl p-6 border border-latte-200">
              <h3 className="font-semibold text-lg mb-2 text-amber-800 flex items-center gap-2">
                <Tag className="w-5 h-5" /> Personal Notes
              </h3>
              <p className="text-amber-900 whitespace-pre-wrap">{coffee.personalNotes}</p>
            </div>
          )}

          {coffee.tags && (
            <div className="flex flex-wrap gap-2">
              {coffee.tags.split(",").map((tag) => (
                <span key={tag} className="bg-coffee-100 text-coffee-700 px-3 py-1 rounded-full text-sm">#{tag.trim()}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-coffee-100 p-6">
      <h3 className="section-title flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function DetailField({ label, value, icon }: { label: string; value: string | number | null; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-coffee-400 text-xs uppercase tracking-wide flex items-center gap-1">
        {icon}
        {label}
      </span>
      <p className="font-medium text-coffee-800">{value}</p>
    </div>
  );
}
