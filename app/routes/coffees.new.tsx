import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, Link } from "@remix-run/react";
import { ArrowLeft, Save } from "lucide-react";
import PhotoUploader from "~/components/PhotoUploader";
import { createCoffee } from "~/lib/coffee.server";
import { requireAuth } from "~/lib/session.server";
import PhotoUploader from "~/components/PhotoUploader";

export const meta: MetaFunction = () => [
  { title: "Add Coffee - Coffee Tracker" },
];

export async function action({ request }: ActionFunctionArgs) {
  const session = await requireAuth(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData.entries());

  const parsed: Record<string, unknown> = {
    userId: session.user.id,
    name: String(data.name),
    brand: data.brand ? String(data.brand) : null,
    isFavorite: data.isFavorite === "true",
    tags: data.tags ? String(data.tags) : null,
    personalNotes: data.personalNotes ? String(data.personalNotes) : null,
    country: data.country ? String(data.country) : null,
    region: data.region ? String(data.region) : null,
    farm: data.farm ? String(data.farm) : null,
    producer: data.producer ? String(data.producer) : null,
    altitudeMasl: data.altitudeMasl ? parseInt(String(data.altitudeMasl), 10) : null,
    variety: data.variety ? String(data.variety) : null,
    process: data.process ? String(data.process) : null,
    harvestDate: data.harvestDate ? String(data.harvestDate) : null,
    lot: data.lot ? String(data.lot) : null,
    roastLevel: data.roastLevel ? String(data.roastLevel) : null,
    roastDate: data.roastDate ? String(data.roastDate) : null,
    roasterNotes: data.roasterNotes ? String(data.roasterNotes) : null,
    myRating: data.myRating ? parseFloat(String(data.myRating)) : null,
    scaScore: data.scaScore ? parseFloat(String(data.scaScore)) : null,
    tastingNotes: data.tastingNotes ? String(data.tastingNotes) : null,
    body: data.body ? String(data.body) : null,
    acidity: data.acidity ? String(data.acidity) : null,
    sweetness: data.sweetness ? String(data.sweetness) : null,
    aroma: data.aroma ? String(data.aroma) : null,
    aftertaste: data.aftertaste ? String(data.aftertaste) : null,
    brewingMethods: data.brewingMethods ? String(data.brewingMethods) : null,
    purchaseDate: data.purchaseDate ? String(data.purchaseDate) : null,
    purchasePlace: data.purchasePlace ? String(data.purchasePlace) : null,
    pricePerKg: data.pricePerKg ? parseFloat(String(data.pricePerKg)) : null,
    weightG: data.weightG ? parseInt(String(data.weightG), 10) : null,
  };

  const coffee = await createCoffee(parsed);
  return redirect(`/coffees/${coffee.id}`);
}

