import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TermosServico() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-5 pt-10 pb-6" style={{ background: 'linear-gradient(160deg, #1D9E75, #085041)' }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/80 text-sm mb-4 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} /> Voltar
        </button>
        <h1 className="text-white text-2xl font-bold">Termos de Serviço</h1>
        <p className="text-white/70 text-sm mt-1">Última atualização: abril de 2025</p>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto space-y-6 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">1. Aceitação dos termos</h2>
          <p>
            Ao acessar ou utilizar o <strong>Eu Peladeiro</strong> (disponível em{' '}
            <strong>www.eupeladeiro.com.br</strong>), você concorda com estes Termos de Serviço. Se não concordar
            com algum dos termos, não utilize o aplicativo.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">2. Descrição do serviço</h2>
          <p>
            O Eu Peladeiro é um aplicativo gratuito para organização de peladas e jogos de futebol amador. Ele
            permite que usuários criem grupos, agendem jogos, confirmem presença, registrem estatísticas e
            avaliem habilidades de outros jogadores.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">3. Conta e responsabilidade</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              O acesso ao aplicativo é feito via conta Google. Você é responsável por manter a segurança
              da sua conta Google.
            </li>
            <li>
              Você é responsável por todas as atividades realizadas com sua conta dentro do Eu Peladeiro.
            </li>
            <li>
              Não é permitido criar contas falsas, se passar por outra pessoa ou utilizar o aplicativo
              para fins ilegais.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">4. Conduta do usuário</h2>
          <p>Ao utilizar o Eu Peladeiro, você concorda em não:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Inserir informações falsas ou enganosas no perfil ou em estatísticas de jogos.</li>
            <li>Usar o aplicativo de forma que prejudique outros usuários ou o funcionamento da plataforma.</li>
            <li>Tentar acessar dados de outros usuários sem autorização.</li>
            <li>Utilizar o serviço para qualquer atividade ilegal ou não autorizada.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">5. Conteúdo do usuário</h2>
          <p>
            Você mantém a propriedade das informações que insere no aplicativo (nome, habilidades,
            estatísticas). Ao inserir essas informações, você nos concede permissão para exibi-las
            aos demais membros dos grupos que você participa e para usá-las no cálculo de rankings
            e sorteio de times.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">6. Disponibilidade do serviço</h2>
          <p>
            O Eu Peladeiro é fornecido gratuitamente, sem garantia de disponibilidade contínua.
            Podemos interromper, modificar ou encerrar o serviço a qualquer momento, com ou sem aviso prévio.
            Não nos responsabilizamos por eventuais perdas causadas por indisponibilidade do aplicativo.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">7. Limitação de responsabilidade</h2>
          <p>
            O Eu Peladeiro é uma ferramenta de organização. Não nos responsabilizamos por eventos,
            lesões, danos materiais ou qualquer consequência decorrente dos jogos organizados através
            do aplicativo. A organização e segurança das partidas são de responsabilidade dos próprios usuários.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">8. Encerramento de conta</h2>
          <p>
            Você pode solicitar o encerramento da sua conta a qualquer momento entrando em contato pelo
            e-mail abaixo. Reservamos o direito de suspender ou encerrar contas que violem estes termos.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">9. Alterações nos termos</h2>
          <p>
            Podemos atualizar estes Termos de Serviço periodicamente. O uso contínuo do aplicativo após
            a publicação de alterações implica aceitação dos novos termos.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">10. Lei aplicável</h2>
          <p>
            Estes termos são regidos pelas leis da República Federativa do Brasil. Quaisquer disputas
            serão resolvidas no foro da comarca de domicílio do usuário.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">11. Contato</h2>
          <p>
            Para dúvidas sobre estes Termos de Serviço, entre em contato pelo e-mail:{' '}
            <a href="mailto:eupeladeiroapp@gmail.com" className="text-verde-campo font-semibold underline">
              eupeladeiroapp@gmail.com
            </a>
          </p>
        </section>

        <div className="pt-4 border-t border-gray-200 text-center text-gray-400 text-xs">
          © {new Date().getFullYear()} Eu Peladeiro · eupeladeiro.com.br
        </div>
      </div>
    </div>
  )
}
