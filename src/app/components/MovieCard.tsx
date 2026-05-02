import { Link } from 'react-router';
import type { ApiMovie } from '../types/api';
import { Clock, Calendar } from 'lucide-react';
import { Badge } from './ui/badge';

interface MovieCardProps {
  movie: ApiMovie;
}

const FALLBACK_POSTER = 'https://placehold.co/400x600/27272a/f97316?text=No+Image';

export default function MovieCard({ movie }: MovieCardProps) {
  const titleVi = movie.title_vi || movie.title;
  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group block bg-zinc-900/80 rounded-xl overflow-hidden hover:ring-2 hover:ring-red-600/60 transition-all duration-300 border border-zinc-800/50 hover:shadow-2xl hover:shadow-red-600/10 hover:-translate-y-1"
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={movie.image || FALLBACK_POSTER}
          alt={titleVi}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_POSTER; }}
        />
        {/* Hover overlay with Buy button */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
          <span className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg shadow-lg shadow-red-600/30 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            Mua Vé
          </span>
        </div>
        {movie.rating && (
          <div className="absolute top-3 right-3">
            <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 text-xs font-bold shadow-lg">
              {movie.rating}
            </Badge>
          </div>
        )}
        {/* Gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-900/80 to-transparent" />
      </div>

      <div className="p-4">
        <h3 className="text-base font-bold text-white mb-1 line-clamp-1 group-hover:text-red-500 transition-colors">
          {titleVi}
        </h3>
        <p className="text-xs text-zinc-500 mb-3 line-clamp-1">{movie.title}</p>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {movie.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{movie.duration}'</span>
            </div>
          )}
          {movie.release_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(movie.release_date).toLocaleDateString('vi-VN')}</span>
            </div>
          )}
        </div>

        {movie.genre && (
          <div className="mt-3 pt-3 border-t border-zinc-800/50">
            <span className="text-xs text-red-500 font-semibold">{movie.genre}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
