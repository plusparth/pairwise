import React from "react";
import Image from "next/image";
import { Media, RankedMedia } from "../types/media";

interface MediaCardProps {
  media: Media | RankedMedia;
  onClick?: () => void;
  showRating?: boolean;
}

const MediaCard: React.FC<MediaCardProps> = ({
  media,
  onClick,
  showRating = false,
}) => {
  const imageUrl = media.posterPath
    ? `https://image.tmdb.org/t/p/w300${media.posterPath}`
    : "/placeholder-poster.svg";

  // Type guard to check if media is RankedMedia with rating
  const hasRating = (
    media: Media | RankedMedia
  ): media is RankedMedia & { rating: number } => {
    return (
      "rating" in media && typeof (media as RankedMedia).rating === "number"
    );
  };

  return (
    <div
      className="relative overflow-hidden rounded-lg shadow-md cursor-pointer transition-transform hover:scale-105"
      onClick={onClick}
    >
      <div className="aspect-[2/3] w-full relative">
        <Image
          src={imageUrl}
          alt={media.title}
          fill
          className="object-cover pointer-events-none"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          draggable="false"
        />
      </div>

      <div className="p-2 bg-white dark:bg-rich-black">
        <h3 className="font-medium text-sm truncate">{media.title}</h3>
        <p className="text-xs text-rich-black/60 dark:text-white/60">
          {media.releaseDate?.split("-")[0] || "Unknown year"}
        </p>

        {showRating && hasRating(media) && (
          <div className="mt-1 flex items-center">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${
                    media.rating >= star
                      ? "text-orange-peel"
                      : media.rating >= star - 0.5
                      ? "text-orange-peel/60"
                      : "text-celadon/30"
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                    clipRule="evenodd"
                  />
                </svg>
              ))}
            </div>
            <span className="ml-1 text-xs font-medium">
              {media.rating.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaCard;
