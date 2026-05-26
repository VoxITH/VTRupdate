using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Threading.Tasks;

namespace XVLauncher
{
    /// <summary>
    /// GitHub Releases based updater.
    /// The launcher reads update_url.txt next to the exe when present; otherwise it
    /// falls back to Properties.Resources.UpdateUrl.
    /// Accepted formats:
    /// - https://github.com/OWNER/REPO
    /// - https://github.com/OWNER/REPO/releases/latest
    /// - https://api.github.com/repos/OWNER/REPO/releases/latest
    /// </summary>
    public class UpdateHandler
    {
        protected MainWindow Window;
        private string Link, TargetCommit, Tag;

        public UpdateHandler(MainWindow window)
        {
            Window = window;
        }

        public async Task<bool> CheckUpdateAvailability()
        {
            var latest = await GetLatestRelease();
            string current = Properties.Settings.Default.Version;
            if (String.IsNullOrWhiteSpace(current) || current == "na")
            {
                Window.infoLabel.Content = "Installazione disponibile.";
                return true;
            }
            if (!String.Equals(current, latest.Tag, StringComparison.OrdinalIgnoreCase))
            {
                Window.infoLabel.Content = "Aggiornamento disponibile.";
                return true;
            }
            return false;
        }

        // Kept for compatibility with old XVLauncher flow. Full release zips are
        // used now, so there is no GitLab-style per-file diff to calculate.
        public Task<(List<string> oldPath, List<string> newPath)> Compare(string targetCommit)
        {
            return Task.FromResult((new List<string>(), new List<string>()));
        }

        private string GetConfiguredUpdateUrl()
        {
            string local = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "update_url.txt");
            if (File.Exists(local))
            {
                string fromFile = File.ReadAllText(local).Trim();
                if (!String.IsNullOrWhiteSpace(fromFile))
                    return NormalizeGitHubUrl(fromFile);
            }
            return NormalizeGitHubUrl(Properties.Resources.UpdateUrl);
        }

        private string NormalizeGitHubUrl(string url)
        {
            url = (url ?? "").Trim();
            if (url.Length == 0)
                throw new InvalidOperationException("URL update GitHub non configurato.");
            if (url.Contains("api.github.com/repos/") && url.Contains("/releases/latest"))
                return url;
            if (url.StartsWith("https://github.com/", StringComparison.OrdinalIgnoreCase))
            {
                Uri uri = new Uri(url);
                string[] parts = uri.AbsolutePath.Trim('/').Split('/');
                if (parts.Length >= 2)
                    return $"https://api.github.com/repos/{parts[0]}/{parts[1]}/releases/latest";
            }
            return url;
        }

        private async Task SetLatestRelease()
        {
            string url = GetConfiguredUpdateUrl();
            using (var client = new WebClient())
            {
                client.Headers.Add("User-Agent", "VTR-XVLauncher");
                client.Headers.Add("Accept", "application/vnd.github+json");
                string json = await client.DownloadStringTaskAsync(url);
                dynamic latest = JsonConvert.DeserializeObject(json);

                Tag = latest.tag_name != null ? latest.tag_name.ToString() : "";
                TargetCommit = latest.target_commitish != null ? latest.target_commitish.ToString() : Tag;

                string chosen = "";
                foreach (var asset in latest.assets)
                {
                    string name = asset.name != null ? asset.name.ToString() : "";
                    string dl = asset.browser_download_url != null ? asset.browser_download_url.ToString() : "";
                    if (dl.Length == 0) continue;
                    if (name.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
                    {
                        chosen = dl;
                        if (name.IndexOf("VTR", StringComparison.OrdinalIgnoreCase) >= 0 ||
                            name.IndexOf("Voxia", StringComparison.OrdinalIgnoreCase) >= 0)
                            break;
                    }
                }

                if (String.IsNullOrWhiteSpace(Tag))
                    throw new InvalidOperationException("La release GitHub non ha un tag.");
                if (String.IsNullOrWhiteSpace(chosen))
                    throw new InvalidOperationException("La release GitHub non contiene asset .zip.");

                Link = chosen;
            }
        }

        public async Task<(string Link, string Commit, string Tag)> GetLatestRelease()
        {
            if (this.TargetCommit == null)
            {
                await SetLatestRelease();
            }
            return (this.Link, this.TargetCommit, this.Tag);
        }
    }
}
