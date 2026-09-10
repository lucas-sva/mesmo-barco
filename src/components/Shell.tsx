import { Link, NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'inline-flex min-h-11 min-w-0 items-center justify-center px-0.5 text-[clamp(9px,2.7vw,14px)] font-medium leading-tight tracking-tight rounded-md transition-colors no-underline whitespace-nowrap sm:min-h-9 sm:px-2.5 sm:text-sm sm:tracking-normal',
    isActive
      ? 'bg-[#1a2332] !text-white'
      : 'text-[#3a4658] hover:text-[#1a2332] hover:bg-black/5',
  ].join(' ')

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3">
          <Link
            to="/"
            aria-label="Início"
            title="Início"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-[#1a2332] transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
            </svg>
          </Link>
          <nav
            aria-label="Principal"
            className="grid grid-cols-3 gap-0.5 min-w-0 flex-1 sm:flex sm:flex-none sm:items-center sm:justify-end sm:gap-1"
          >
            <NavLink to="/listas" className={linkClass}>
              Listas
            </NavLink>
            <NavLink to="/simular" className={linkClass}>
              Simular T2
            </NavLink>
            <NavLink to="/como-funciona" className={linkClass}>
              Regras
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 min-w-0">
        {children}
      </main>
      <footer className="border-t border-line/80 py-6 text-center text-xs text-ink-soft space-y-3 px-4">
        <div className="space-y-1">
          <p>Feito por Lucas Galdino · código e dados auditáveis no repositório</p>
          <p>Se a banca publicar lista nova, eu atualizo</p>
        </div>
        <div className="flex flex-col items-center gap-2 pt-1">
          <p className="text-[11px] sm:text-xs text-ink-soft">
            É desenvolvedor e quer auditar o código?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href="https://github.com/lucas-sva/mesmo-barco"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ver o código no GitHub"
              title="Ver o código no GitHub"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-black/5 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.016-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.238 1.84 1.238 1.07 1.834 2.807 1.304 3.492.997.108-.775.42-1.305.763-1.605-2.665-.303-5.467-1.333-5.467-5.93 0-1.31.468-2.382 1.236-3.222-.124-.303-.536-1.523.117-3.176 0 0 1.008-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.241 2.873.118 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.807 5.624-5.48 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .32.216.694.825.576C20.565 21.796 24 17.297 24 12 24 5.37 18.63 0 12 0z" />
              </svg>
            </a>
            <a
              href="https://github.com/lucas-sva/mesmo-barco"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Dar uma estrela no GitHub"
              title="Dar uma estrela no GitHub"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-black/5 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