export default function AddCoffee() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/coffees" className="text-coffee-500 hover:text-coffee-800 transition flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-coffee-100 p-8">
        <h1 className="text-2xl font-bold text-coffee-900 font-display mb-6">Add New Coffee</h1>

        <Form method="post" className="space-y-8">
          {/* Basic Info */}
          <Section title="Basic Info" color="amber">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Name <span className="text-red-500">*</span></label>
                <input type="text" name="name" required className="form-input" />
              </div>
              <div>
                <label className="form-label">Brand / Roaster</label>
                <input type="text" name="brand" className="form-input" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="isFavorite" value="true" className="w-5 h-5 text-red-500 rounded" />
                  <span className="text-sm font-medium text-coffee-700">Favorite</span>
                </label>
              </div>
              <div>
                <label className="form-label">Tags (comma-separated)</label>
                <input type="text" name="tags" placeholder="specialty, single-origin, organic" className="form-input" />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Photo</label>
                <PhotoUploader />
              </div>
            </div>
          </Section>

          {/* Origin */}
          <Section title="Origin & Traceability" color="emerald">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Country</label>
                <input type="text" name="country" placeholder="Ethiopia, Colombia, Guatemala..." className="form-input" />
              </div>
              <div>
                <label className="form-label">Region</label>
                <input type="text" name="region" placeholder="Yirgacheffe, Huila, Antigua..." className="form-input" />
              </div>
              <div>
                <label className="form-label">Farm</label>
                <input type="text" name="farm" className="form-input" />
              </div>
              <div>
                <label className="form-label">Producer</label>
                <input type="text" name="producer" className="form-input" />
              </div>
              <div>
                <label className="form-label">Altitude (masl)</label>
                <input type="number" name="altitudeMasl" placeholder="e.g. 1800" className="form-input" />
              </div>
              <div>
                <label className="form-label">Variety</label>
                <input type="text" name="variety" placeholder="Bourbon, Geisha, Caturra..." className="form-input" />
              </div>
              <div>
                <label className="form-label">Process</label>
                <select name="process" className="form-select">
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
              <div>
                <label className="form-label">Harvest Date</label>
                <input type="date" name="harvestDate" className="form-input" />
              </div>
              <div>
                <label className="form-label">Lot</label>
                <input type="text" name="lot" className="form-input" />
              </div>
            </div>
          </Section>

          {/* Roasting */}
          <Section title="Roasting" color="orange">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Roast Level</label>
                <select name="roastLevel" className="form-select">
                  <option value="">Select...</option>
                  <option value="Light">Light</option>
                  <option value="Medium-Light">Medium-Light</option>
                  <option value="Medium">Medium</option>
                  <option value="Medium-Dark">Medium-Dark</option>
                  <option value="Dark">Dark</option>
                </select>
              </div>
              <div>
                <label className="form-label">Roast Date</label>
                <input type="date" name="roastDate" className="form-input" />
              </div>
              <div className="md:col-span-3">
                <label className="form-label">Roaster Notes</label>
                <textarea name="roasterNotes" rows={2} className="form-textarea" />
              </div>
            </div>
          </Section>

          {/* Cupping */}
          <Section title="Cupping & Tasting" color="purple">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">My Rating (0-10)</label>
                <input type="number" step="0.1" min="0" max="10" name="myRating" className="form-input" />
              </div>
              <div>
                <label className="form-label">SCA Score (0-100)</label>
                <input type="number" step="0.1" min="0" max="100" name="scaScore" className="form-input" />
              </div>
              <div className="md:col-span-3">
                <label className="form-label">Tasting Notes (comma-separated)</label>
                <input type="text" name="tastingNotes" placeholder="floral, citrus, chocolate, berries, caramel..." className="form-input" />
              </div>
              <div>
                <label className="form-label">Body</label>
                <select name="body" className="form-select">
                  <option value="">Select...</option>
                  <option value="Light">Light</option>
                  <option value="Medium">Medium</option>
                  <option value="Full">Full</option>
                  <option value="Heavy">Heavy</option>
                </select>
              </div>
              <div>
                <label className="form-label">Acidity</label>
                <select name="acidity" className="form-select">
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
                <select name="sweetness" className="form-select">
                  <option value="">Select...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="form-label">Aroma</label>
                <input type="text" name="aroma" className="form-input" />
              </div>
              <div>
                <label className="form-label">Aftertaste</label>
                <input type="text" name="aftertaste" className="form-input" />
              </div>
            </div>
          </Section>

          {/* Brewing & Purchase */}
          <Section title="Brewing & Purchase" color="blue">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="form-label">Brewing Methods (comma-separated)</label>
                <input type="text" name="brewingMethods" placeholder="V60, Aeropress, Espresso, Chemex, French Press..." className="form-input" />
              </div>
              <div>
                <label className="form-label">Purchase Date</label>
                <input type="date" name="purchaseDate" className="form-input" />
              </div>
              <div>
                <label className="form-label">Purchase Place</label>
                <input type="text" name="purchasePlace" className="form-input" />
              </div>
              <div>
                <label className="form-label">Price per kg</label>
                <input type="number" step="0.01" name="pricePerKg" className="form-input" />
              </div>
              <div>
                <label className="form-label">Weight (g)</label>
                <input type="number" name="weightG" className="form-input" />
              </div>
            </div>
          </Section>

          {/* Personal Notes */}
          <Section title="Personal Notes" color="stone">
            <textarea name="personalNotes" rows={4} placeholder="Your thoughts about this coffee..." className="form-textarea" />
          </Section>

          <div className="flex items-center justify-end gap-4 pt-4">
            <Link to="/coffees" className="text-coffee-500 hover:text-coffee-800 transition px-4 py-2">Cancel</Link>
            <button type="submit" className="btn-primary">
              <Save className="w-4 h-4 mr-2" /> Add Coffee
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
