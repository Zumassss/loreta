import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const IcCasa = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 10.5 12 3.5l9 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M9.5 20v-5.5h5V20" />
  </svg>
)

export const IcSacola = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 7.5h15l-1 12.5h-13z" />
    <path d="M8.5 10V6.8a3.5 3.5 0 0 1 7 0V10" />
  </svg>
)

export const IcBolo = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20h16v-6.2c0-1.2-1-2.1-2.2-2.1H6.2C5 11.7 4 12.6 4 13.8Z" />
    <path d="M4 16.2c1.6 0 1.6 1.3 3.2 1.3s1.6-1.3 3.2-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.2 1.3" />
    <path d="M12 11.7V8.8" />
    <path d="M12 5.2c.9.7 1.3 1.4 1.3 2 0 .7-.6 1.3-1.3 1.3s-1.3-.6-1.3-1.3c0-.6.4-1.3 1.3-2Z" />
  </svg>
)

export const IcCofre = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="3" />
    <circle cx="11" cy="12" r="3.2" />
    <path d="M11 9.6V12l1.6 1" />
    <path d="M18 9.5v5" />
  </svg>
)

export const IcCoracaoAjustes = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" />
  </svg>
)

export const IcMais = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </svg>
)

export const IcMenos = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5.5 12h13" />
  </svg>
)

export const IcX = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
)

export const IcCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12.5 10 17.5 19 7" />
  </svg>
)

export const IcLixo = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 7h15" />
    <path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
    <path d="M6.5 7l.9 12.1A1.5 1.5 0 0 0 8.9 20.5h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
  </svg>
)

export const IcSeta = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 5.5 15.5 12 9 18.5" />
  </svg>
)

export const IcSetaBaixo = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5.5 9 12 15.5 18.5 9" />
  </svg>
)

export const IcLapis = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14.8 5.4 18.6 9.2 8.9 18.9 4.6 19.9 5.6 15.6z" />
    <path d="M13.2 7 17 10.8" />
  </svg>
)

export const IcEstrela = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 4.5l2.3 4.7 5.2.8-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1L4.5 10l5.2-.8z" />
  </svg>
)

export const IcAlerta = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 4.8 21 19.5H3z" />
    <path d="M12 10v4.2M12 17.2v.1" />
  </svg>
)

export const IcLivro = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 5.2A1.7 1.7 0 0 1 6.2 3.5H19v14.8H6.2a1.7 1.7 0 0 0-1.7 1.7z" />
    <path d="M4.5 18.3a1.7 1.7 0 0 1 1.7-1.7H19" />
    <path d="M8 7.5h7M8 10.6h5" />
  </svg>
)

export const IcMoeda = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M14.4 9.2c-.5-.7-1.4-1.1-2.4-1.1-1.5 0-2.4.8-2.4 1.8 0 2.6 5 1.2 5 3.9 0 1.1-1 1.9-2.6 1.9-1.1 0-2.1-.4-2.6-1.2" />
    <path d="M12 6.6v10.8" />
  </svg>
)

export const IcCarrinho = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3.5 5h2l2 9.5h9.6l2-6.8H6.4" />
    <circle cx="9.5" cy="18.5" r="1.4" />
    <circle cx="16.5" cy="18.5" r="1.4" />
  </svg>
)

export const IcPlanilha = (p: P) => (
  <svg {...base} {...p}>
    <rect x="4" y="3.5" width="16" height="17" rx="2.6" />
    <path d="M4 9h16M4 14.5h16M10 9v11.5M15 9v11.5" />
  </svg>
)
