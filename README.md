# Sistema de Reconhecimento Facial

Este é um sistema básico de reconhecimento facial que usa Node.js, Firebase Realtime Database e scripts Python para extrair e comparar pontos faciais.

## Pré-requisitos

- Node.js instalado
- Python 3.x instalado
- Firebase Account configurada

## Configuração do Ambiente

1. Clone o repositório:

    ```bash
    git clone https://github.com/eltuene/reconhecimento.git
    cd reconhecimento
    ```

2. Instale as dependências do Node.js:

    ```bash
    npm install
    ```

3. Configure o Firebase:

    - Crie um projeto no Firebase.
    - Adicione um novo aplicativo web ao projeto.
    - Copie o arquivo de conta de serviço JSON para o diretório do projeto e renomeie-o para `serviceAccountKey.json`.

4. Crie um ambiente virtual Python e instale as dependências:

    ```bash
    python -m venv venv
    source venv/bin/activate  # Linux/macOS
    .\venv\Scripts\activate  # Windows
    pip install -r requirements.txt
    ```

## Estrutura do Projeto

- `server.js`: O servidor principal do Node.js.
- `scripts/extrair_pontos.py`: Script Python para extrair pontos faciais de uma imagem.
- `scripts/comparar_pontos.py`: Script Python para comparar pontos faciais com os existentes.
- `public/`: Diretório para arquivos públicos.
- `serviceAccountKey.json`: Chave da conta de serviço do Firebase.

## Como Rodar

1. Inicie o servidor Node.js:

    ```bash
    npm start
    ```

2. Use as seguintes rotas para interagir com o sistema:

    - `POST /salvar-aluno`: Rota para salvar informações do aluno junto com pontos faciais.

### Exemplo de Requisição para Salvar Aluno

```bash
curl -X POST http://localhost:3000/salvar-aluno \
    -F 'imagem=@caminho/para/imagem.jpg' \
    -F 'nome=Nome do Aluno' \
    -F 'cpf=12345678901' \
    -F 'matricula=123456' \
    -F 'curso=Nome do Curso'
