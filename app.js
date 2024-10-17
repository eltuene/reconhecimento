const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const moment = require('moment-timezone');

const app = express();
const port = 3005;

// Middleware CORS
app.use(cors());

// Firebase setup
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://amf-games-default-rtdb.firebaseio.com"
});
const db = admin.database();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Função para capturar a data atual no formato YYYY-MM-DD com o horário de São Paulo
const getCurrentDate = () => {
  return moment().tz("America/Sao_Paulo").format('YYYY-MM-DD');
};

// Função para verificar se a matrícula já foi registrada para o dia atual
const checkDuplicateMatricula = async (matricula, date) => {
  const matriculaSnapshot = await db.ref(`presencas/${date}`).orderByChild('matricula').equalTo(matricula).once('value');
  if (matriculaSnapshot.exists()) return true;

  return false;
};

// Função para comparar os pontos do rosto com os pontos existentes no Firebase
const compareFacePoints = (newPoints, pointsPath) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', ['scripts/comparar_pontos.py', JSON.stringify(newPoints), pointsPath]);

    pythonProcess.stdout.on('data', (data) => {
      const result = data.toString().trim() === 'True';
      resolve(result);
    });

    pythonProcess.stderr.on('data', (data) => {
      reject(data.toString());
    });

    pythonProcess.on('error', (error) => {
      reject(error.toString());
    });
  });
};

// Rota para salvar presença do aluno
app.post('/salvar-aluno', upload.single('imagem'), async (req, res) => {
  const imagemPath = req.file.path;
  const { nome, matricula } = req.body;

  try {
    const currentDate = getCurrentDate();

    const isDuplicate = await checkDuplicateMatricula(matricula, currentDate);
    if (isDuplicate) {
      fs.unlink(imagemPath, (err) => {
        if (err) console.error(err);
      });
      return res.status(400).json({ message: 'Presença já registrada para este dia.' });
    }

    const pythonProcess = spawn('python3', ['scripts/extrair_pontos.py', imagemPath]);

    pythonProcess.stdout.on('data', async (data) => {
      try {
        const newPoints = JSON.parse(data.toString());

        const snapshot = await db.ref(`presencas/${currentDate}`).once('value');
        const facesData = snapshot.val();
        const existingPointsList = facesData ? Object.values(facesData).map(face => face.pontos) : [];

        const pointsPath = path.join(__dirname, 'public', 'uploads', `${Date.now()}-points.json`);
        fs.writeFileSync(pointsPath, JSON.stringify(existingPointsList));

        const isFaceDuplicate = await compareFacePoints(newPoints, pointsPath);
        if (isFaceDuplicate) {
          fs.unlink(imagemPath, (err) => {
            if (err) console.error(err);
          });
          fs.unlink(pointsPath, (err) => {
            if (err) console.error(err);
          });
          return res.status(400).json({ message: 'O rosto já foi registrado.' });
        }

        const ref = db.ref(`presencas/${currentDate}`).push();
        ref.set({ pontos: newPoints, nome, matricula }, (error) => {
          if (error) {
            fs.unlink(imagemPath, (err) => {
              if (err) console.error(err);
            });
            fs.unlink(pointsPath, (err) => {
              if (err) console.error(err);
            });
            res.status(500).json({ message: error.toString() });
          } else {
            fs.unlink(imagemPath, (err) => {
              if (err) console.error(err);
            });
            fs.unlink(pointsPath, (err) => {
              if (err) console.error(err);
            });
            res.json({ id: ref.key, pontos: newPoints, nome, matricula });
          }
        });
      } catch (error) {
        fs.unlink(imagemPath, (err) => {
          if (err) console.error(err);
        });
        res.status(500).json({ message: error.toString() });
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      fs.unlink(imagemPath, (err) => {
        if (err) console.error(err);
      });
      res.status(500).json({ message: data.toString() });
    });

    pythonProcess.on('error', (error) => {
      fs.unlink(imagemPath, (err) => {
        if (err) console.error(err);
      });
      res.status(500).json({ message: error.toString() });
    });
  } catch (error) {
    fs.unlink(imagemPath, (err) => {
      if (err) console.error(err);
    });
    res.status(500).json({ message: error.toString() });
  }
});

// Rota para listar todos os alunos presentes em todos os dias
app.get('/alunos-presentes-todos-dias', async (req, res) => {
  try {
    const snapshot = await db.ref('presencas').once('value');
    const presencasData = snapshot.val();

    if (!presencasData) {
      return res.status(404).json({ message: 'Nenhuma presença encontrada.' });
    }

    const alunosPresentes = [];

    Object.keys(presencasData).forEach(date => {
      const presencasDoDia = presencasData[date];

      Object.values(presencasDoDia).forEach(face => {
        alunosPresentes.push({
          nome: face.nome,
          matricula: face.matricula,
          data: date
        });
      });
    });

    alunosPresentes.sort((a, b) => a.nome.localeCompare(b.nome));

    res.json(alunosPresentes);
  } catch (error) {
    res.status(500).json({ message: error.toString() });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
