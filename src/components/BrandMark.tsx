export function BrandMark({
  className = 'block w-[min(92vw,520px)] md:w-[min(90vw,640px)] h-auto max-h-none object-contain object-center aspect-[1273/687]',
  src = './logo.webp',
  fallbackSrc = './logo.png',
  alt = 'Mesmo Barco · Projeções T2 Sem Filtro',
}: {
  className?: string
  src?: string
  fallbackSrc?: string
  alt?: string
}) {
  const img = (
    <img
      src={src.endsWith('.webp') ? fallbackSrc : src}
      alt={alt}
      width={960}
      height={518}
      decoding="async"
      fetchPriority="high"
      className={className}
    />
  )
  if (!src.endsWith('.webp')) return img
  return (
    <picture>
      <source srcSet={src} type="image/webp" />
      {img}
    </picture>
  )
}
