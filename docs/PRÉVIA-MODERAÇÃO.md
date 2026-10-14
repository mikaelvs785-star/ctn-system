# Prévia de moderação do CEMTN

Esta branch contém uma tela demonstrativa para validar a experiência visual e o fluxo de análise antes de integrar o frontend ao serviço Java/Spring Boot.

## Como abrir
- Rota: /preview/moderacao
- Não exige login porque usa exclusivamente dados fictícios.
- Antes de uma implantação pública definitiva, esta rota deve ser removida ou protegida.

## O que testar
- Buscar alertas por pessoa, comunidade, categoria ou texto.
- Filtrar pendentes, alta gravidade, em análise e resolvidos.
- Selecionar um alerta e consultar o contexto.
- Simular liberar conteúdo, marcá-lo como ocultado ou encaminhá-lo para análise.
- Conferir o layout em desktop e celular.

## Limites desta prévia
Nenhuma ação chama a API Java, o backend NestJS ou o banco. As decisões alteram somente o estado local e são perdidas ao recarregar. Os nomes, textos e números são fictícios.

## Etapa posterior à validação
1. Definir o contrato da API entre NestJS e Spring Boot.
2. Relacionar cada alerta ao ID da publicação ou comentário original.
3. Reutilizar autenticação e permissões do CEMTN.
4. Definir auditoria, justificativas, contestação e restauração.
5. Adicionar testes de API e autorização antes de habilitar ações reais.
