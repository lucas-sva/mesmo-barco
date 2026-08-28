export function BrandMark({
  className = 'block w-[min(92vw,520px)] md:w-[min(90vw,640px)] h-auto max-h-none object-contain object-center aspect-[1273/687]',
  src = './logo.png',
  alt = 'Mesmo Barco · Projeções T2 Sem Filtro',
}: {
  className?: string
  src?: string
  alt?: string
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={1273}
      height={687}
      className={className}
    />
  )
}
