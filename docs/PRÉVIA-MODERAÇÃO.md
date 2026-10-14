# Prévia de moderação do CEMTN

Esta branch contém uma tela demonstrativa para validar a experiência visual e o fluxo de análise antes da integração com a arquitetura atual do CEMTN: frontend React/Vite, backend NestJS + Prisma e PostgreSQL no Supabase.

## Como abrir
- Rota: `/preview/moderacao`
- A tela usa exclusivamente dados fictícios.
- Antes de uma implantação pública definitiva, a rota deve ser protegida por autenticação e autorização ou removida.

## O que testar
- Buscar alertas por pessoa, comunidade, categoria ou texto.
- Filtrar pendentes, alta gravidade, em análise e resolvidos.
- Filtrar a origem: denúncia de usuário ou detecção automática.
- Conferir se a origem aparece tanto na fila quanto nos detalhes.
- Selecionar um alerta e consultar o contexto.
- Simular liberar conteúdo, marcá-lo como ocultado ou encaminhá-lo para análise.
- Conferir o layout em desktop e celular.

## Modelo de origem dos alertas
- **Denúncia de usuário:** um aluno ou professor reporta uma publicação/comentário e informa o motivo. O registro deve preservar a denúncia sem expor desnecessariamente a identidade do denunciante a outros usuários.
- **Detecção automática:** regras de moderação sinalizam conteúdo para revisão. A categoria sugerida é um indício, não uma conclusão nem uma punição automática.
- **Ambas as origens:** os alertas entram na mesma fila operacional, mas permanecem identificados por origem para facilitar a triagem e a auditoria.

## Limites desta prévia
Nenhuma ação chama a API ou o banco. As decisões alteram somente o estado local e são perdidas ao recarregar. Os nomes, textos e números são fictícios.

## Etapa posterior à validação
1. Definir modelos Prisma para alertas/denúncias e histórico de decisões, relacionados ao conteúdo original e ao usuário responsável.
2. Criar endpoints no NestJS com validação, autenticação e autorização por papel/permissão.
3. Registrar origem, categoria, status, justificativa, responsável e datas, mantendo histórico de alterações.
4. Definir regras automáticas iniciais simples; considerar IA somente em etapa posterior e com revisão humana.
5. Prever tratamento de falsos positivos, reabertura/contestação e restauração de conteúdo ocultado.
6. Adicionar testes de API e de autorização antes de habilitar ações reais.

## Critério de segurança
Um alerta não comprova uma infração. Ações com impacto no conteúdo devem ser autorizadas, justificáveis e auditáveis. A análise automática não deve aplicar punições definitivas por conta própria.
