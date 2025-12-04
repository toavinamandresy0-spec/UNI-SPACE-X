// CollaborationApiClient.js
// Petit client JS pour appeler `backend/api/collaboration.php`.

export default class CollaborationApiClient {
  constructor(baseUrl = '/backend/api/collaboration.php', getToken = null) {
    this.baseUrl = baseUrl;
    this.getToken = getToken; // function returning token string or null
  }

  async request(method = 'GET', opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken ? await this.getToken() : null;
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let url = this.baseUrl;
    const fetchOptions = { method, headers };

    if (method === 'GET') {
      // opts.params -> append query string
      if (opts.params) {
        const qs = new URLSearchParams(opts.params).toString();
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    } else {
      fetchOptions.body = JSON.stringify(opts.body || {});
    }

    const res = await fetch(url, fetchOptions);
    let payload = null;
    try {
      payload = await res.json();
    } catch (e) {
      throw new Error('Réponse non JSON du serveur');
    }

    if (!res.ok) {
      const msg = payload && (payload.error || payload.message) ? (payload.error || payload.message) : `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = payload;
      throw err;
    }

    return payload;
  }

  // Sessions
  async listSessions() {
    return this.request('GET', { params: { action: 'list' } });
  }

  async createSession({ name, simulation_id, description = '' }) {
    const body = { action: 'create_session', name, simulation_id, description };
    return this.request('POST', { body });
  }

  async updateSession(session_id, updateData = {}) {
    const body = Object.assign({ session_id }, updateData);
    return this.request('PUT', { body });
  }

  // Participants
  async getParticipants(session_id) {
    return this.request('GET', { params: { action: 'participants', session_id } });
  }

  async joinSession(access_code) {
    return this.request('POST', { body: { action: 'join_session', access_code } });
  }

  async leaveSession(session_id) {
    return this.request('DELETE', { body: { session_id } });
  }

  // Messages
  async getMessages(session_id, { limit = 50, offset = 0 } = {}) {
    return this.request('GET', { params: { action: 'messages', session_id, limit, offset } });
  }

  async sendMessage(session_id, message, { message_type = 'text', metadata = null } = {}) {
    const body = { action: 'send_message', session_id, message, message_type };
    if (metadata !== null) body.metadata = metadata;
    return this.request('POST', { body });
  }
}
