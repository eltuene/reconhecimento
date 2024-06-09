import face_recognition
import numpy as np
import sys

def extract_encodings(image_path):
    try:
        # Carregar a imagem
        image = face_recognition.load_image_file(image_path)
        
        # Obter os encodings das faces na imagem
        face_encodings = face_recognition.face_encodings(image)
        
        if len(face_encodings) > 0:
            # Retorna o primeiro encoding encontrado (assumindo que há apenas uma face por imagem)
            return face_encodings[0]
        else:
            return None
    except Exception as e:
        print(str(e), file=sys.stderr)
        return None

if __name__ == "__main__":
    try:
        # Verificar se o caminho da imagem foi fornecido como argumento
        if len(sys.argv) < 2:
            print("Please provide the path to the image as an argument.", file=sys.stderr)
            sys.exit(1)
        
        # Obter o caminho da imagem a partir dos argumentos
        image_path = sys.argv[1]
        
        # Extrair encodings
        encodings = extract_encodings(image_path)
        
        if encodings is not None:
            print(encodings.tolist())
        else:
            print("No face found in the image.", file=sys.stderr)
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
