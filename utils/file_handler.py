import os
from config.settings import UPLOAD_DIR

def save_uploaded_file(uploaded_file):
    if os.path.exists(UPLOAD_DIR) and not os.path.isdir(UPLOAD_DIR):
        raise ValueError(f"{UPLOAD_DIR} exists but is not a directory")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    file_path = os.path.join(UPLOAD_DIR, uploaded_file.name)
    with open(file_path, "wb") as f:
        f.write(uploaded_file.getbuffer())

    return file_path