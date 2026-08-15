'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Maximize2, X } from 'lucide-react';

interface ExerciseDetailHeaderProps {
  name: string;
  gifUrl: string | null;
  imageUrl: string | null;
}

export function ExerciseDetailHeader({ name, gifUrl, imageUrl }: ExerciseDetailHeaderProps) {
  const router = useRouter();
  const [showFullscreen, setShowFullscreen] = useState(false);
  const mediaUrl = gifUrl || imageUrl;

  return (
    <>
      {/* Header con GIF/imagen */}
      <div className="relative w-full aspect-square max-h-[400px] bg-secondary overflow-hidden">
        {mediaUrl ? (
          <Image
            src={mediaUrl}
            alt={name}
            fill
            sizes="100vw"
            className="object-contain"
            priority
            unoptimized={!!gifUrl} // GIFs no se optimizan
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-6xl">🏋️</span>
          </div>
        )}

        {/* Gradient overlay inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Botón volver */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2.5 rounded-full
            bg-black/40 backdrop-blur-sm text-white
            hover:bg-black/60 transition-colors duration-150
            min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Botón fullscreen */}
        {mediaUrl && (
          <button
            onClick={() => setShowFullscreen(true)}
            className="absolute top-4 right-4 p-2.5 rounded-full
              bg-black/40 backdrop-blur-sm text-white
              hover:bg-black/60 transition-colors duration-150
              min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Pantalla completa"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Modal fullscreen */}
      {showFullscreen && mediaUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 text-white
              hover:bg-white/20 transition-colors min-w-[48px] min-h-[48px]
              flex items-center justify-center"
            aria-label="Cerrar"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative w-full max-w-lg aspect-square">
            <Image
              src={mediaUrl}
              alt={name}
              fill
              className="object-contain"
              unoptimized={!!gifUrl}
            />
          </div>
        </div>
      )}
    </>
  );
}
