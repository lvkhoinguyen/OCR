import { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  Lock,
  Plus,
  RefreshCw,
  Zap,
  Link,
  Activity,
  Upload,
  History,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { uiApi } from "../../services/uiApi";
import { GD2FeatureLayout } from "../shared/SharedComponents";

export default function GD27IntegrationScreen() {
  const [activeTab, setActiveTab] = useState("screen");
  const [dashboard, setDashboard] = useState({ systems: [], apiKeys: [], logs: [], successCount: 0, errorCount: 0 });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [apiKeyForm, setApiKeyForm] = useState({
    clientName: "Partner Connector",
    systemCode: "HRM",
    authMode: "API_KEY",
    scopes: "DOCUMENT_READ,DOSSIER_WRITE,MASTER_DATA_SYNC"
  });
  const [syncForm, setSyncForm] = useState({
    systemCode: "HRM",
    dataType: "DEPARTMENT",
    trigger: "CRON",
    cronExpression: "0 */2 * * *"
  });
  const [webhookForm, setWebhookForm] = useState({
    systemCode: "VOFFICE",
    eventType: "DOCUMENT_SIGNED",
    apiKey: "idp_demo_voffice",
    payload: "{\"documentCode\":\"VB-001\",\"signedBy\":\"lanh-dao\"}"
  });

  useEffect(() => {
    loadIntegrationDashboard();
  }, []);

  async function loadIntegrationDashboard() {
    try {
      setLoading(true);
      const result = await uiApi.gd2.integrationDashboard();
      setDashboard(result);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: `Khong tai duoc dashboard tich hop: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function createApiKey(event) {
    event.preventDefault();
    try {
      const key = await uiApi.gd2.createIntegrationApiKey(apiKeyForm);
      setNotice({ type: "success", text: `Da tao API key ${key.keyPreview} cho ${key.systemCode}.` });
      await loadIntegrationDashboard();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function runSync(event) {
    event.preventDefault();
    try {
      const log = await uiApi.gd2.runIntegrationSync(syncForm);
      setNotice({ type: "success", text: `Dong bo ${syncForm.dataType} thanh cong qua log #${log.id}.` });
      await loadIntegrationDashboard();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function receiveWebhook(event) {
    event.preventDefault();
    try {
      const log = await uiApi.gd2.receiveIntegrationWebhook(webhookForm);
      setNotice({ type: log.result === "SUCCESS" ? "success" : "error", text: `Webhook ${log.result} - HTTP ${log.statusCode}.` });
      await loadIntegrationDashboard();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function pushDocument() {
    try {
      const log = await uiApi.gd2.pushIntegrationDocument({
        ...webhookForm,
        eventType: "DOCUMENT_PUSHED"
      });
      setNotice({ type: log.result === "SUCCESS" ? "success" : "error", text: `Open API nhan tai lieu: ${log.result}.` });
      await loadIntegrationDashboard();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  async function retryLog(id) {
    try {
      const log = await uiApi.gd2.retryIntegrationLog(id);
      setNotice({ type: "success", text: `Da retry webhook/log #${id}, tao log moi #${log.id}.` });
      await loadIntegrationDashboard();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }

  const metrics = [
    { label: "He thong", value: dashboard.systems?.length || 0, hint: "HRM, ERP/Core, VOffice" },
    { label: "API key", value: dashboard.apiKeys?.length || 0, hint: "OAuth2/JWT/API key" },
    { label: "Thanh cong", value: dashboard.successCount || 0, hint: "Request/response OK" },
    { label: "Loi", value: dashboard.errorCount || 0, hint: "Cho retry/kiem tra" }
  ];

  const leftPanel = (
    <div className="gd27-left">
      <div className="gd27-kpi">
        {metrics.map(item => (
          <div className="metric-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.hint}</small>
          </div>
        ))}
      </div>

      <div className="gd27-system-list">
        {(dashboard.systems || []).map(system => (
          <button
            className={`gd27-system ${system.status === "CONNECTED" ? "connected" : "error"}`}
            type="button"
            key={system.code}
            onClick={() => {
              setApiKeyForm(current => ({ ...current, systemCode: system.code, authMode: system.authMode }));
              setSyncForm(current => ({ ...current, systemCode: system.code, cronExpression: system.cronExpression }));
              setWebhookForm(current => ({ ...current, systemCode: system.code, apiKey: `idp_demo_${system.code.toLowerCase()}` }));
            }}
          >
            <span>{system.status === "CONNECTED" ? <Wifi size={16}/> : <WifiOff size={16}/>} {system.code}</span>
            <strong>{system.name}</strong>
            <small>{system.baseUrl}</small>
            <em>{system.authMode} | cron {system.cronExpression}</em>
          </button>
        ))}
      </div>

      {notice && <div className={`gd2-alert ${notice.type}`}>{notice.text}</div>}
    </div>
  );

  const midContent = (
    <div className="gd27-mid">
      <form className="gd27-panel" onSubmit={createApiKey}>
        <div className="gd27-panel-head"><Lock size={16}/> API key & token policy</div>
        <label>Ung dung tich hop
          <input value={apiKeyForm.clientName} onChange={e => setApiKeyForm({ ...apiKeyForm, clientName: e.target.value })} />
        </label>
        <div className="gd27-form-grid">
          <label>He thong
            <select value={apiKeyForm.systemCode} onChange={e => setApiKeyForm({ ...apiKeyForm, systemCode: e.target.value })}>
              <option value="HRM">HRM</option>
              <option value="ERP">ERP/Core</option>
              <option value="VOFFICE">VOffice/eOffice</option>
            </select>
          </label>
          <label>Xac thuc
            <select value={apiKeyForm.authMode} onChange={e => setApiKeyForm({ ...apiKeyForm, authMode: e.target.value })}>
              <option value="API_KEY">API Key</option>
              <option value="JWT">JWT Token</option>
              <option value="OAUTH2">OAuth2</option>
            </select>
          </label>
        </div>
        <label>Scopes
          <input value={apiKeyForm.scopes} onChange={e => setApiKeyForm({ ...apiKeyForm, scopes: e.target.value })} />
        </label>
        <button className="btn primary" type="submit"><Plus size={14}/> Tao key</button>
      </form>

      <form className="gd27-panel" onSubmit={runSync}>
        <div className="gd27-panel-head"><RefreshCw size={16}/> Sync danh muc & nhan su</div>
        <div className="gd27-form-grid">
          <label>He thong
            <select value={syncForm.systemCode} onChange={e => setSyncForm({ ...syncForm, systemCode: e.target.value })}>
              <option value="HRM">HRM</option>
              <option value="ERP">ERP/Core</option>
              <option value="VOFFICE">VOffice/eOffice</option>
            </select>
          </label>
          <label>Du lieu
            <select value={syncForm.dataType} onChange={e => setSyncForm({ ...syncForm, dataType: e.target.value })}>
              <option value="DEPARTMENT">Phong ban</option>
              <option value="PERSONNEL">Nhan su</option>
              <option value="DOSSIER">Ho so</option>
              <option value="DOCUMENT">Tai lieu</option>
            </select>
          </label>
        </div>
        <div className="gd27-form-grid">
          <label>Trigger
            <select value={syncForm.trigger} onChange={e => setSyncForm({ ...syncForm, trigger: e.target.value })}>
              <option value="CRON">Cron job</option>
              <option value="WEBHOOK">Webhook event</option>
            </select>
          </label>
          <label>Cron
            <input value={syncForm.cronExpression} onChange={e => setSyncForm({ ...syncForm, cronExpression: e.target.value })} />
          </label>
        </div>
        <button className="btn" type="submit"><Zap size={14}/> Chay dong bo</button>
      </form>

      <form className="gd27-panel" onSubmit={receiveWebhook}>
        <div className="gd27-panel-head"><Link size={16}/> Webhook / Open API test</div>
        <div className="gd27-form-grid">
          <label>He thong
            <select value={webhookForm.systemCode} onChange={e => setWebhookForm({ ...webhookForm, systemCode: e.target.value })}>
              <option value="HRM">HRM</option>
              <option value="ERP">ERP/Core</option>
              <option value="VOFFICE">VOffice/eOffice</option>
            </select>
          </label>
          <label>Event
            <input value={webhookForm.eventType} onChange={e => setWebhookForm({ ...webhookForm, eventType: e.target.value })} />
          </label>
        </div>
        <label>Credential
          <input value={webhookForm.apiKey} onChange={e => setWebhookForm({ ...webhookForm, apiKey: e.target.value })} />
        </label>
        <label>Payload JSON
          <textarea rows={4} value={webhookForm.payload} onChange={e => setWebhookForm({ ...webhookForm, payload: e.target.value })} />
        </label>
        <div className="gd27-actions">
          <button className="btn primary" type="submit"><Activity size={14}/> Nhan webhook</button>
          <button className="btn" type="button" onClick={pushDocument}><Upload size={14}/> Push tai lieu</button>
        </div>
      </form>
    </div>
  );

  const rightPanel = (
    <div className="gd27-right">
      <div className="gd27-panel">
        <div className="gd27-panel-head"><Lock size={16}/> Danh sach API key</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>System</th>
                <th>Auth</th>
                <th>Scopes</th>
                <th>Key</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard.apiKeys || []).map(key => (
                <tr key={key.id}>
                  <td>{key.clientName}</td>
                  <td><span className="gd2-code">{key.systemCode}</span></td>
                  <td>{key.authMode}</td>
                  <td><small>{key.scopes}</small></td>
                  <td>{key.keyPreview}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="gd27-panel">
        <div className="gd27-panel-head"><History size={16}/> Request/response log</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Huong</th>
                <th>System</th>
                <th>Endpoint</th>
                <th>HTTP</th>
                <th>Ket qua</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(dashboard.logs || []).map(log => (
                <tr key={log.id}>
                  <td>#{log.id}</td>
                  <td>{log.direction}</td>
                  <td><span className="gd2-code">{log.systemCode}</span></td>
                  <td><small>{log.endpoint}</small></td>
                  <td>{log.statusCode}</td>
                  <td>
                    <span className={`gd27-status ${log.result === "SUCCESS" ? "success" : "error"}`}>
                      {log.result === "SUCCESS" ? <CheckCircle2 size={13}/> : <AlertCircle size={13}/>}
                      {log.result}
                    </span>
                  </td>
                  <td>
                    {log.result === "ERROR" && (
                      <button className="icon-btn" type="button" title="Retry webhook" onClick={() => retryLog(log.id)}>
                        <RefreshCw size={13}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <GD2FeatureLayout
      featureId="GD2-7"
      featureName="Tích hợp hệ thống khác"
      description="Open API bảo mật, đồng bộ HRM/ERP/VOffice theo cron hoặc webhook, giám sát log và retry lỗi tích hợp."
      actor="Quản trị hệ thống / Quản trị đơn vị"
      actionBarLabel="API Dashboard"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      className="gd27-feature"
      splitRatio="300px 1fr"
      leftPanelTitle="Hệ thống kết nối"
      rightPanelTitle="Giám sát API"
      midContent={midContent}
      actions={
        <>
          <button className="btn primary" type="button" onClick={loadIntegrationDashboard} disabled={loading}><RefreshCw size={14}/> Tai lai</button>
          <button className="btn" type="button" onClick={pushDocument}><Upload size={14}/> Test Open API</button>
        </>
      }
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}
