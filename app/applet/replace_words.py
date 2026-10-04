import os
import re

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Dosen -> Teacher
    content = re.sub(r'\bDosen\b', 'Teacher', content)
    content = re.sub(r'\bdosen\b', 'teacher', content)
    content = re.sub(r'\bDOSEN\b', 'TEACHER', content)
    
    # Mahasiswa -> Student
    content = re.sub(r'\bMahasiswa\b', 'Student', content)
    content = re.sub(r'\bmahasiswa\b', 'student', content)
    content = re.sub(r'\bMAHASISWA\b', 'STUDENT', content)
    
    # Siswa -> Student
    content = re.sub(r'\bSiswa\b', 'Student', content)
    content = re.sub(r'\bsiswa\b', 'student', content)
    content = re.sub(r'\bSISWA\b', 'STUDENT', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            replace_in_file(os.path.join(root, file))

print("Replacement complete.")
