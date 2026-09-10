import { useState } from "react";
import { useStore } from "../lib/store";
import { Bonequinha } from "./ui";

/** Porta de entrada: uma senha só, a mesma pra todo mundo da Loreta. */
export default function Entrada() {
  const { entrar } = useStore();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);

  const tentar = async () => {
    if (!senha.trim() || indo) return;
    setIndo(true);
    setErro(null);
    const problema = await entrar(senha);
    setErro(problema);
    setIndo(false);
    if (!problema) setSenha("");
  };

  return (
    <div className="entrada">
      <form
        className="entrada__cartao"
        onSubmit={(e) => {
          e.preventDefault();
          void tentar();
        }}
      >
        <div className="entrada__stripes" />
        <div className="entrada__corpo">
          <Bonequinha className="entrada__doll" />
          <img
            className="entrada__marca"
            src="./loreta-wordmark.png"
            alt="Loreta"
          />
          <div className="entrada__tag">Doceria Artesanal</div>

          <p className="muted entrada__texto">
            O caixa da Loreta fica guardado aqui. Digite a senha da casa pra ver
            os lançamentos e o saldo.
          </p>

          <div className="field">
            <span className="label">Senha da Loreta</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErro(null);
              }}
            />
          </div>

          {erro && <div className="entrada__erro">{erro}</div>}

          <button
            className="btn btn--block"
            type="submit"
            disabled={!senha.trim() || indo}
          >
            {indo ? "Entrando…" : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
