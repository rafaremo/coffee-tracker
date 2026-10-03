import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { ArrowLeft, Save } from "lucide-react";
import { getCoffeeById, updateCoffee } from "~/lib/coffee.server";
import { requireAuth } from "~/lib/session.server";
import PhotoUploader from "~/components/PhotoUploader";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `Edit ${data?.coffee?.name ?? "Coffee"} - Coffee Tracker` },
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
  const data = Object.fromEntries(formData.entries());

  const parsed: Record<string, unknown> = {};

  if (data.photoPath !== undefined) parsed.photoPath = data.photoPath ? String(data.photoPath) : null;
  if (data.name) parsed.name = String(data.name);
  if (data.brand !== undefined) parsed.brand = data.brand ? String(data.brand) : null;
  parsed.isFavorite = data.isFavorite === "true";
  if (data.tags !== undefined) parsed.tags = data.tags ? String(data.tags) : null;
  if (data.personalNotes !== undefined) parsed.personalNotes = data.personalNotes ? String(data.personalNotes) : null;
  if (data.country !== undefined) parsed.country = data.country ? String(data.country) : null;
  if (data.region !== undefined) parsed.region = data.region ? String(data.region) : null;
  if (data.farm !== undefined) parsed.farm = data.farm ? String(data.farm) : null;
  if (data.producer !== undefined) parsed.producer = data.producer ? String(data.producer) : null;
  if (data.altitudeMasl) parsed.altitudeMasl = parseInt(String(data.altitudeMasl), 10);
  else if (data.altitudeMasl === "") parsed.altitudeMasl = null;
  if (data.variety !== undefined) parsed.variety = data.variety ? String(data.variety) : null;
  if (data.process !== undefined) parsed.process = data.process ? String(data.process) : null;
  if (data.harvestDate !== undefined) parsed.harvestDate = data.harvestDate ? String(data.harvestDate) : null;
  if (data.lot !== undefined) parsed.lot = data.lot ? String(data.lot) : null;
  if (data.roastLevel !== undefined) parsed.roastLevel = data.roastLevel ? String(data.roastLevel) : null;
  if (data.roastDate !== undefined) parsed.roastDate = data.roastDate ? String(data.roastDate) : null;
  if (data.roasterNotes !== undefined) parsed.roasterNotes = data.roasterNotes ? String(data.roasterNotes) : null;
  if (data.myRating) parsed.myRating = parseFloat(String(data.myRating));
  else if (data.myRating === "") parsed.myRating = null;
  if (data.scaScore) parsed.scaScore = parseFloat(String(data.scaScore));
  else if (data.scaScore === "") parsed.scaScore = null;
  if (data.tastingNotes !== undefined) parsed.tastingNotes = data.tastingNotes ? String(data.tastingNotes) : null;
  if (data.body !== undefined) parsed.body = data.body ? String(data.body) : null;
  if (data.acidity !== undefined) parsed.acidity = data.acidity ? String(data.acidity) : null;
  if (data.sweetness !== undefined) parsed.sweetness = data.sweetness ? String(data.sweetness) : null;
  if (data.aroma !== undefined) parsed.aroma = data.aroma ? String(data.aroma) : null;
  if (data.aftertaste !== undefined) parsed.aftertaste = data.aftertaste ? String(data.aftertaste) : null;
  if (data.brewingMethods !== undefined) parsed.brewingMethods = data.brewingMethods ? String(data.brewingMethods) : null;
  if (data.purchaseDate !== undefined) parsed.purchaseDate = data.purchaseDate ? String(data.purchaseDate) : null;
  if (data.purchasePlace !== undefined) parsed.purchasePlace = data.purchasePlace ? String(data.purchasePlace) : null;
  if (data.pricePerKg) parsed.pricePerKg = parseFloat(String(data.pricePerKg));
  else if (data.pricePerKg === "") parsed.pricePerKg = null;
  if (data.weightG) parsed.weightG = parseInt(String(data.weightG), 10);
  else if (data.weightG === "") parsed.weightG = null;

  await updateCoffee(Number(params.id), parsed, session.user.id);
  return redirect(`/coffees/${params.id}`);
}

