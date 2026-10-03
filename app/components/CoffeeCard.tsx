import { Link } from "@remix-run/react";
import { Heart, Coffee, Globe, Leaf, FlaskConical, Flame } from "lucide-react";
import type { CoffeeEntry } from "@prisma/client";

interface Props {
  coffee: CoffeeEntry;
}

export default function CoffeeCard({ coffee }: Props) {
  return (
    <Link
      to={`/coffees/${coffee.id}`}
      className="coffee-card bg-white rounded-xl shadow-sm border border-coffee-100 overflow-hidden block"
    >
      <div className="h-48 bg-coffee-100 relative overflow-hidden">
        {coffee.photoPath ? (
          <img src={coffee.photoPath} alt={coffee.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-coffee-300">
            <Coffee className="w-16 h-16" />
          </div>
        )}
        {coffee.isFavorite && (
          <div className="absolute top-3 right-3 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow">
            <Heart className="w-4 h-4 fill-current" />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-bold text-lg text-coffee-900 leading-tight">{coffee.name}</h3>
          {coffee.myRating != null && (
            <span className="text-amber-500 text-sm font-bold flex items-center gap-0.5">
              {coffee.myRating}
              <span className="text-xs">★</span>
            </span>
          )}
        </div>
        {coffee.brand && <p className="text-coffee-500 text-sm mb-3">{coffee.brand}</p>}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {coffee.country && (
            <span className="tag">
              <Globe className="w-3 h-3 mr-1" />
              {coffee.country}
            </span>
          )}
          {coffee.variety && (
            <span className="tag">
              <Leaf className="w-3 h-3 mr-1" />
              {coffee.variety}
            </span>
          )}
          {coffee.process && (
            <span className="tag">
              <FlaskConical className="w-3 h-3 mr-1" />
              {coffee.process}
            </span>
          )}
          {coffee.roastLevel && (
            <span className="tag">
              <Flame className="w-3 h-3 mr-1" />
              {coffee.roastLevel}
            </span>
          )}
        </div>
        {coffee.tastingNotes && (
          <p className="text-coffee-400 text-xs italic truncate">{coffee.tastingNotes}</p>
        )}
      </div>
    </Link>
  );
}
