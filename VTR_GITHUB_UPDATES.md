# VTR - Update tramite GitHub Releases

## 1. Una volta sola

1. Crea una repository GitHub privata o pubblica per gli update del gioco.
2. Nel file `update_url.txt`, accanto al launcher, metti uno di questi formati:
   - `https://github.com/UTENTE/REPO`
   - `https://api.github.com/repos/UTENTE/REPO/releases/latest`
3. Ricompila il launcher dopo questa patch.

## 2. Creare un update

Esegui:

```powershell
.\build_vtr_github_release_zip.ps1
```

Lo script crea uno zip in:

`C:\Users\andre\Desktop\Voxia TrainerRising\GitHubRelease`

Lo zip deve contenere direttamente `Game.exe`, `Data`, `Graphics`, `Plugins`, ecc. Non deve contenere una cartella madre in piÃ¹.

## 3. Pubblicare su GitHub

1. Vai nella repository GitHub.
2. Apri `Releases`.
3. Crea una nuova release con un tag maggiore del precedente, ad esempio `v0.0.2`.
4. Carica lo zip creato dallo script come asset della release.
5. Pubblica.

Quando il launcher parte, controlla la latest release. Se il tag Ã¨ diverso dalla versione installata, scarica lo zip e lo estrae sopra alla cartella del gioco.

## Nota importante

Questo sistema Ã¨ volutamente semplice: ogni release Ã¨ uno zip completo/overlay del gioco. Ãˆ piÃ¹ pesante di un patcher differenziale, ma per ora Ã¨ molto piÃ¹ robusto e non devi incollare file a mano sul PC 2.
