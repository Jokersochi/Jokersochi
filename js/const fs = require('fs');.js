const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const archiver = require('archiver');

const projectRoot = path.resolve(__dirname, '..');
// Папка для готовых архивов
const outputDir = path.join(projectRoot, 'archives');

// Убедимся, что папка для архивов существует
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
    console.log('Создана директория: ./archives');
}

/**
 * Архивирует production-сборку из папки 'dist'.
 * Сначала запускает 'npm run build'.
 */
function archiveProduction() {
    console.log('Запускаю сборку production-версии...');
    exec('npm run build', (error, stdout, stderr) => {
        if (error) {
            console.error(`Ошибка сборки: ${error.message}`);
            console.error(stderr);
            return;
        }
        console.log(stdout);
        console.log('Сборка завершена. Создаю архив...');

        const distPath = path.join(projectRoot, 'dist');
        if (!fs.existsSync(distPath)) {
            console.error('Ошибка: папка `dist` не найдена. Возможно, сборка не удалась.');
            return;
        }

        const outputPath = path.join(outputDir, 'monopoly-russia-production.zip');
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Уровень сжатия
        });

        output.on('close', () => {
            console.log(`✅ Архив production-версии успешно создан: ${outputPath}`);
            console.log(`   Размер: ${(archive.pointer() / 1024).toFixed(2)} KB`);
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn(err);
            } else {
                throw err;
            }
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);
        // Добавляем папку 'dist' в корень архива
        archive.directory(distPath, false);
        archive.finalize();
    });
}

/**
 * Архивирует исходный код проекта с помощью 'git archive'.
 */
function archiveSource() {
    console.log('Создаю архив с исходным кодом...');
    const outputPath = path.join(outputDir, 'monopoly-russia-source.zip');
    // Используем кавычки для путей, которые могут содержать пробелы
    const command = `git archive -o "${outputPath}" HEAD`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Ошибка 'git archive': ${error.message}`);
            console.error(stderr);
            console.warn("Убедитесь, что вы находитесь в git-репозитории и все файлы закоммичены.");
            return;
        }
        console.log(`✅ Архив с исходным кодом успешно создан: ${outputPath}`);
    });
}

// --- Точка входа ---
const arg = process.argv[2];

if (arg === 'source') archiveSource();
else if (arg === 'production') archiveProduction();
else if (!arg) { console.log('Архивирую исходники и production-версию...'); archiveSource(); archiveProduction(); }
else console.error(`Неизвестный аргумент: ${arg}. Используйте "source" или "production".`);