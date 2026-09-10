export function BrandMark({
  className = 'block w-[min(72vw,280px)] md:w-[min(50vw,320px)] h-auto max-h-none object-contain object-center aspect-square',
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
      width={512}
      height={512}
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
