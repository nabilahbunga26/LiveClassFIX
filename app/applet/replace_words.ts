import { readFileSync, writeFileSync } from 'fs';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function replaceInFile(filepath: string) {
    let content = readFileSync(filepath, 'utf-8');
    
    // Dosen -> Teacher
    content = content.replace(/\bDosen\b/g, 'Teacher');
    content = content.replace(/\bdosen\b/g, 'teacher');
    content = content.replace(/\bDOSEN\b/g, 'TEACHER');
    
    // Mahasiswa -> Student
    content = content.replace(/\bMahasiswa\b/g, 'Student');
    content = content.replace(/\bmahasiswa\b/g, 'student');
    content = content.replace(/\bMAHASISWA\b/g, 'STUDENT');
    
    // Siswa -> Student
    content = content.replace(/\bSiswa\b/g, 'Student');
    content = content.replace(/\bsiswa\b/g, 'student');
    content = content.replace(/\bSISWA\b/g, 'STUDENT');

    writeFileSync(filepath, content, 'utf-8');
}

function processDirectory(dir: string) {
    const files = readdirSync(dir);
    for (const file of files) {
        const filepath = join(dir, file);
        if (statSync(filepath).isDirectory()) {
            processDirectory(filepath);
        } else if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
            replaceInFile(filepath);
        }
    }
}

processDirectory('src');
console.log('Replacement complete.');
