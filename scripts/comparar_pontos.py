import face_recognition
import numpy as np
import sys
import json

def compare_faces(new_encoding, known_encodings):
    try:
        results = face_recognition.compare_faces(known_encodings, new_encoding)
        return any(results)
    except Exception as e:
        print(str(e), file=sys.stderr)
        return False

if __name__ == "__main__":
    try:
        # Verificar se os pontos foram fornecidos como argumento
        if len(sys.argv) < 3:
            print("Please provide the new encoding and known encodings as arguments.", file=sys.stderr)
            sys.exit(1)
        
        # Obter os argumentos
        new_encoding = json.loads(sys.argv[1])
        known_encodings = json.loads(sys.argv[2])
        
        # Comparar com os encodings conhecidos
        if compare_faces(np.array(new_encoding), [np.array(encoding) for encoding in known_encodings]):
            print("True")
        else:
            print("False")
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
