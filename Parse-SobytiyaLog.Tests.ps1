#Requires -Modules Pester

# Import the function to be tested.
# The script containing the function must be in the same directory or specified with a full path.
. "$PSScriptRoot\Parse-SobytiyaLog.ps1"

Describe 'Parse-SobytiyaLog' -Tags 'Parser' {
    Context 'when parsing a log file' {

        $tempFile = $null
        AfterEach {
            if ($tempFile -and (Test-Path $tempFile)) {
                Remove-Item $tempFile -Force
            }
        }

        It 'parses a single, complete log entry correctly' {
            $logContent = @"
Уровень	Дата и время	Источник	Код события	Категория задачи
Сведения	31.07.2025 0:07:34	PowerShell	403	Жизненный цикл обработчика	"Состояние обработчика изменилось с Available на Stopped. 

Подробные сведения: 
	NewEngineState=Stopped
	PreviousEngineState=Available
	HostName=ConsoleHost
	HostApplication=C:\Windows\System32\WindowsPowerShell\v1.0\powershell.EXE -Command Start-Process -WindowStyle Hidden task.bat
"
"@
            $tempFile = New-TemporaryFile
            Set-Content -Path $tempFile.FullName -Value $logContent -Encoding UTF8

            $result = Parse-SobytiyaLog -Path $tempFile.FullName

            $result | Should -HaveCount 1
            $result[0].Level | Should -Be 'Сведения'
            $result[0].Timestamp | Should -Be ([datetime]'2025-07-31 00:07:34')
            $result[0].Source | Should -Be 'PowerShell'
            $result[0].EventID | Should -Be 403
            $result[0].TaskCategory | Should -Be 'Жизненный цикл обработчика'
            $result[0].Details.HostName | Should -Be 'ConsoleHost'
            $result[0].Details.NewEngineState | Should -Be 'Stopped'
        }

        It 'parses multiple log entries correctly' {
            $logContent = @"
Уровень	Дата и время	Источник	Код события	Категория задачи
Сведения	31.07.2025 0:07:34	PowerShell	403	Жизненный цикл обработчика	"Состояние обработчика изменилось с Available на Stopped. 

Подробные сведения: 
	NewEngineState=Stopped
	PreviousEngineState=Available
"
Сведения	31.07.2025 0:07:33	PowerShell	400	Жизненный цикл обработчика	"Состояние обработчика изменилось с None на Available. 

Подробные сведения: 
	NewEngineState=Available
	PreviousEngineState=None
"
"@
            $tempFile = New-TemporaryFile
            Set-Content -Path $tempFile.FullName -Value $logContent -Encoding UTF8

            $result = Parse-SobytiyaLog -Path $tempFile.FullName

            $result | Should -HaveCount 2
            $result[0].EventID | Should -Be 403
            $result[0].Details.NewEngineState | Should -Be 'Stopped'
            $result[1].EventID | Should -Be 400
            $result[1].Details.NewEngineState | Should -Be 'Available'
        }

        It 'returns null for an empty file (with only a header)' {
            $logContent = "Уровень	Дата и время	Источник	Код события	Категория задачи"
            $tempFile = New-TemporaryFile
            Set-Content -Path $tempFile.FullName -Value $logContent -Encoding UTF8

            $result = Parse-SobytiyaLog -Path $tempFile.FullName

            $result | Should -BeNullOrEmpty
        }

        It 'throws an error if the file does not exist' {
            { Parse-SobytiyaLog -Path 'C:\non\existent\file.log' } | Should -Throw "File not found or is a directory: C:\non\existent\file.log"
        }

        It 'returns null for a completely empty file' {
            $tempFile = New-TemporaryFile
            # The file is created empty by New-TemporaryFile
            $result = Parse-SobytiyaLog -Path $tempFile.FullName

            $result | Should -BeNullOrEmpty
        }

        It 'handles an entry with no "Details" section' {
            $logContent = @"
Уровень	Дата и время	Источник	Код события	Категория задачи
Сведения	31.07.2025 0:08:00	PowerShell	600	Выполнение команды	"Команда ""Get-Process"" выполнена."
"@
            $tempFile = New-TemporaryFile
            Set-Content -Path $tempFile.FullName -Value $logContent -Encoding UTF8

            $result = Parse-SobytiyaLog -Path $tempFile.FullName

            $result | Should -HaveCount 1
            $result[0].EventID | Should -Be 600
            $result[0].Message | Should -Be 'Команда "Get-Process" выполнена.'
            $result[0].Details.PSObject.Properties.Count | Should -Be 0
        }

        It 'ignores malformed lines in the Details section' {
            $logContent = @"
Уровень	Дата и время	Источник	Код события	Категория задачи
Сведения	31.07.2025 0:07:34	PowerShell	403	Жизненный цикл обработчика	"Состояние обработчика изменилось.

Подробные сведения: 
	NewEngineState=Stopped
	This is a malformed line without an equals sign
	PreviousEngineState=Available
"
"@
            $tempFile = New-TemporaryFile
            Set-Content -Path $tempFile.FullName -Value $logContent -Encoding UTF8

            $result = Parse-SobytiyaLog -Path $tempFile.FullName

            $result | Should -HaveCount 1
            $result[0].Details.NewEngineState | Should -Be 'Stopped'
            $result[0].Details.PreviousEngineState | Should -Be 'Available'
            $result[0].Details.PSObject.Properties.Count | Should -Be 2
        }

        It 'skips a malformed record that does not match the expected format' {
            $logContent = @"
Уровень	Дата и время	Источник	Код события	Категория задачи
This is a completely malformed line that should be ignored.
Сведения	31.07.2025 0:07:33	PowerShell	400	Жизненный цикл обработчика	"Состояние обработчика изменилось с None на Available."
"@
            $tempFile = New-TemporaryFile
            Set-Content -Path $tempFile.FullName -Value $logContent -Encoding UTF8

            $result = Parse-SobytiyaLog -Path $tempFile.FullName

            $result | Should -HaveCount 1
            $result[0].EventID | Should -Be 400
        }
    }
}