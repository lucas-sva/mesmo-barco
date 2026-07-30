import { Link, NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'text-sm font-medium px-2.5 py-1.5 rounded-md transition-colors no-underline',
    isActive
      ? 'bg-[#1a2332] !text-white'
      : 'text-[#3a4658] hover:text-[#1a2332] hover:bg-black/5',
  ].join(' ')

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-2.5 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="shrink-0 text-base md:text-lg font-bold tracking-tight text-[#1a2332] no-underline"
          >
            Mesmo Barco
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-1">
            <NavLink to="/" end className={linkClass}>
              Buscar
            </NavLink>
            <NavLink to="/simular" className={linkClass}>
              Simular T2
            </NavLink>
            <NavLink to="/como-funciona" className={linkClass}>
              Regras
            </NavLink>
          </nav>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-2 space-y-0.5 text-[11px] text-ink-soft text-center">
          <p>Ferramenta comunitária com dados públicos do DOE</p>
          <p>Projeção não é promessa de nomeação</p>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
      <footer className="border-t border-line/80 py-6 text-center text-xs text-ink-soft space-y-1 px-4">
        <p>Feito por Lucas Galdino · código e dados auditáveis no repositório</p>
        <p>Se a banca publicar lista nova, eu atualizo</p>
      </footer>
    </div>
  )
}
