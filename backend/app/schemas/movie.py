from typing import Optional, List
from pydantic import BaseModel


class MovieCreate(BaseModel):
    title: str
    duration: int
    age_restriction: int
    genres: List[str] = []


class MovieOut(BaseModel):
    """Stable JSON shape — fields the strict schema doesn't have are null."""
    id: int
    title: str
    duration: int
    age_restriction: int
    genre: Optional[str] = None              # joined from MOVIE_GENRE (first genre)
    rating: Optional[str] = None             # derived from age_restriction
    # Kept for FE compatibility but always None in strict mode:
    title_vi: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    trailer: Optional[str] = None
    director: Optional[str] = None
    cast: Optional[str] = None
    release_date: Optional[str] = None
    is_active: bool = True


# Stable poster URLs keyed by movie title. The strict SQL has no Image
# column, so we return demo posters mapped by title for the FE.
POSTERS = {
    "Avengers: Hồi Kết": "https://www.movieposters.com/cdn/shop/products/108b520c55e3c9760f77a06110d6a73b_1024x1024.jpg?v=1762485782",
    "Inception: Kẻ Đánh Cắp Giấc Mơ": "https://wsrv.nl/?url=image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    "Những Mảnh Ghép Cảm Xúc 2": "https://wsrv.nl/?url=image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
    "Ký Sinh Trùng": "https://wsrv.nl/?url=image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    "Hoppers": "https://wsrv.nl/?url=image.tmdb.org/t/p/w500/xjtWQ2CL1mpmMNwuU5HeS4Iuwuu.jpg",
    "Despicable Me": "https://wsrv.nl/?url=image.tmdb.org/t/p/original/txfb1LyIEGJ69wTPJUiyufZVN4A.jpg",
    "F1 The Movie": "https://media-cache.cinematerial.com/p/500x/l94wgadr/f1-the-movie-movie-poster.jpg?v=1748905004",
    "Fast X": "https://wsrv.nl/?url=image.tmdb.org/t/p/original/aAngiE34BMFDTOXpjc04Lr8zsX1.jpg",
    "Avengers: Age of Ultron": "https://cdn11.bigcommerce.com/s-yzgoj/images/stencil/1280x1280/products/3234477/6220791/GPE4916__21334.1709712391.jpg?c=2",
    "Interstellar": "https://mythicwall.com/cdn/shop/files/Interstellar_2BMovie_2B_2Bposter_2BPrint_2BWall_2BArt_2BPoster_2B1-W0pfS_grande.jpg?v=1762442294",
    "The Dark Knight": "https://www.tallengestore.com/cdn/shop/products/03_1acee272-fb7c-47c5-97b0-37c2bdfb600a.jpg?v=1485870150",
    "Avatar": "https://cdng.europosters.eu/pod_public/750/262963.jpg",
    "Avatar: The Way of Water": "https://www.movieposters.com/cdn/shop/products/avatar-the-way-of-water_sncuhzap_1024x1024.jpg?v=1762971780",
    "Avatar: Fire and Ash": "https://m.media-amazon.com/images/I/71OioRQjVQL.jpg",
    "The Lord of the Rings: The Return of the King": "https://cdng.europosters.eu/pod_public/750/105095.jpg",
}


def _age_to_label(age: int) -> str:
    if age <= 0:    return "P"
    if age <= 13:   return "13+"
    if age <= 16:   return "16+"
    return "18+"


def movie_to_out(m) -> MovieOut:
    genre = m.genres[0].Genre if m.genres else None
    return MovieOut(
        id=m.Movie_ID,
        title=m.Title,
        duration=m.Duration,
        age_restriction=m.Age_Restriction,
        genre=genre,
        rating=_age_to_label(m.Age_Restriction),
        image=POSTERS.get(m.Title),
    )
