import { useEffect } from 'react'

/**
 * Mede a altura que está REALMENTE visível no celular e guarda em --app-h.
 *
 * O `100dvh` do navegador não encolhe quando o teclado sobe (e no iOS a barra
 * de baixo do Safari ainda cobre um pedaço). Sem isso, o rodapé do formulário
 * — justamente onde fica o botão de salvar — cai atrás do teclado.
 * A visualViewport é a única medida que acompanha teclado e barras do sistema.
 */
export function useAlturaDaTela() {
  useEffect(() => {
    const vv = window.visualViewport
    const raiz = document.documentElement

    const aplicar = () => {
      const altura = Math.round(vv ? vv.height : window.innerHeight)
      // o navegador também ROLA a área visível pra mostrar o campo focado;
      // sem compensar esse deslocamento o app inteiro sai de lugar e a barra
      // de baixo reaparece por cima do rodapé do formulário
      const deslocamento = Math.round(vv ? vv.offsetTop : 0)
      raiz.style.setProperty('--app-h', `${altura}px`)
      raiz.style.setProperty('--app-top', `${deslocamento}px`)
      raiz.dataset.teclado = vv && window.innerHeight - vv.height > 120 ? 'aberto' : ''
    }

    // navegadores antigos ainda conseguem rolar a casca ao focar um campo;
    // aqui a gente desfaz na hora pra nada sair do lugar
    const casca = document.querySelector<HTMLElement>('.shell')
    const desrolar = () => {
      if (!casca) return
      if (casca.scrollTop !== 0) casca.scrollTop = 0
      if (casca.scrollLeft !== 0) casca.scrollLeft = 0
    }
    casca?.addEventListener('scroll', desrolar, { passive: true })

    aplicar()
    vv?.addEventListener('resize', aplicar)
    vv?.addEventListener('scroll', aplicar)
    window.addEventListener('resize', aplicar)
    window.addEventListener('orientationchange', aplicar)
    return () => {
      casca?.removeEventListener('scroll', desrolar)
      vv?.removeEventListener('resize', aplicar)
      vv?.removeEventListener('scroll', aplicar)
      window.removeEventListener('resize', aplicar)
      window.removeEventListener('orientationchange', aplicar)
    }
  }, [])
}