export default function EditCoffee() {
  const { coffee } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to={`/coffees/${coffee.id}`} className="text-coffee-500 hover:text-coffee-800 transition flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-coffee-100 p-8">
        <h1 className="text-2xl font-bold text-coffee-900 font-display mb-6">Edit {coffee.name}</h1>

        <Form method="post" className="space-y-8">
          <Section title="Basic Info" color="amber">
            <PhotoUploader defaultPhotoPath={coffee.photoPath ?? undefined} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Name <span className="text-red-500">*</span></label>
                <input type="text" name="name" defaultValue={coffee.name} required className="form-input" />
              </div>
              <div>
                <label className="form-label">Brand / Roaster</label>
                <input type="text" name="brand" defaultValue={coffee.brand ?? ""} className="form-input" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="isFavorite" value="true" defaultChecked={coffee.isFavorite} className="w-5 h-5 text-red-500 rounded" />
                  <span className="text-sm font-medium text-coffee-700">Favorite</span>
                </label>
              </div>
              <div>
                <label className="form-label">Tags (comma-separated)</label>
                <input type="text" name="tags" defaultValue={coffee.tags ?? ""} className="form-input" />
              </div>
            </div>
          </Section>

          <Section title="Origin & Traceability" color="emerald">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="form-label">Country</label><input type="text" name="country" defaultValue={coffee.country ?? ""} className="form-input" /></div>
              <div><label className="form-label">Region</label><input type="text" name="region" defaultValue={coffee.region ?? ""} className="form-input" /></div>
              <div><label className="form-label">Farm</label><input type="text" name="farm" defaultValue={coffee.farm ?? ""} className="form-input" /></div>
              <div><label className="form-label">Producer</label><input type="text" name="producer" defaultValue={coffee.producer ?? ""} className="form-input" /></div>
              <div><label className="form-label">Altitude (masl)</label><input type="number" name="altitudeMasl" defaultValue={coffee.altitudeMasl ?? ""} className="form-input" /></div>
              <div><label className="form-label">Variety</label><input type="text" name="variety" defaultValue={coffee.variety ?? ""} className="form-input" /></div>
              <div>
                <label className="form-label">Process</label>
                <select name="process" defaultValue={coffee.process ?? ""} className="form-select">
                  <option value="">Select...</option>
                  <option value="Washed">Washed / Wet</option>
                  <option value="Natural">Natural / Dry</option>
                  <option value="Honey">Honey / Pulped Natural</option>
                  <option value="Anaerobic">Anaerobic</option>
                  <option value="Carbonic Maceration">Carbonic Maceration</option>
                  <option value="Wet Hulled">Wet Hulled / Giling Basah</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div><label className="form-label">Harvest Date</label><input type="date" name="harvestDate" defaultValue={coffee.harvestDate ?? ""} className="form-input" /></div>
              <div><label className="form-label">Lot</label><input type="text" name="lot" defaultValue={coffee.lot ?? ""} className="form-input" /></div>
            </div>
          </Section>

          <Section title="Roasting" color="orange">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Roast Level</label>
                <select name="roastLevel" defaultValue={coffee.roastLevel ?? ""} className="form-select">
                  <option value="">Select...</option>
                  <option value="Light">Light</option>
                  <option value="Medium-Light">Medium-Light</option>
                  <option value="Medium">Medium</option>
                  <option value="Medium-Dark">Medium-Dark</option>
                  <option value="Dark">Dark</option>
                </select>
              </div>
              <div><label className="form-label">Roast Date</label><input type="date" name="roastDate" defaultValue={coffee.roastDate ?? ""} className="form-input" /></div>
              <div className="md:col-span-3">
                <label className="form-label">Roaster Notes</label>
                <textarea name="roasterNotes" rows={2} defaultValue={coffee.roasterNotes ?? ""} className="form-textarea" />
              </div>
            </div>
          </Section>

          <Section title="Cupping & Tasting" color="purple">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="form-label">My Rating (0-10)</label><input type="number" step="0.1" min="0" max="10" name="myRating" defaultValue={coffee.myRating ?? ""} className="form-input" /></div>
              <div><label className="form-label">SCA Score (0-100)</label><input type="number" step="0.1" min="0" max="100" name="scaScore" defaultValue={coffee.scaScore ?? ""} className="form-input" /></div>
              <div className="md:col-span-3">
                <label className="form-label">Tasting Notes (comma-separated)</label>
                <input type="text" name="tastingNotes" defaultValue={coffee.tastingNotes ?? ""} className="form-input" />
              </div>
              <div>
                <label className="form-label">Body</label>
                <select name="body" defaultValue={coffee.body ?? ""} className="form-select">
                  <option value="">Select...</option>
                  <option value="Light">Light</option>
                  <option value="Medium">Medium</option>
                  <option value="Full">Full</option>
                  <option value="Heavy">Heavy</option>
                </select>
              </div>
              <div>
                <label className="form-label">Acidity</label>
                <select name="acidity" defaultValue={coffee.acidity ?? ""} className="form-select">
                  <option value="">Select...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Bright">Bright</option>
                  <option value="Citrusy">Citrusy</option>
                </select>
              </div>
              <div>
                <label className="form-label">Sweetness</label>
                <select name="sweetness" defaultValue={coffee.sweetness ?? ""} className="form-select">
                  <option value="">Select...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div><label className="form-label">Aroma</label><input type="text" name="aroma" defaultValue={coffee.aroma ?? ""} className="form-input" /></div>
              <div><label className="form-label">Aftertaste</label><input type="text" name="aftertaste" defaultValue={coffee.aftertaste ?? ""} className="form-input" /></div>
            </div>
          </Section>

          <Section title="Brewing & Purchase" color="blue">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="form-label">Brewing Methods (comma-separated)</label>
                <input type="text" name="brewingMethods" defaultValue={coffee.brewingMethods ?? ""} className="form-input" />
              </div>
              <div><label className="form-label">Purchase Date</label><input type="date" name="purchaseDate" defaultValue={coffee.purchaseDate ?? ""} className="form-input" /></div>
              <div><label className="form-label">Purchase Place</label><input type="text" name="purchasePlace" defaultValue={coffee.purchasePlace ?? ""} className="form-input" /></div>
              <div><label className="form-label">Price per kg</label><input type="number" step="0.01" name="pricePerKg" defaultValue={coffee.pricePerKg ?? ""} className="form-input" /></div>
              <div><label className="form-label">Weight (g)</label><input type="number" name="weightG" defaultValue={coffee.weightG ?? ""} className="form-input" /></div>
            </div>
          </Section>

          <Section title="Personal Notes" color="stone">
            <textarea name="personalNotes" rows={4} defaultValue={coffee.personalNotes ?? ""} className="form-textarea" />
          </Section>

          <div className="flex items-center justify-end gap-4 pt-4">
            <Link to={`/coffees/${coffee.id}`} className="text-coffee-500 hover:text-coffee-800 transition px-4 py-2">Cancel</Link>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4 mr-2" /> Update Coffee
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    amber: "text-amber-600 border-amber-200",
    emerald: "text-emerald-600 border-emerald-200",
    orange: "text-orange-600 border-orange-200",
    purple: "text-purple-600 border-purple-200",
    blue: "text-blue-600 border-blue-200",
    stone: "text-stone-600 border-stone-200",
  };

  return (
    <div>
      <h2 className={`text-lg font-semibold mb-4 pb-2 border-b ${colors[color] || colors.stone}`}>
        {title}
      </h2>
      {children}
    </div>
  );
}
