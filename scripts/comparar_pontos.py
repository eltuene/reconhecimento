import face_recognition
import numpy as np
import sys
import json

def extract_encodings(image_path):
    # Carregar a imagem
    image = face_recognition.load_image_file(image_path)
    
    # Obter os encodings das faces na imagem
    face_encodings = face_recognition.face_encodings(image)
    
    if len(face_encodings) > 0:
        # Retorna o primeiro encoding encontrado (assumindo que há apenas uma face por imagem)
        return face_encodings[0]
    else:
        return None

if __name__ == "__main__":
    # Verificar se o caminho da imagem e os encodings conhecidos foram fornecidos como argumentos
    if len(sys.argv) < 3:
        print("Please provide the path to the image and known encodings as arguments.")
        sys.exit(1)
    
    # Obter o caminho da imagem a partir dos argumentos
    image_path = sys.argv[1]
    known_encodings_json = sys.argv[2]

    # Extrair encodings
    encodings = extract_encodings(image_path)
    
    if encodings is None:
        print(json.dumps({"match": False, "message": "No face found in the image."}))
        sys.exit(1)
    
    # Converter encodings conhecidos de JSON para lista
    known_encodings = json.loads(known_encodings_json)
    
    # Comparar encodings extraídos com os encodings conhecidos
    results = face_recognition.compare_faces(known_encodings, encodings)

    if any(results):
        print(json.dumps({"match": True}))
    else:
        print(json.dumps({"match": False}))
