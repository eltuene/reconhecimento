# Use a imagem base oficial do Node.js
FROM node:20

# Instale Python
RUN apt-get update && apt-get install -y python3 python3-pip python3.11-venv

# Defina o diretório de trabalho no contêiner
WORKDIR /usr/src/app

# Copie o arquivo package.json e package-lock.json
COPY package*.json ./

# Instale as dependências do projeto
RUN npm install

# Copie o restante dos arquivos da aplicação para o diretório de trabalho
COPY . .

# Crie e ative o ambiente virtual do Python
RUN python3 -m venv .venv
RUN /bin/bash -c "source .venv/bin/activate && pip install -r requirements.txt"

# Exponha a porta em que o aplicativo vai rodar
EXPOSE 3000

# Comando para rodar a aplicação
CMD ["node", "index.js"]
