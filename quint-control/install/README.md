# install

- `Install-Quint.ps1`: copies Quint into `Documents\NinjaTrader 8\bin\Custom` (and the website and firm presets into `Documents\NinjaTrader 8\quint`), backing up any old Quint files first. Safe to run twice.
- `Uninstall-Quint.ps1`: backs up and removes Quint's NinjaScript files; keeps your settings and journal unless you ask.

How to run them is in `../SETUP.md`. Both are plain ASCII, because Windows PowerShell 5.1 misreads other characters.
