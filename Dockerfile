# Geração Eleita: aplicativo de leitura bíblica
#
# Não há dependências npm: basta o runtime do Node e o código. O conteúdo já vem
# congelado em conteudo/conteudo.json, então a imagem não precisa de vault nenhum.
FROM node:24-alpine

WORKDIR /app

COPY package.json build.mjs servidor.mjs contas.mjs novidades.mjs notificacoes.mjs db.mjs propositos.mjs semeador.mjs painel.mjs email.mjs discipulado.mjs cuidado.mjs desafios-grupo.mjs inteligencia.mjs ./
# A pasta inteira: o build importa dela, e copiar arquivo a arquivo já fez a imagem
# ficar para trás em silêncio quando um novo import apareceu.
COPY ferramentas ./ferramentas
COPY src ./src
COPY conteudo ./conteudo
COPY arte ./arte

# O build roda aqui, uma vez: a imagem já sai com dist/ pronto.
RUN node build.mjs

# O servidor não roda como root: se alguém achar uma falha nele, fica preso ao usuário node,
# que só escreve na pasta de dados.
RUN mkdir -p /app/dados && chown node:node /app/dados
USER node

# Onde o progresso é gravado; monte um volume aqui para ele sobreviver ao container
ENV CAMINHO_ESTADO=/app/dados/estado.json
ENV PORTA=8080

EXPOSE 8080

CMD ["sh", "-c", "node servidor.mjs ${PORTA}"]
