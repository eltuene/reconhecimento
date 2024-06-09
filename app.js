const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Firebase setup
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://amf-games-default-rtdb.firebaseio.com'
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

// Função para verificar se o CPF ou matrícula já existem
const checkDuplicateCpfOrMatricula = async (cpf, matricula) => {
  const snapshot = await db.ref('faces').orderByChild('cpf').equalTo(cpf).once('value');
  if (snapshot.exists()) return true;

  const matriculaSnapshot = await db.ref('faces').orderByChild('matricula').equalTo(matricula).once('value');
  if (matriculaSnapshot.exists()) return true;

  return false;
};

// Função para comparar os pontos do rosto com os pontos existentes no Firebase
const compareFacePoints = (newPoints, existingPoints) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', ['scripts/comparar_pontos.py', JSON.stringify(newPoints), JSON.stringify(existingPoints)]);

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

app.post('/salvar-aluno', upload.single('imagem'), async (req, res) => {
  const imagemPath = req.file.path;
  const { nome, cpf, matricula, curso } = req.body;

  try {
    // Verificar se o CPF ou matrícula já existem
    const isDuplicate = await checkDuplicateCpfOrMatricula(cpf, matricula);
    if (isDuplicate) {
      fs.unlink(imagemPath, (err) => {
        if (err) console.error(err);
      });
      return res.status(400).send('CPF ou matrícula já existem.');
    }

    const pythonProcess = spawn('python3', ['scripts/extrair_pontos.py', imagemPath]);

    pythonProcess.stdout.on('data', async (data) => {
      try {
        const newPoints = JSON.parse(data.toString());

        // Recuperar todos os pontos salvos no Firebase
        const snapshot = await db.ref('faces').once('value');
        const facesData = snapshot.val();
        const existingPointsList = facesData ? Object.values(facesData).map(face => face.pontos) : [];

        // Comparar os pontos com os pontos existentes
        const isFaceDuplicate = await compareFacePoints(newPoints, existingPointsList);
        if (isFaceDuplicate) {
          fs.unlink(imagemPath, (err) => {
            if (err) console.error(err);
          });
          return res.status(400).send('O rosto já foi registrado.');
        }

        // Salvar os novos pontos e informações adicionais no Firebase
        const ref = db.ref('faces').push();
        ref.set({ pontos: newPoints, nome, cpf, matricula, curso }, (error) => {
          if (error) {
            fs.unlink(imagemPath, (err) => {
              if (err) console.error(err);
            });
            res.status(500).send(error.toString());
          } else {
            fs.unlink(imagemPath, (err) => {
              if (err) console.error(err);
            });
            res.json({ id: ref.key, pontos: newPoints, nome, cpf, matricula, curso });
          }
        });
      } catch (error) {
        fs.unlink(imagemPath, (err) => {
          if (err) console.error(err);
        });
        res.status(500).send(error.toString());
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      fs.unlink(imagemPath, (err) => {
        if (err) console.error(err);
      });
      res.status(500).send(data.toString());
    });

    pythonProcess.on('error', (error) => {
      fs.unlink(imagemPath, (err) => {
        if (err) console.error(err);
      });
      res.status(500).send(error.toString());
    });
  } catch (error) {
    fs.unlink(imagemPath, (err) => {
      if (err) console.error(err);
    });
    res.status(500).send(error.toString());
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
