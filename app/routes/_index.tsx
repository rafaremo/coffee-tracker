import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { Coffee, Heart, Star, Award, Globe, Leaf, FlaskConical, Flame, Filter, BarChart3 } from "lucide-react";
import { getStats } from "~/lib/coffee.server";
import StatCard from "~/components/StatCard";
import { requireAuth } from "~/lib/session.server";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export const meta: MetaFunction = () => [
  { title: "Dashboard - Coffee Tracker" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireAuth(request);
  const stats = await getStats(session.user.id);
  return json({ stats, user: session.user });
}

function barData(labels: string[], data: number[], color: string) {
  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: color,
        borderRadius: 6,
        barThickness: 32,
      },
    ],
  };
}

function doughnutData(labels: string[], data: number[], colors: string[]) {
  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: "Inter", size: 11 } } },
    x: { ticks: { font: { family: "Inter", size: 11 }, maxRotation: 30 } },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { position: "bottom" as const, labels: { font: { family: "Inter", size: 11 }, padding: 12, boxWidth: 12 } },
  },
};

export default function Dashboard() {
  const { stats } = useLoaderData<typeof loader>();

  const countriesData = barData(
    stats.topCountries.map((c) => c.value),
    stats.topCountries.map((c) => c.count),
    "#10b981"
  );

  const varietiesColors = ["#22c55e", "#16a34a", "#15803d", "#166534", "#14532d", "#86efac"];
  const varietiesData = doughnutData(
    stats.topVarieties.map((v) => v.value),
    stats.topVarieties.map((v) => v.count),
    varietiesColors
  );

  const processColors = ["#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#60a5fa"];
  const processesData = doughnutData(
    stats.topProcesses.map((p) => p.value),
    stats.topProcesses.map((p) => p.count),
    processColors
  );

  const roastData = barData(
    stats.roastLevels.map((r) => r.value),
    stats.roastLevels.map((r) => r.count),
    "#f97316"
  );

  const brewingData = barData(
    stats.topBrewingMethods.map((b) => b.value),
    stats.topBrewingMethods.map((b) => b.count),
    "#a855f7"
  );

  const ratingColors = ["#fca5a5", "#fdba74", "#fcd34d", "#86efac", "#67e8f9"];
  const ratingData = {
    labels: stats.ratingDistribution.map((r) => r.range),
    datasets: [
      {
        label: "Coffees",
        data: stats.ratingDistribution.map((r) => r.count),
        backgroundColor: ratingColors,
        borderRadius: 6,
        barThickness: 40,
      },
    ],
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-coffee-900 font-display">Dashboard</h1>
        <p className="text-coffee-500 mt-1">Your coffee journey at a glance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Coffees"
          value={stats.totalEntries}
          icon={Coffee}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          valueColor="text-coffee-900"
        />
        <StatCard
          title="Favorites"
          value={stats.totalFavorites}
          icon={Heart}
          iconBg="bg-red-100"
          iconColor="text-red-500"
          valueColor="text-red-600"
        />
        <StatCard
          title="Avg Rating"
          value={stats.avgRating ?? "--"}
          icon={Star}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-500"
          valueColor="text-amber-600"
        />
        <StatCard
          title="Avg SCA Score"
          value={stats.avgScaScore ?? "--"}
          icon={Award}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-500"
          valueColor="text-emerald-600"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-coffee-100 p-6">
          <h3 className="section-title flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-500" />
            Top Countries
          </h3>
          {stats.topCountries.length > 0 ? (
            <Bar data={countriesData} options={chartOptions} />
          ) : (
            <p className="text-coffee-400 text-center py-8">No data yet</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-coffee-100 p-6">
          <h3 className="section-title flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-500" />
            Top Varieties
          </h3>
          {stats.topVarieties.length > 0 ? (
            <Doughnut data={varietiesData} options={doughnutOptions} />
          ) : (
            <p className="text-coffee-400 text-center py-8">No data yet</p>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-coffee-100 p-6">
          <h3 className="section-title flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-500" />
            Processing Methods
          </h3>
          {stats.topProcesses.length > 0 ? (
            <Doughnut data={processesData} options={doughnutOptions} />
          ) : (
            <p className="text-coffee-400 text-center py-8">No data yet</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-coffee-100 p-6">
          <h3 className="section-title flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Roast Levels
          </h3>
          {stats.roastLevels.length > 0 ? (
            <Bar data={roastData} options={chartOptions} />
          ) : (
            <p className="text-coffee-400 text-center py-8">No data yet</p>
          )}
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-coffee-100 p-6">
          <h3 className="section-title flex items-center gap-2">
            <Filter className="w-5 h-5 text-purple-500" />
            Favorite Brewing Methods
          </h3>
          {stats.topBrewingMethods.length > 0 ? (
            <Bar data={brewingData} options={chartOptions} />
          ) : (
            <p className="text-coffee-400 text-center py-8">No data yet</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-coffee-100 p-6">
          <h3 className="section-title flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Rating Distribution
          </h3>
          {stats.ratingDistribution.some((r) => r.count > 0) ? (
            <Bar data={ratingData} options={chartOptions} />
          ) : (
            <p className="text-coffee-400 text-center py-8">No data yet</p>
          )}
        </div>
      </div>

      {/* Top Regions & Brands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-coffee-100 p-6">
          <h3 className="section-title flex items-center gap-2">
            <Globe className="w-5 h-5 text-red-500" />
            Top Regions
          </h3>
          <div className="space-y-3">
            {stats.topRegions.length > 0 ? (
              stats.topRegions.map((region) => (
                <div key={region.value} className="flex items-center justify-between">
                  <span className="text-coffee-700">{region.value}</span>
                  <span className="bg-coffee-100 text-coffee-800 px-2.5 py-0.5 rounded-full text-sm font-medium">
                    {region.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-coffee-400 text-center py-4">No regions yet</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-coffee-100 p-6">
          <h3 className="section-title flex items-center gap-2">
            <Coffee className="w-5 h-5 text-coffee-500" />
            Top Brands
          </h3>
          <div className="space-y-3">
            {stats.favoriteBrands.length > 0 ? (
              stats.favoriteBrands.map((brand) => (
                <div key={brand.value} className="flex items-center justify-between">
                  <span className="text-coffee-700">{brand.value}</span>
                  <span className="bg-coffee-100 text-coffee-800 px-2.5 py-0.5 rounded-full text-sm font-medium">
                    {brand.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-coffee-400 text-center py-4">No brands yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
