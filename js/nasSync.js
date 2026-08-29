/**
 * NAS Sync & Home Data Flow Module
 * WebDAV protocol sync & Local NAS Folder package exchange.
 * Styled with unified Sanrio Pastel Glass-Card Theme.
 */

class NASDataSyncHub {
  constructor(store) {
    this.store = store;
  }

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const nasConfig = this.store.getNasSettings();
    const lastSync = nasConfig.lastSyncTime ? new Date(nasConfig.lastSyncTime).toLocaleString('zh-TW') : '從未同步';

    container.innerHTML = `
      <!-- Top Overview Card -->
      <div class="glass-card rounded-3xl p-5 sm:p-6 mb-5 border border-pink-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center space-x-3.5">
            <div class="sanrio-kitty-badge !w-12 !h-12"></div>
            <div>
              <h2 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                家用 NAS 資料流通與同步中心
                <span class="kitty-bow"></span>
              </h2>
              <p class="text-xs sm:text-sm text-slate-600 font-medium">在學校用手機快速記點，回到家利用家用 NAS (群暉/威聯通/TrueNAS) 無縫同步至電腦大螢幕</p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <div class="text-xs px-3.5 py-2 rounded-2xl bg-pink-50 border border-pink-300 text-pink-900 font-bold">
              上次同步時間：<strong class="text-pink-600 font-mono">${lastSync}</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- 1. WebDAV Direct Sync Card -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <i data-lucide="cloud-lightning" class="w-4 h-4 text-emerald-600"></i>
                1. 家用 WebDAV 自動連線同步
              </h3>
              <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">推薦方案</span>
            </div>
            <p class="text-xs text-slate-600 font-medium mb-4 leading-relaxed">
              透過群暉 Synology (WebDAV Server) 或 QNAP 內建 WebDAV 協定，手機或電腦連上家中 Wi-Fi 即可一鍵雙向同步：
            </p>

            <form onsubmit="nasSyncHub.saveSettings(event)" class="space-y-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">NAS 伺服器網址 (WebDAV URL)</label>
                <input type="text" id="nas-server-url" value="${nasConfig.serverUrl || ''}" placeholder="http://192.168.1.100:5005 或 https://yournas.quickconnect.to:5006" class="w-full bg-white border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500">
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">NAS 帳號</label>
                  <input type="text" id="nas-username" value="${nasConfig.username || ''}" placeholder="admin / user" class="w-full bg-white border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">NAS 密碼</label>
                  <input type="password" id="nas-password" value="${nasConfig.password || ''}" placeholder="••••••••" class="w-full bg-white border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500">
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">NAS 儲存路徑</label>
                <input type="text" id="nas-remote-path" value="${nasConfig.remotePath || '/ClassData/class_data_sync.json'}" class="w-full bg-white border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500">
              </div>

              <div class="pt-2 flex items-center justify-between">
                <button type="submit" class="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-300 rounded-xl text-xs font-black transition">
                  儲存 NAS 連線設定
                </button>
                <button type="button" onclick="nasSyncHub.testConnection()" class="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl text-xs font-black transition">
                  測試連線
                </button>
              </div>
            </form>
          </div>

          <!-- WebDAV Action Buttons -->
          <div class="pt-4 border-t border-pink-100 mt-4 flex items-center justify-between gap-3">
            <button onclick="nasSyncHub.syncUploadToNas()" class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-md transition flex items-center justify-center gap-1.5">
              <i data-lucide="upload-cloud" class="w-4 h-4"></i> 📤 上傳進度至 NAS
            </button>
            <button onclick="nasSyncHub.syncDownloadFromNas()" class="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black shadow-md transition flex items-center justify-center gap-1.5">
              <i data-lucide="download-cloud" class="w-4 h-4"></i> 📥 從 NAS 下載更新
            </button>
          </div>
        </div>

        <!-- 2. Local Network Folder Sync File Card -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <i data-lucide="folder-sync" class="w-4 h-4 text-sky-600"></i>
                2. NAS 網路芳鄰共享資料夾手動流通
              </h3>
              <span class="text-xs px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-bold border border-pink-300">零設定方案</span>
            </div>
            <p class="text-xs text-slate-600 font-medium mb-4 leading-relaxed">
              若家中已將 NAS 掛載為電腦網路硬碟（例如 <code>Z:\ClassSync</code>）或手機檔案 App，可透過單一同步檔案進行無縫流通：
            </p>

            <div class="space-y-3 mb-4">
              <div class="p-3.5 rounded-2xl bg-pink-50 border border-pink-200 text-xs text-pink-900 space-y-1.5 font-medium">
                <div>• <strong>步驟 1</strong>：在學校點擊「匯出最新同步檔」，儲存為 <code>class_data_sync.json</code>。</div>
                <div>• <strong>步驟 2</strong>：放學回家，將檔案放入家中 NAS 共享資料夾。</div>
                <div>• <strong>步驟 3</strong>：在家中電腦打開本系統，點擊下方「選擇檔案更新」，即刻同步全班最新成績與記事！</div>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-pink-100 flex items-center justify-between gap-3">
            <button onclick="nasSyncHub.exportSyncPackage()" class="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs sm:text-sm font-black shadow-md transition flex items-center justify-center gap-1.5">
              <i data-lucide="file-output" class="w-4 h-4"></i> 📦 匯出同步包 (手機端)
            </button>
            <label class="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-black shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer text-center">
              <i data-lucide="file-input" class="w-4 h-4"></i> 📂 讀取同步包 (電腦端)
              <input type="file" accept=".json" onchange="nasSyncHub.importSyncPackage(event)" class="hidden">
            </label>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  saveSettings(e) {
    e.preventDefault();
    const serverUrl = document.getElementById('nas-server-url').value.trim();
    const username = document.getElementById('nas-username').value.trim();
    const password = document.getElementById('nas-password').value;
    const remotePath = document.getElementById('nas-remote-path').value.trim();

    this.store.updateNasSettings({
      serverUrl,
      username,
      password,
      remotePath
    });

    window.appState.showToast('已儲存 NAS WebDAV 設定！', 'success');
  }

  async testConnection() {
    const config = this.store.getNasSettings();
    if (!config.serverUrl) {
      window.appState.showToast('請先填寫 NAS 伺服器網址', 'warning');
      return;
    }

    window.appState.showToast('正在測試連線至 NAS...', 'info');
    try {
      // Send a lightweight PROPFIND or HEAD request
      const headers = new Headers();
      if (config.username && config.password) {
        headers.set('Authorization', 'Basic ' + btoa(config.username + ':' + config.password));
      }
      
      const response = await fetch(config.serverUrl + config.remotePath, {
        method: 'HEAD',
        headers: headers
      }).catch(err => {
        throw new Error('無法連線至 NAS (可能是跨域 CORS 限制或網址無法抵達)');
      });

      if (response.ok || response.status === 404 || response.status === 200 || response.status === 207) {
        window.appState.showToast('✅ 成功連線至家中 NAS！', 'success');
      } else {
        window.appState.showToast(`連線回應代碼：${response.status} (請檢查帳號密碼)`, 'warning');
      }
    } catch (e) {
      window.appState.showToast(`連線提示：${e.message}。建議可使用「方案 2：共享資料夾檔案流通」`, 'info');
    }
  }

  async syncUploadToNas() {
    const config = this.store.getNasSettings();
    if (!config.serverUrl) {
      window.appState.showToast('請先設定 NAS 伺服器網址', 'warning');
      return;
    }

    const payload = this.store.exportAllData();
    window.appState.showToast('正在上傳最新資料至 NAS...', 'info');

    try {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      if (config.username && config.password) {
        headers.set('Authorization', 'Basic ' + btoa(config.username + ':' + config.password));
      }

      const res = await fetch(config.serverUrl + config.remotePath, {
        method: 'PUT',
        headers: headers,
        body: payload
      });

      if (res.ok || res.status === 201 || res.status === 204) {
        this.store.updateNasSettings({ lastSyncTime: new Date().toISOString() });
        window.appState.showToast('🎉 已成功將最新進度上傳至 NAS！', 'success');
        this.render('nas-sync-view');
      } else {
        throw new Error(`伺服器回傳狀態碼 ${res.status}`);
      }
    } catch (e) {
      window.appState.showToast(`WebDAV 上傳遇到網路或 CORS 限制，建議使用「方案 2：共享資料夾檔案流通」一鍵匯出`, 'warning');
    }
  }

  async syncDownloadFromNas() {
    const config = this.store.getNasSettings();
    if (!config.serverUrl) {
      window.appState.showToast('請先設定 NAS 伺服器網址', 'warning');
      return;
    }

    window.appState.showToast('正在從 NAS 下載最新資料...', 'info');
    try {
      const headers = new Headers();
      if (config.username && config.password) {
        headers.set('Authorization', 'Basic ' + btoa(config.username + ':' + config.password));
      }

      const res = await fetch(config.serverUrl + config.remotePath, {
        method: 'GET',
        headers: headers
      });

      if (res.ok) {
        const jsonText = await res.text();
        const importRes = this.store.importAllData(jsonText);
        if (importRes.success) {
          this.store.updateNasSettings({ lastSyncTime: new Date().toISOString() });
          window.appState.showToast('🎉 已成功從 NAS 同步最新資料！', 'success');
          setTimeout(() => location.reload(), 600);
        } else {
          window.appState.showToast(`資料解析失敗：${importRes.error}`, 'danger');
        }
      } else {
        throw new Error(`無法取得檔案 (狀態碼 ${res.status})`);
      }
    } catch (e) {
      window.appState.showToast(`下載提示：${e.message}。建議使用「方案 2：共享資料夾檔案流通」`, 'warning');
    }
  }

  exportSyncPackage() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(this.store.exportAllData());
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `class_data_sync.json`);
    dlAnchorElem.click();
    this.store.updateNasSettings({ lastSyncTime: new Date().toISOString() });
    window.appState.showToast('已匯出同步包！請存入 NAS 共享資料夾', 'success');
  }

  importSyncPackage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const jsonText = event.target.result;
      const res = this.store.importAllData(jsonText);
      if (res.success) {
        this.store.updateNasSettings({ lastSyncTime: new Date().toISOString() });
        window.appState.showToast('🎉 成功從同步包更新所有班級資料！', 'success');
        setTimeout(() => location.reload(), 600);
      } else {
        window.appState.showToast(`同步失敗：${res.error}`, 'danger');
      }
    };
    reader.readAsText(file);
  }
}

// Global NAS Hub Instance
window.nasSyncHub = new NASDataSyncHub(window.appStore);
