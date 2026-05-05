import { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import MovieCard from '../components/MovieCard';
import Header from '../components/Header';
import { Search, AlertCircle, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { apiGet } from '../lib/api';
import type { ApiMovie, ApiShowtime } from '../types/api';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router';

export default function Home() {
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const navigate = useNavigate();

  // Hero carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    Promise.all([
      apiGet<ApiMovie[]>('/api/movies'),
      apiGet<ApiShowtime[]>('/api/showtimes'),
    ])
      .then(([allMovies, showtimes]) => {
        const ids = new Set(showtimes.map((s) => s.movie_id));
        setMovies(allMovies.filter((m) => ids.has(m.id)));
      })
      .catch((e) => setError(e?.message || 'Không tải được danh sách phim'))
      .finally(() => setLoading(false));
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (!emblaApi || movies.length === 0) return;
    const interval = setInterval(() => emblaApi.scrollNext(), 5000);
    const onSelect = () => setHeroIdx(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { clearInterval(interval); emblaApi.off('select', onSelect); };
  }, [emblaApi, movies.length]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const genres = ['all', ...Array.from(new Set(movies.map(m => m.genre).filter(Boolean) as string[]))];

  const filteredMovies = movies.filter(movie => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (movie.title_vi || '').toLowerCase().includes(q) ||
      movie.title.toLowerCase().includes(q);
    const matchesGenre = selectedGenre === 'all' || movie.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const heroMovies = movies.filter((m) => m.image && m.image.trim() !== '').slice(0, 5);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      {/* Hero Carousel */}
      {heroMovies.length > 0 && (
        <div className="relative group">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {heroMovies.map((movie, idx) => {
                const titleVi = movie.title_vi || movie.title;
                return (
                  <div key={movie.id} className="flex-[0_0_100%] min-w-0 relative h-[560px]">
                    {/* BG image */}
                    <div className="absolute inset-0">
                      {movie.image && (
                        <img
                          src={movie.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/30" />
                    </div>

                    {/* Content */}
                    <div className="relative z-10 h-full flex items-center">
                      <div className="container mx-auto px-4 flex items-center gap-8">
                        {/* Poster */}
                        <div className="hidden md:block flex-shrink-0">
                          <img
                            src={movie.image || ''}
                            alt={titleVi}
                            className="w-52 h-[312px] object-cover rounded-lg shadow-2xl ring-2 ring-red-600/40"
                          />
                        </div>
                        {/* Info */}
                        <div className="max-w-xl">
                          <div className="flex items-center gap-3 mb-3">
                            {movie.rating && (
                              <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                                {movie.rating}
                              </span>
                            )}
                            {movie.genre && (
                              <span className="text-zinc-400 text-sm border border-zinc-700 px-2 py-0.5 rounded">
                                {movie.genre}
                              </span>
                            )}
                            {movie.duration && (
                              <span className="text-zinc-500 text-sm">{movie.duration} phút</span>
                            )}
                          </div>
                          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-2 leading-tight">
                            {titleVi}
                          </h1>
                          <p className="text-lg text-zinc-400 mb-2">{movie.title}</p>
                          <p className="text-zinc-400 text-sm leading-relaxed mb-6 line-clamp-3">
                            {movie.description}
                          </p>
                          <div className="flex items-center gap-3">
                            <Button
                              size="lg"
                              className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-600/30 transition-all hover:shadow-red-600/50 hover:scale-105"
                              onClick={() => navigate(`/movie/${movie.id}`)}
                            >
                              Mua Vé Ngay
                            </Button>
                            {movie.trailer && (
                              <Button
                                size="lg"
                                variant="outline"
                                className="border-zinc-600 text-zinc-300 hover:border-red-600 hover:text-red-500 hover:bg-red-600/10"
                                onClick={() => window.open(movie.trailer!, '_blank')}
                              >
                                <Play className="w-4 h-4 mr-2 fill-current" />
                                Trailer
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Arrows */}
          <button
            onClick={scrollPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-red-600/80 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-red-600/80 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {heroMovies.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === heroIdx
                    ? 'w-8 bg-red-600'
                    : 'w-4 bg-zinc-600 hover:bg-zinc-400'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              id="search-movies"
              type="text"
              placeholder="Tìm kiếm phim..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {genres.map(genre => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-5 py-2.5 rounded-xl whitespace-nowrap transition-all text-sm font-medium ${
                  selectedGenre === genre
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:border-red-600/50 hover:text-red-500'
                }`}
              >
                {genre === 'all' ? 'Tất cả' : genre}
              </button>
            ))}
          </div>
        </div>

        {/* Section header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 bg-red-600 rounded-full" />
          <h2 className="text-2xl font-bold text-white">Phim đang chiếu</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        ) : filteredMovies.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredMovies.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-lg">Không tìm thấy phim nào</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 mt-16">
        <div className="container mx-auto px-4 py-10">
          <div className="grid md:grid-cols-3 gap-8 text-sm text-zinc-500">
            <div>
              <h4 className="text-red-600 font-bold text-lg mb-3">CGV Cinemas</h4>
              <p>Hệ thống rạp chiếu phim hàng đầu Việt Nam</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Liên kết</h4>
              <ul className="space-y-2">
                <li><a href="/" className="hover:text-red-500 transition">Trang chủ</a></li>
                <li><a href="/" className="hover:text-red-500 transition">Phim đang chiếu</a></li>
                <li><a href="/" className="hover:text-red-500 transition">Rạp CGV</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Chính sách</h4>
              <ul className="space-y-2">
                <li>Điều khoản sử dụng</li>
                <li>Chính sách bảo mật</li>
                <li>Quy chế hoạt động</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-zinc-800/50 text-center text-zinc-600 text-xs">
            © 2026 CGV Cinemas Vietnam. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
