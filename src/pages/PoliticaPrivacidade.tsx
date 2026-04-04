import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PoliticaPrivacidade() {
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
        <h1 className="text-white text-2xl font-bold">Política de Privacidade</h1>
        <p className="text-white/70 text-sm mt-1">Última atualização: abril de 2025</p>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto space-y-6 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">1. Informações que coletamos</h2>
          <p>
            O <strong>Eu Peladeiro</strong> coleta apenas as informações necessárias para o funcionamento do aplicativo:
          </p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Nome e e-mail fornecidos pelo Google no momento do login via Google OAuth.</li>
            <li>Foto de perfil fornecida pelo Google (opcional).</li>
            <li>Informações de perfil preenchidas pelo usuário: posições de jogo, habilidades autoavaliadas e nome de exibição.</li>
            <li>Estatísticas de jogos registradas voluntariamente (gols, assistências, defesas).</li>
            <li>Avaliações de habilidades feitas anonimamente entre membros de grupos.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">2. Como usamos suas informações</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>Identificar e autenticar o usuário no aplicativo.</li>
            <li>Exibir seu perfil para outros membros dos grupos que você participa.</li>
            <li>Calcular estatísticas e rankings dentro dos grupos.</li>
            <li>Sortear times equilibrados com base nas habilidades dos jogadores.</li>
            <li>Enviar notificações sobre jogos agendados (apenas dentro do app).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">3. Compartilhamento de dados</h2>
          <p>
            Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins comerciais.
            Seus dados são compartilhados apenas com outros membros dos grupos que você participa, exclusivamente
            dentro da plataforma Eu Peladeiro.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">4. Armazenamento e segurança</h2>
          <p>
            Seus dados são armazenados de forma segura na plataforma <strong>Supabase</strong>, com criptografia
            em trânsito (HTTPS) e em repouso. O acesso aos dados é controlado por políticas de segurança em nível
            de linha (Row Level Security), garantindo que cada usuário acesse apenas os dados aos quais tem permissão.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">5. Seus direitos</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>Você pode editar seu nome, foto e habilidades a qualquer momento pelo perfil.</li>
            <li>Você pode solicitar a exclusão completa de sua conta e dados entrando em contato conosco.</li>
            <li>Você pode sair do aplicativo a qualquer momento usando a opção "Sair da conta".</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">6. Cookies e tecnologias similares</h2>
          <p>
            O Eu Peladeiro utiliza armazenamento local (localStorage) apenas para manter a sessão do usuário ativa
            e facilitar o fluxo de convites para grupos. Não utilizamos cookies de rastreamento ou publicidade.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">7. Crianças</h2>
          <p>
            O Eu Peladeiro não é direcionado a crianças menores de 13 anos. Não coletamos intencionalmente
            informações de crianças. Se identificarmos dados de menores, iremos removê-los imediatamente.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">8. Alterações nesta política</h2>
          <p>
            Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos usuários sobre mudanças
            significativas dentro do próprio aplicativo.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">9. Contato</h2>
          <p>
            Para dúvidas, solicitações de exclusão de dados ou qualquer questão relacionada à sua privacidade,
            entre em contato pelo e-mail:{' '}
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
