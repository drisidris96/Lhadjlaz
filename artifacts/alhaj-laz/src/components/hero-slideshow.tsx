import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import kidsImg from "@assets/stock_images/kids_clothing_only.jpg";
import womenImg from "@assets/stock_images/women_clothing_only.jpg";
import menImg from "@assets/stock_images/men_clothing_only.jpg";
import adultsImg from "@assets/stock_images/adults_clothing_only.jpg";

const slides = [
  { src: kidsImg, label: "ملابس الأطفال" },
  { src: womenImg, label: "ملابس النساء" },
  { src: menImg, label: "ملابس الرجال" },
  { src: adultsImg, label: "ملابس الكبار" },
];

export function HeroSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const next = () => setIndex((i) => (i + 1) % slides.length);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[5/4] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/10 bg-black/5">
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== index}
        >
          <img
            src={slide.src}
            alt={slide.label}
            className="w-full h-full object-cover"
            loading={i === 0 ? "eager" : "lazy"}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-0 right-0 left-0 p-4 md:p-6">
            <span className="inline-block bg-accent text-accent-foreground text-sm md:text-base font-bold px-4 py-2 rounded-lg shadow-lg">
              {slide.label}
            </span>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={prev}
        aria-label="السابق"
        className="absolute top-1/2 -translate-y-1/2 right-3 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-foreground flex items-center justify-center shadow-md transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="التالي"
        className="absolute top-1/2 -translate-y-1/2 left-3 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-foreground flex items-center justify-center shadow-md transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`الشريحة ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-8 bg-white" : "w-2 bg-white/60 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
